import io
import unittest
from pipeline import aggregate, aggregate_legacy, legacy_sector, official_files, snapshot, months, SECTORS


class CagedTests(unittest.TestCase):
    def source(self, lines, kind="MOV", publication="202609"):
        return aggregate(io.StringIO("competênciamov;uf;seção;saldomovimentação\n" + lines), kind, publication)

    def test_negative_zero_unknown_geography_and_competence(self):
        data = self.source("202609;27;F;1\n202609;27;F;-1\n202609;99;G;-1\n")
        values = {(r["month"], r["uf"], r["sector"]): r["balance"] for r in data["rows"]}
        self.assertEqual(values[("202609", "AL", "construction")], 0)
        self.assertEqual(values[("202609", "BR", "total")], -1)
        self.assertEqual(values[("202609", "NI", "commerce")], -1)

    def test_adjustments_retroact_and_exclusions_reverse_once(self):
        for kind, expected in [("FOR", 1), ("EXC", -1)]:
            row = self.source("202605;27;F;1\n", kind)["rows"][0]
            self.assertEqual(row["month"], "202605")
            self.assertEqual(row["balance"], expected)
        self.assertEqual(self.source("202605;27;F;-1\n", "EXC")["rows"][0]["balance"], 1)

    def test_fail_closed_invalid_source(self):
        for line in ["202613;27;F;1\n", "202610;27;F;1\n", "202609;27;F;0\n", "202609;99;ZZ;1\n", "202609;88;F;1\n"]:
            with self.assertRaises(ValueError): self.source(line)
        with self.assertRaises(ValueError): self.source("202608;27;F;1\n")
        with self.assertRaises(ValueError): self.source("")
        with self.assertRaises(ValueError): aggregate(io.StringIO("uf;valor\n27;1"), "MOV", "202609")

    def test_immutable_complete_snapshot_and_replacement(self):
        components = {}
        for kind in ["MOV", "FOR", "EXC"]:
            name = f"CAGED{kind}202609.7z"
            components[name] = {"name": name, "sha256": kind, "size": 100, "modified": "v1", **self.source("202609;27;F;1\n", kind)}
        a = snapshot(components, "202609", "202609")
        self.assertEqual(len(a["rows"]), 29 * len(SECTORS))
        self.assertEqual(next(r["balance"] for r in a["rows"] if r["uf"] == "AL" and r["sector"] == "total"), 1)
        self.assertEqual(a["snapshotVersion"], snapshot(components, "202609", "202609")["snapshotVersion"])
        # Replacing a republished file does not append its old aggregates a second time.
        components["CAGEDFOR202609.7z"]["sha256"] = "changed"
        components["CAGEDFOR202609.7z"]["rows"] = []
        b = snapshot(components, "202609", "202609")
        self.assertNotEqual(a["snapshotVersion"], b["snapshotVersion"])
        self.assertEqual(next(r["balance"] for r in b["rows"] if r["uf"] == "AL" and r["sector"] == "total"), 0)
        del components["CAGEDEXC202609.7z"]
        with self.assertRaises(ValueError): snapshot(components, "202609", "202609")

    def test_calendar(self):
        self.assertEqual(list(months("202512", "202602")), ["202512", "202601", "202602"])

    def test_legacy_layout_sign_and_adjustment_competence(self):
        base="Admitidos/Desligados;Competência Declarada;IBGE Subsetor;Saldo Mov;UF\n01;201912;15;01;27\n02;201912;25;-1;27\n"
        result=aggregate_legacy(io.StringIO(base),'LEGACY','201912')
        self.assertEqual(next(r['balance'] for r in result['rows'] if r['uf']=='AL' and r['sector']=='construction'),1)
        adjusted="Competência Movimentação;Competência Declarada;IBGE Subsetor;Saldo Mov;UF\n201812;201912;15;-1;27\n"
        result=aggregate_legacy(io.StringIO(adjusted),'ADJUST','201912')
        self.assertTrue(all(r['month']=='201812' and r['balance']==-1 for r in result['rows']))
        self.assertEqual(official_files('201912')[0][2],'CAGEDEST_122019.7z')
        self.assertEqual(official_files('201912')[1][2],'CAGEDEST_AJUSTES_122019.7z')
        for value in ['99x','27']:
            with self.assertRaises(ValueError):legacy_sector(value)
        with self.assertRaises(ValueError):aggregate_legacy(io.StringIO(base),'LEGACY','201911')


if __name__ == "__main__": unittest.main()
