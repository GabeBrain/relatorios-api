# Baseline offline de Rolândia: PPTX + Excel bruto + leituras já pagas.
# Uso: powershell -File scripts/corretor-baseline.ps1 [-InputRoot caminho]
param(
  [string]$InputRoot,
  [string]$Output = '.local-inputs/baseline-20261013/rolandia.json'
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
if (!$InputRoot) { $InputRoot = Join-Path (Split-Path (Split-Path $repoRoot -Parent) -Parent) '_UPLOADS_TESTE/Corretor_V3_Rolandia' }
$pptx = Join-Path $InputRoot '02_APRESENTACAO_SELECIONAR_DEPOIS/Brain_Vocacional_Vertical_Housi_Av. Castro Alves_Rolandia - PR_v1.pptx'
$excel = Join-Path $InputRoot '01_PLANILHAS_SELECIONAR_TODAS'
$fixture = Join-Path $repoRoot 'src/features/corretor/lib/v3/__tests__/fixtures/rolandia-replay.json'
foreach ($path in @($pptx, $excel, $fixture)) {
  if (!(Test-Path -LiteralPath $path)) { throw "Insumo ausente: $path" }
}
$names = @('CORRETOR_REPLAY_PPTX', 'CORRETOR_REPLAY_CITY', 'CORRETOR_REPLAY_UF', 'CORRETOR_REPLAY_FIXTURE', 'CORRETOR_REPLAY_EXCEL_DIR', 'CORRETOR_REPLAY_OUT', 'CORRETOR_REPLAY_SAVE', 'CORRETOR_REPLAY_STUDY', 'CORRETOR_REPLAY_DUMP')
$saved = @{}
foreach ($name in $names) { $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process'); [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
Push-Location $repoRoot
try {
  $outputPath = [IO.Path]::GetFullPath((Join-Path $repoRoot $Output))
  New-Item -ItemType Directory -Force (Split-Path $outputPath -Parent) | Out-Null
  $env:CORRETOR_REPLAY_PPTX = $pptx
  $env:CORRETOR_REPLAY_CITY = 'Rol' + [char]0x00e2 + 'ndia'
  $env:CORRETOR_REPLAY_UF = 'PR'
  $env:CORRETOR_REPLAY_FIXTURE = $fixture
  $env:CORRETOR_REPLAY_EXCEL_DIR = $excel
  $env:CORRETOR_REPLAY_OUT = $outputPath
  & npm.cmd test -- --run replay-real
  if ($LASTEXITCODE -ne 0) { throw 'Baseline falhou; consulte o resultado do Vitest.' }
} finally {
  Pop-Location
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process') }
}
