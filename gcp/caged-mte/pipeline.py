"""Official MTE -> immutable aggregate snapshots. No microdata leaves the job.

Local (no cloud writes): python pipeline.py --start 202609 --end 202609 --state <dir>
Cloud mode requires CAGED_STATE_BUCKET, CAGED_TABLE and --publish.
"""
import argparse
import csv
import ftplib
import hashlib
import io
import json
import os
import re
import tempfile
import unicodedata
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

VERSION = "mte-caged-v1"
ROOT = "/pdet/microdados/NOVO CAGED"
UF = dict(zip([11,12,13,14,15,16,17,21,22,23,24,25,26,27,28,29,31,32,33,35,41,42,43,50,51,52,53],
              "RO AC AM RR PA AP TO MA PI CE RN PB PE AL SE BA MG ES RJ SP PR SC RS MS MT GO DF".split()))
SECTORS = ("total", "construction", "agriculture", "services", "commerce", "manufacturing", "other")
UF_NAMES = [*sorted(UF.values()), "NI", "BR"]


def month(value):
    value = str(value)
    if not re.fullmatch(r"20\d{2}(0[1-9]|1[0-2])", value):
        raise ValueError("invalid_competence")
    return value


def months(start, end):
    month(start); month(end)
    if start > end:
        raise ValueError("invalid_range")
    y, m = int(start[:4]), int(start[4:])
    while f"{y:04d}{m:02d}" <= end:
        yield f"{y:04d}{m:02d}"
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def canonical(value):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower())


def sector(section):
    section = section.strip().upper()
    if section == "F": return "construction"
    if section == "A": return "agriculture"
    if section == "C": return "manufacturing"
    if section == "G": return "commerce"
    if section in tuple("HIJKLMNOPQRSTU"): return "services"
    if section in ("B", "D", "E", "", "NA", "NI", "Z", "0", "9"): return "other"
    raise ValueError("unknown_cnae_section")


def aggregate(stream, kind, publication, require_full_scope=False):
    """MOV + FOR - EXC, grouped by movement competence, never declaration month."""
    if kind not in ("MOV", "FOR", "EXC"): raise ValueError("invalid_kind")
    publication = month(publication)
    if publication < "202001": raise ValueError("novo_caged_before_2020")
    reader = csv.DictReader(stream, delimiter=";")
    keys = {canonical(name.lstrip("\ufeff")): name for name in reader.fieldnames or []}
    required = ("competenciamov", "uf", "secao", "saldomovimentacao")
    if any(key not in keys for key in required): raise ValueError("unexpected_mte_layout")
    totals = defaultdict(int)
    count = 0
    observed_ufs = set()
    for row in reader:
        competence = month(row[keys["competenciamov"]].strip())
        if competence < "202001" or competence > publication or kind == "MOV" and competence != publication:
            raise ValueError("movement_competence_mismatch")
        sign = row[keys["saldomovimentacao"]].strip()
        if sign not in ("-1", "1"): raise ValueError("invalid_movement_sign")
        uf_code = row[keys["uf"]].strip()
        if not uf_code.isdigit(): raise ValueError("invalid_uf")
        uf = UF.get(int(uf_code))
        if not uf:
            if int(uf_code) not in (0, 99): raise ValueError("unknown_uf")
            uf = "NI"
        group = sector(row[keys["secao"]])
        observed_ufs.add(uf)
        balance = int(sign) * (-1 if kind == "EXC" else 1)
        for scope in (uf, "BR"):
            totals[(competence, scope, group)] += balance
            totals[(competence, scope, "total")] += balance
        count += 1
    if kind == "MOV" and not count: raise ValueError("empty_mov_file")
    if kind == "MOV" and require_full_scope and set(UF.values()) - observed_ufs:
        raise ValueError("incomplete_uf_scope")
    return {"records": count, "rows": [{"month": m, "uf": u, "sector": s, "balance": n}
            for (m, u, s), n in sorted(totals.items())]}


