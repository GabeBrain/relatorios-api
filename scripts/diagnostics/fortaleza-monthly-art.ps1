param([int]$FirstSlide = 46, [int]$LastSlide = 55)
. (Join-Path $PSScriptRoot 'fortaleza-static-text.ps1')
$ErrorActionPreference = 'Stop'
$staticText = @{}
$fortMonthlyRoot = (Resolve-Path '.local-inputs/relatorios-lucas/fortaleza').Path
$fortMonthlyAssets = Join-Path (Get-Location) 'src/features/relatorios-institucionais/fortaleza/assets/monthly'
New-Item -ItemType Directory -Path $fortMonthlyAssets -Force | Out-Null
$fortMonthlyOffice = New-Object -ComObject PowerPoint.Application
$fortMonthlyRecords = @()
try {
  $deck = $fortMonthlyOffice.Presentations.Open((Join-Path $fortMonthlyRoot 'fortaleza-julho-2026.pptx'), -1, 0, 0)
  try {
    foreach ($number in $FirstSlide..$LastSlide) {
      $slide = $deck.Slides.Item($number)
      $slide.Export((Join-Path $fortMonthlyRoot "monthly-original-$number.png"), 'PNG', 1280, 720)
      $charts = @(); $texts = @(); $changes = 0; $scopeSlot = $null
      foreach ($shape in @($slide.Shapes)) {
        if ($number -in @(57,58) -and $shape.Left -lt 600) { $shape.Delete()
        } elseif ($number -ge 47 -and $shape.HasTable -eq -1) { $shape.Delete()
        } elseif ($shape.HasChart -eq -1) {
          $charts += @{x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
          $shape.Delete()
        } elseif ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
          $content = [string]$shape.TextFrame.TextRange.Text
          if ($number -in @(40,41,42,43) -and $content.Contains('|')) {
            $shape.TextFrame2.TextRange.Font.Fill.Transparency = 1; continue
          }
          if ($number -in @(18,21,29,32) -and $content.Contains('Fortaleza,')) {
            $scopeSlot = @{x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
            $shape.TextFrame2.TextRange.Font.Fill.Transparency = 1; continue
          }
          # Historical MCMV ceiling is an editorial note, not a rule for every future month.
          if ($content.StartsWith('Obs.:') -or $content.Contains('Atualizado pelo INCC')) { $shape.TextFrame2.TextRange.Font.Fill.Transparency = 1; continue }
          if ($content.Contains('%')) {
            $texts += @{kind=@('total','economic','other')[$changes];x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
            $changes++; $shape.TextFrame2.TextRange.Font.Fill.Transparency = 1
          }
        }
      }
      $staticText[[string]$number] = Get-FortalezaStaticText $slide
      $slide.Export((Join-Path $fortMonthlyAssets "$number.png"), 'PNG', 1280, 720)
      $fortMonthlyRecords += @{page=$number;charts=$charts;changes=$texts;scope=$scopeSlot}
    }
  } finally { $deck.Close() }
} finally { $fortMonthlyOffice.Quit() }
$fortMonthlyPrevious = Get-Content -LiteralPath (Join-Path $fortMonthlyAssets 'layout.json') -Raw | ConvertFrom-Json
$fortMonthlyRecords = @($fortMonthlyPrevious | Where-Object { $_.page -lt $FirstSlide -or $_.page -gt $LastSlide }) + $fortMonthlyRecords
$fortMonthlyRecords | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $fortMonthlyAssets 'layout.json') -Encoding UTF8
Write-Output 'Monthly artwork extracted without historical market values or dated methodology notes.'

$previousTextPath = Join-Path $fortMonthlyAssets 'static-text.json'
if (Test-Path -LiteralPath $previousTextPath) {
  $previousText = Get-Content -LiteralPath $previousTextPath -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($property in $previousText.PSObject.Properties) {
    if (-not $staticText.ContainsKey($property.Name)) { $staticText[$property.Name] = $property.Value }
  }
}
$staticText | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $fortMonthlyAssets 'static-text.json') -Encoding UTF8
