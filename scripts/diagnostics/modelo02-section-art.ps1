# Regenerates the regional divider arts (regional-opening and section-*) without their original
# title text, title bar or slide number, so the runtime title never overlaps residual glyphs.
# Originals are opened read-only and closed without saving.
param([string]$Sources = (Join-Path $env:USERPROFILE 'Desktop\Relatorios Institucionais Imprensa - Referencias Regionais'))
$ErrorActionPreference = 'Stop'
$feature = Join-Path (Get-Location) 'src/features/relatorios-institucionais/modelo-02'
$manifest = Get-Content -LiteralPath (Join-Path $feature 'reference-manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$office = New-Object -ComObject PowerPoint.Application
$report = @()
function Test-HasText($shape) {
  if ($shape.Type -eq 6) { foreach ($item in @($shape.GroupItems)) { if (Test-HasText $item) { return $true } }; return $false }
  return ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1)
}
function Get-ShapeText($shape) {
  if ($shape.Type -eq 6) { return (@($shape.GroupItems) | ForEach-Object { Get-ShapeText $_ }) -join ' / ' }
  if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) { return ($shape.TextFrame.TextRange.Text -replace "`r", ' / ') }
  return ''
}
try {
  foreach ($region in @('sul', 'sudeste', 'nordeste', 'norte', 'centro-oeste')) {
    $entry = $manifest.$region
    $deck = $office.Presentations.Open((Join-Path $Sources $entry.source), -1, 0, 0)
    try {
      foreach ($row in @($entry.slides | Where-Object { $_.key -eq 'regional-opening' -or $_.key -like 'section-*' })) {
        $slide = $deck.Slides.Item($row.number)
        $removed = @()
        foreach ($shape in @($slide.Shapes)) {
          $w = $shape.Width * 4 / 3; $h = $shape.Height * 4 / 3; $x = $shape.Left * 4 / 3
          $bar = ($shape.Type -eq 13 -or $shape.Type -eq 1) -and $h -lt 32 -and $w -lt 160 -and $x -lt 140
          if ((Test-HasText $shape) -or $bar -or $shape.Type -eq 14) {
            $removed += [pscustomobject]@{ name = $shape.Name; text = (Get-ShapeText $shape); bar = $bar }
            $shape.Delete()
          }
        }
        $dest = Join-Path $feature "assets/editorial/$region-$($row.key).jpg"
        $slide.Export($dest, 'JPG', 1280, 720)
        $report += [pscustomobject]@{ region = $region; number = $row.number; key = $row.key; removed = $removed }
      }
    } finally { $deck.Close() }
  }
} finally { $office.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($office) }
$report | ConvertTo-Json -Depth 5