def required_kinds(publication):
    # Before these dates the official publisher did not provide these files.
    return ["MOV"] + (["FOR"] if publication >= "202002" else []) + (["EXC"] if publication >= "202004" else [])


def official_files(publication):
    if publication < "202001":
        if publication < "201701": raise ValueError("legacy_before_supported_window")
        suffix = publication[4:] + publication[:4]
        return [("LEGACY", f"/pdet/microdados/CAGED/{publication[:4]}", f"CAGEDEST_{suffix}.7z"),
                ("ADJUST", f"/pdet/microdados/CAGED_AJUSTES/{publication[:4]}", f"CAGEDEST_AJUSTES_{suffix}.7z")]
    return [(kind, f"{ROOT}/{publication[:4]}/{publication}", f"CAGED{kind}{publication}.7z") for kind in required_kinds(publication)]


def legacy_sector(value):
    # Official IBGE subsectors used by the old CAGED, deliberately not CNAE sections.
    if not value.strip().isdigit(): raise ValueError("invalid_legacy_subsector")
    code = int(value)
    if 1 <= code <= 13: return "manufacturing"
    if code == 15: return "construction"
    if code in (16, 17): return "commerce"
    if 18 <= code <= 24: return "services"
    if code == 25: return "agriculture"
    if code in (0, 14, 99): return "other"
    raise ValueError("unknown_legacy_subsector")


def aggregate_legacy(stream, kind, publication, require_full_scope=False):
    if kind not in ("LEGACY", "ADJUST") or publication >= "202001": raise ValueError("invalid_legacy_source")
    reader = csv.DictReader(stream, delimiter=";")
    keys = {canonical(name.lstrip("\ufeff")): name for name in reader.fieldnames or []}
    competence_key = "competenciadeclarada" if kind == "LEGACY" else "competenciamovimentacao"
    if any(key not in keys for key in (competence_key, "competenciadeclarada", "uf", "ibgesubsetor", "saldomov")):
        raise ValueError("unexpected_legacy_layout")
    totals, observed, count = defaultdict(int), set(), 0
    for row in reader:
        competence = month(row[keys[competence_key]].strip())
        if row[keys['competenciadeclarada']].strip() != publication or competence > publication or kind == "LEGACY" and competence != publication:
            raise ValueError("legacy_competence_mismatch")
        sign = row[keys["saldomov"]].strip()
        if sign not in ("01", "1", "-1"): raise ValueError("invalid_legacy_sign")
        uf_code = row[keys["uf"]].strip()
        if not uf_code.isdigit(): raise ValueError("invalid_legacy_uf")
        uf = UF.get(int(uf_code))
        if not uf:
            if int(uf_code) not in (0,99): raise ValueError("unknown_legacy_uf")
            uf = "NI"
        group = legacy_sector(row[keys["ibgesubsetor"]])
        observed.add(uf)
        for scope in (uf,"BR"):
            totals[(competence,scope,group)] += int(sign)
            totals[(competence,scope,"total")] += int(sign)
        count += 1
    if kind == "LEGACY" and (not count or require_full_scope and set(UF.values())-observed):
        raise ValueError("incomplete_legacy_scope")
    return {"records":count,"rows":[{"month":m,"uf":u,"sector":s,"balance":n} for (m,u,s),n in sorted(totals.items())]}


def snapshot(components, start, end):
    expected = {name for m in months(start, end) for _,_,name in official_files(m)}
    if expected - components.keys(): raise ValueError("incomplete_publication_range")
    totals = defaultdict(int)
    manifest = []
    for name in sorted(expected):
        item = components[name]
        manifest.append({key: item[key] for key in ("name", "sha256", "size", "modified")})
        for row in item["rows"]:
            if start <= row["month"] <= end:
                totals[(row["month"], row["uf"], row["sector"])] += row["balance"]
    rows = []
    for m in months(start, end):
        for u in UF_NAMES:
            for s in SECTORS:
                rows.append({"month": f"{m[:4]}-{m[4:]}-01", "uf": u, "sector": s,
                             "balance": totals[(m, u, s)]})
        for s in SECTORS:
            if totals[(m, "BR", s)] != sum(totals[(m, u, s)] for u in UF_NAMES if u != "BR"):
                raise ValueError("geography_reconciliation_failed")
        for u in UF_NAMES:
            if totals[(m, u, "total")] != sum(totals[(m, u, s)] for s in SECTORS if s != "total"):
                raise ValueError("sector_reconciliation_failed")
    version = hashlib.sha256(json.dumps([VERSION, start, end, manifest], sort_keys=True).encode()).hexdigest()
    return {"queryVersion": VERSION, "snapshotVersion": version, "start": start, "through": end,
            "files": manifest, "rows": rows}


