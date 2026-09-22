param(
  [string]$Source = (Join-Path $PSScriptRoot '..\.tmp\fiergs-rm-porto-alegre-4t25.pptx'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\src\features\panorama-secovi-fiergs\assets\fiergs')
)

$ErrorActionPreference = 'Stop'
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$outputPath = (Resolve-Path -LiteralPath $OutputDirectory).Path
$powerPoint = New-Object -ComObject PowerPoint.Application

try {
  # Abre uma cópia editável em memória; o PPTX oficial nunca é sobrescrito.
  $deck = $powerPoint.Presentations.Open($sourcePath, $true, $false, $false)
  $divider = $deck.Slides.Item(8)
  foreach ($shape in @($divider.Shapes)) {
    if ($shape.HasTextFrame -and $shape.TextFrame.HasText) { $shape.Visible = 0 }
  }
  $divider.Export((Join-Path $outputPath 'section-divider.png'), 'PNG', 1920, 1080)
  $deck.Close()
} finally {
  $powerPoint.Quit()
  [Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
}

Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile((Join-Path $outputPath 'section-divider.png'))
try {
  if ($image.Width -ne 1920 -or $image.Height -ne 1080) { throw 'section-divider.png não foi exportado em 1920x1080.' }
} finally { $image.Dispose() }

Write-Host 'Asset FIERGS exportado e validado.'
