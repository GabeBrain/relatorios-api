param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\src\features\panorama-secovi-fiergs\assets\official_v2\backgrounds')
)

$ErrorActionPreference = 'Stop'
$referenceRoot = Join-Path $PSScriptRoot '..\src\features\panorama-secovi-fiergs\assets\nova ref'
$institutional = Join-Path $referenceRoot 'PPT Institucional_2026 - Widescreen_NOVO (1).pptx'
$baixada = Join-Path $referenceRoot 'Brain_Panorama_Secovi_SP_Baixada Santista_2T26_VAP_06Ago_16h40.pptx'

if (!(Test-Path -LiteralPath $institutional) -or !(Test-Path -LiteralPath $baixada)) {
  throw 'Os PPTs de referência locais não foram encontrados em assets/nova ref.'
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$powerPoint = New-Object -ComObject PowerPoint.Application
$powerPoint.Visible = -1

try {
  $institutionalDeck = $powerPoint.Presentations.Open($institutional, $true, $true, $false)
  @{
    'divider.png' = 2
    'dark-team.png' = 3
    'closing.png' = 5
    'closing-alt.png' = 6
  }.GetEnumerator() | ForEach-Object {
    $institutionalDeck.Slides.Item($_.Value).Export((Join-Path $OutputDirectory $_.Key), 'PNG', 1920, 1080)
  }
  $contentSlide = $institutionalDeck.Slides.Item(4)
  # A única barra vermelha é o retângulo decorativo horizontal. Ela não pertence aos slides de dados V2.
  foreach ($shape in @($contentSlide.Shapes)) {
    if ($shape.Name -like 'Rectangle*' -and $shape.Width -gt 100 -and $shape.Height -lt 10) { $shape.Visible = 0 }
  }
  $contentSlide.Export((Join-Path $OutputDirectory 'content.png'), 'PNG', 1920, 1080)
  $institutionalDeck.Close()

  $reportDeck = $powerPoint.Presentations.Open($baixada, $true, $false, $false)
  # Espaço preserva formas/transparências da capa; apagar a forma deixa artefatos no fundo.
  foreach ($shape in @($reportDeck.Slides.Item(1).Shapes)) {
    if ($shape.HasTextFrame -and $shape.TextFrame.HasText) { $shape.TextFrame.TextRange.Text = ' ' }
  }
  $reportDeck.Slides.Item(1).Export((Join-Path $OutputDirectory 'cover-report.png'), 'PNG', 1920, 1080)
  $reportDeck.Slides.Item(37).Export((Join-Path $OutputDirectory 'closing-report.png'), 'PNG', 1920, 1080)
  $reportDeck.Close()
} finally {
  $powerPoint.Quit()
  [Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
}

Add-Type -AssemblyName System.Drawing
Get-ChildItem -LiteralPath $OutputDirectory -Filter '*.png' | ForEach-Object {
  $image = [System.Drawing.Image]::FromFile($_.FullName)
  try {
    if ($image.Width -ne 1920 -or $image.Height -ne 1080) { throw "$($_.Name) não foi exportado em 1920x1080." }
  } finally { $image.Dispose() }
}

Write-Host "Fundos V2 validados em $OutputDirectory"