def extract_archive(archive, destination):
    import py7zr
    with py7zr.SevenZipFile(archive) as packed:
        entries = packed.list()
        if len(entries) != 1 or entries[0].is_directory or not re.fullmatch(r"[\w .-]+\.txt", entries[0].filename, re.I):
            raise ValueError("unexpected_archive_members")
        if entries[0].uncompressed > 2_000_000_000: raise ValueError("archive_too_large")
        packed.extractall(destination)
        return destination / entries[0].filename


def write_json(path, data):
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temp.replace(path)


def aggregate_digest(rows):
    return hashlib.sha256(json.dumps(rows, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def update(start, end, state, on_component=None):
    state.mkdir(parents=True, exist_ok=True)
    components = {}
    with ftplib.FTP("ftp.mtps.gov.br", timeout=90, encoding="latin1") as ftp:
        ftp.login()
        for publication in months(start, end):
            for kind, folder, name in official_files(publication):
                ftp.cwd(folder)
                available = set(ftp.nlst())
                if name not in available: raise ValueError(f"missing_official_file:{name}")
                ftp.voidcmd("TYPE I")
                size, modified = ftp.size(name), ftp.sendcmd(f"MDTM {name}")[4:]
                if not size or size > 250_000_000: raise ValueError("unexpected_archive_size")
                path = state / f"{name}.json"
                cached = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
                if cached and cached.get("size") == size and cached.get("modified") == modified and cached.get("queryVersion") == VERSION and cached.get("aggregateSha256") == aggregate_digest(cached.get("rows")):
                    components[name] = cached
                    continue
                with tempfile.TemporaryDirectory() as work:
                    work = Path(work)
                    archive = work / name
                    with archive.open("wb") as output: ftp.retrbinary(f"RETR {name}", output.write)
                    if archive.stat().st_size != size: raise ValueError("truncated_archive")
                    with archive.open("rb") as compressed:
                        digest = hashlib.file_digest(compressed, "sha256").hexdigest()
                    raw = extract_archive(archive, work)
                    with raw.open(encoding="latin1" if kind in ("LEGACY","ADJUST") else "utf-8-sig", newline="") as source:
                        parser = aggregate_legacy if kind in ("LEGACY","ADJUST") else aggregate
                        result = parser(source, kind, publication, require_full_scope=True)
                item = {**result, "name": name, "sha256": digest, "aggregateSha256": aggregate_digest(result['rows']), "size": size, "modified": modified, "queryVersion": VERSION}
                write_json(path, item)
                if on_component: on_component(path)
                components[name] = item
                print(json.dumps({"file": name, "records": item["records"], "aggregateRows": len(item["rows"])}), flush=True)
    result = snapshot(components, start, end)
    write_json(state / "snapshot.json", result)
    return result


def publish(data, table):
    from google.cloud import bigquery
    if not re.fullmatch(r"[a-z][a-z0-9-]+\.[a-zA-Z_][\w]*\.caged_mte_snapshots", table):
        raise ValueError("invalid_target_table")
    # Append one whole immutable snapshot atomically, with an idempotent load-job ID.
    # A changed source version uses a different job ID; failed loads never become visible.
    client = bigquery.Client()
    # Job IDs alone expire. Also check immutable version in the destination table.
    exists = client.query(f"SELECT COUNT(*) n FROM `{table}` WHERE snapshot_version=@version", job_config=bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("version", "STRING", data["snapshotVersion"])],
        maximum_bytes_billed=100_000_000), location="US").result()
    existing_rows = next(iter(exists)).n
    if existing_rows:
        if existing_rows != len(data["rows"]): raise ValueError("existing_snapshot_inconsistent")
        return
    now = datetime.now(timezone.utc).isoformat()
    rows = [{**row, "snapshot_version": data["snapshotVersion"], "query_version": VERSION,
             "coverage_start": f'{data["start"][:4]}-{data["start"][4:]}-01',
             "published_through": f'{data["through"][:4]}-{data["through"][4:]}-01', "loaded_at": now}
            for row in data["rows"]]
    job_id = "caged_mte_" + data["snapshotVersion"]
    try:
        existing = client.get_job(job_id, location="US")
        existing.result()
        return
    except Exception as error:
        from google.api_core.exceptions import NotFound
        if not isinstance(error, NotFound): raise
    job = client.load_table_from_json(rows, table, job_id=job_id, location="US", job_config=bigquery.LoadJobConfig(
        create_disposition="CREATE_NEVER", write_disposition="WRITE_APPEND", ignore_unknown_values=False))
    job.result()


