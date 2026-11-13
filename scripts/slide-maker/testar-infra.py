"""Ensaio remoto sintético. Token do trabalho fica somente em memória."""
import json
import time
import urllib.request
import urllib.error
import subprocess
import argparse
import base64
import shutil
from datetime import datetime, timezone
from pathlib import Path

parser = argparse.ArgumentParser(description='Ensaio F1-F4: exige agente simulado e isolamento aprovado.')
parser.add_argument('--url', required=True)
parser.add_argument('--iam-account', help='Conta Google para Cloud Run privado; token fica em memoria.')
parser.add_argument('--email', default='slide-maker-diagnostico@brain.srv.br')
parser.add_argument('--saida', default='.local-inputs/2026-11-13_slide-maker/infra.json')
args = parser.parse_args()
URL = args.url.rstrip('/')
if not URL.startswith('https://') or not URL.endswith('.run.app'):
    parser.error('Use a URL HTTPS do Cloud Run.')
output = Path(args.saida)
output.parent.mkdir(parents=True, exist_ok=True)
out = {'ok': False, 'service': URL, 'steps': [], 'agent': 'simulado'}
identity = None
if args.iam_account:
    gcloud = shutil.which('gcloud.cmd') or shutil.which('gcloud')
    if not gcloud:
        parser.error('Instale o gcloud e autentique a conta profissional.')
    identity = subprocess.run([gcloud, '--account=' + args.iam_account, 'auth', 'print-identity-token'],
        capture_output=True, text=True, check=True).stdout.strip()

def request(path, data=None, token=None, content_type='application/json'):
    headers = {'Content-Type': content_type}
    if identity:
        headers['X-Serverless-Authorization'] = 'Bearer ' + identity
    if token:
        headers['x-job-token'] = token
    if isinstance(data, dict):
        data = json.dumps(data).encode()
    req = urllib.request.Request(URL + path, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as exc:
        try:
            body = json.load(exc)
        except Exception:
            body = {}
        return exc.code, body

def require(ok, stage):
    if not ok:
        raise RuntimeError(stage)
    out['steps'].append(stage)

try:
    code, health = request('/health')
    out['health'] = health
    require(code == 200 and health.get('agente') == 'simulado', 'health_simulado')
    require(health.get('isolamento', {}).get('aprovado') is True, 'isolamento_aprovado')
    code, _ = request('/internal/fase', {'faseId': 'diagnostico-sem-autenticacao'})
    require(code == 403, 'internal_sem_oidc_recusado')
    code, created = request('/jobs', {'colaborador_email': args.email,
        'titulo': '[DIAGNOSTICO GOOGLE] Imagem sintetica',
        'contexto': 'Teste tecnico sintetico, sem dados de clientes e sem chamadas pagas.'})
    require(code == 201, 'job_criado')
    job = created['jobId']
    token = created['token']
    out['job_id'] = job
    prefix = '/jobs/' + job
    png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
    boundary = 'slide-maker-diagnostico'
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="arquivos"; filename="diagnostico.png"\r\nContent-Type: image/png\r\n\r\n'.encode()
        + png + f'\r\n--{boundary}--\r\n'.encode())
    code, result = request(prefix + '/arquivos', body, token, 'multipart/form-data; boundary=' + boundary)
    require(code == 202, 'upload_imagem_enfileirado')

    def wait(state, stage):
        for _ in range(45):
            code, detail = request(prefix, token=token)
            work = detail.get('trabalho', {})
            if code == 200 and work.get('estado') == state:
                require(True, stage)
                return detail
            if work.get('estado') in ['erro', 'cancelado']:
                out['state_on_failure'] = work.get('estado')
                raise RuntimeError(stage)
            time.sleep(2)
        raise RuntimeError(stage + '_timeout')

    detail = wait('aguardando_respostas', 'F1_fila_oidc_real')
    card = [m for m in detail['mensagens'] if m['tipo'] == 'perguntas'][-1]
    answers = {q['pergunta']: q['opcoes'][0]['rotulo'] for q in card['conteudo']['perguntas']}
    code, _ = request(prefix + '/respostas', {'respostas': answers}, token)
    require(code == 202, 'respostas_enfileiradas')
    wait('aguardando_aprovacao', 'F2_fila_real')
    code, _ = request(prefix + '/narrativa', {'acao': 'aprovar'}, token)
    require(code == 202, 'narrativa_aprovada')
    wait('entregue', 'F3_entrega_v1')
    code, _ = request(prefix + '/mensagens', {'texto': 'Ajuste sintetico para verificar v2.'}, token)
    require(code == 202, 'ajuste_enfileirado')
    detail = wait('entregue', 'F4_entrega_v2')
    require(detail['trabalho']['versao_atual'] == 2, 'historico_v2')
    for v in [1, 2]:
        code, download = request(prefix + f'/versoes/{v}/download', token=token)
        require(code == 200, f'url_privada_v{v}')
        with urllib.request.urlopen(download['url'], timeout=60) as resp:
            require(resp.status == 200 and len(resp.read()) > 0, f'download_v{v}')
    code, _ = request(prefix)
    require(code == 404, 'sem_token_recusado')
    require('token_acesso_hash' not in json.dumps(detail) and 'relatorio.md' not in json.dumps(detail), 'dados_internos_ocultos')
    out['ok'] = True
except Exception as exc:
    out['failure'] = str(exc) if isinstance(exc, RuntimeError) else type(exc).__name__
finally:
    out['checked_at'] = datetime.now(timezone.utc).isoformat()
    output.write_text(json.dumps(out, indent=2), encoding='utf-8')
    print(json.dumps(out, indent=2))
if not out['ok']:
    raise SystemExit(1)
