$ErrorActionPreference = 'Stop'
$fortMonthlyRoot = (Resolve-Path '.local-inputs/relatorios-lucas/fortaleza').Path
$fortMonthlyAssets = Join-Path (Get-Location) 'src/features/relatorios-institucionais/fortaleza/assets/monthly'
New-Item -ItemType Directory -Path $fortMonthlyAssets -Force | Out-Null
$fortMonthlyOffice = New-Object -ComObject PowerPoint.Application
$fortMonthlyRecords = @()
try {
  $deck = $fortMonthlyOffice.Presentations.Open((Join-Path $fortMonthlyRoot 'fortaleza-julho-2026.pptx'), -1, 0, 0)
  try {
    foreach ($number in @(11,12,13,14,15)) {
      $slide = $deck.Slides.Item($number)
      $slide.Export((Join-Path $fortMonthlyRoot "monthly-original-$number.png"), 'PNG', 1280, 720)
      $charts = @(); $texts = @(); $changes = 0
      foreach ($shape in @($slide.Shapes)) {
        if ($shape.HasChart -eq -1) {
          $charts += @{x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
          $shape.Delete()
        } elseif ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
          $content = [string]$shape.TextFrame.TextRange.Text
          # Historical MCMV ceiling is an editorial note, not a rule for every future month.
          if ($content.StartsWith('Obs.:')) { $shape.TextFrame2.TextRange.Font.Fill.Transparency = 1; continue }
          if ($content.Contains('%')) {
            $texts += @{kind=@('total','economic','other')[$changes];x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
            $changes++; $shape.TextFrame2.TextRange.Font.Fill.Transparency = 1
          }
        }
      }
      $slide.Export((Join-Path $fortMonthlyAssets "$number.png"), 'PNG', 1280, 720)
      $fortMonthlyRecords += @{page=$number;charts=$charts;changes=$texts}
    }
  } finally { $deck.Close() }
} finally { $fortMonthlyOffice.Quit() }
$fortMonthlyRecords | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $fortMonthlyAssets 'layout.json') -Encoding UTF8
Write-Output 'Monthly artwork extracted without historical market values or dated methodology notes.'