@contextmanager
def cloud_lock(bucket):
    if bucket is None:
        yield
        return
    lock = bucket.blob("update.lock")
    # An abandoned lock is removed by an operator after confirming no job is running.
    # Do not automatically steal it: a slow backfill must not overlap another run.
    lock.upload_from_string(datetime.now(timezone.utc).isoformat(), if_generation_match=0)
    generation = lock.generation
    try:
        yield
    finally:
        lock.delete(if_generation_match=generation)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default=os.environ.get("CAGED_START", "201701"))
    parser.add_argument("--end", default=os.environ.get("CAGED_END"))
    parser.add_argument("--state", type=Path, default=Path("/tmp/caged-mte"))
    parser.add_argument("--publish", action="store_true")
    args = parser.parse_args()
    # Discover latest published competence on the official FTP, not today's calendar.
    if not args.end:
        with ftplib.FTP("ftp.mtps.gov.br", timeout=60, encoding="latin1") as ftp:
            ftp.login(); ftp.cwd(ROOT)
            years = sorted(name for name in ftp.nlst() if re.fullmatch(r"20\d{2}", name))
            ftp.cwd(years[-1])
            args.end = max(name for name in ftp.nlst() if re.fullmatch(r"20\d{2}(0[1-9]|1[0-2])", name))
    bucket_name = os.environ.get("CAGED_STATE_BUCKET")
    bucket = None
    if bucket_name:
        from google.cloud import storage
        bucket = storage.Client().bucket(bucket_name)
    with cloud_lock(bucket):
        run_update(args, bucket)


def run_update(args, bucket):
    if bucket:
        args.state.mkdir(parents=True, exist_ok=True)
        for blob in bucket.list_blobs(prefix="components/"):
            name = blob.name.removeprefix("components/")
            if re.fullmatch(r"CAGED(?:(?:MOV|FOR|EXC)20\d{4}|EST_(?:AJUSTES_)?\d{6})\.7z\.json", name):
                blob.download_to_filename(args.state / name)
    data = update(month(args.start), month(args.end), args.state,
                  on_component=(lambda path: bucket.blob("components/" + path.name).upload_from_filename(path)) if bucket else None)
    if bucket:
        for path in args.state.glob("CAGED*.json"):
            bucket.blob("components/" + path.name).upload_from_filename(path)
        bucket.blob("manifests/" + data["snapshotVersion"] + ".json").upload_from_string(
            json.dumps({key: value for key, value in data.items() if key != "rows"}), content_type="application/json")
    if args.publish:
        if args.start != "201701": raise ValueError("production_requires_full_history_since_201701")
        publish(data, os.environ["CAGED_TABLE"])
    print(json.dumps({"version": data["snapshotVersion"], "through": args.end, "rows": len(data["rows"]),
                      "jsonBytes": (args.state / "snapshot.json").stat().st_size, "published": args.publish}))


if __name__ == "__main__":
    main()
