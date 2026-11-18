"""Gabriel executa no Windows: cria a chave no Google e a copia ao clipboard para o Lovable.
Não imprime nem salva o segredo em arquivo. Não executar em agente/terminal capturado.
"""
import json
import secrets
import shutil
import subprocess
import sys

PROJECT = 'brain-rebrain-slide-maker'
ACCOUNT = 'inovacao.grupo.brain@gmail.com'
NAME = 'slide-maker-bridge-secret'
RUNTIME = f'serviceAccount:slide-maker-runtime@{PROJECT}.iam.gserviceaccount.com'


def main():
    if sys.argv[1:] not in ([], ['--copiar-existente']):
        raise SystemExit('Uso: cadastrar-bridge.py [--copiar-existente]')
    if not sys.stdin.isatty() or sys.platform != 'win32':
        raise SystemExit('Execute pessoalmente em um terminal interativo do Windows.')
    cli = shutil.which('gcloud.cmd')
    if not cli:
        raise SystemExit('gcloud não encontrado.')
    common = [f'--project={PROJECT}', f'--account={ACCOUNT}', '--quiet']

    def run(args, data=None):
        result = subprocess.run([cli, *args, *common], input=data, capture_output=True)
        if result.returncode:
            raise SystemExit('Operação Google falhou. Confira login/permissões. Nenhum segredo será mostrado.')
        return result.stdout

    run(['projects', 'describe', PROJECT, '--format=value(projectId)'])
    known = json.loads(run(['secrets', 'list', '--format=json(name)']))
    if not any(s['name'].endswith('/' + NAME) for s in known):
        run(['secrets', 'create', NAME, '--replication-policy=automatic'])
    versions = json.loads(run(['secrets', 'versions', 'list', NAME, '--format=json(name,state)']))
    enabled = [v for v in versions if v['state'] == 'ENABLED']
    recover = '--copiar-existente' in sys.argv
    if enabled and not recover:
        raise SystemExit('Já há versão ativa. Não substituir automaticamente: alinhe a rotação nos dois ambientes.')
    if recover:
        if not enabled:
            raise SystemExit('Não há versão ativa para copiar. Nenhum valor foi gerado.')
        version = max(enabled, key=lambda v: int(v['name'].split('/')[-1]))['name'].split('/')[-1]
        value = run(['secrets', 'versions', 'access', version, f'--secret={NAME}']).decode().strip()
    else:
        value = secrets.token_urlsafe(48)
        run(['secrets', 'versions', 'add', NAME, '--data-file=-'], value.encode())
    run(['secrets', 'add-iam-policy-binding', NAME, f'--member={RUNTIME}', '--role=roles/secretmanager.secretAccessor'])
    copied = subprocess.run(['powershell.exe', '-NoProfile', '-Command',
        '$slideValue=[Console]::In.ReadToEnd(); Set-Clipboard -Value $slideValue'],
        input=value.encode(), capture_output=True)
    del value
    if copied.returncode:
        raise SystemExit('Google cadastrado, mas clipboard falhou. Reexecute com --copiar-existente; não gere outra chave.')
    print('Segredo cadastrado no Google e copiado para a área de transferência.')
    print('Cole no formulário seguro do Lovable: More → Settings → Secrets → SLIDE_MAKER_BRIDGE_SECRET.')
    print('Não cole em chat. Após salvar, limpe a área de transferência com: Set-Clipboard -Value ""')
    print('Para recopia local segura, use --copiar-existente. Para trocar o valor, alinhe rotação nos dois ambientes.')


if __name__ == '__main__':
    main()
