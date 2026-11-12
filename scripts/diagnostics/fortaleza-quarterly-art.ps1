param([int]$First = 11, [int]$Last = 89)
$ErrorActionPreference = 'Stop'
$fortQuarterRoot = (Resolve-Path '.local-inputs/relatorios-lucas/fortaleza').Path
$fortQuarterAssets = Join-Path (Get-Location) 'src/features/relatorios-institucionais/fortaleza/assets/quarterly'
New-Item -ItemType Directory -Path $fortQuarterAssets -Force | Out-Null
$source = Join-Path $fortQuarterRoot 'fortaleza-junho-2026.pptx'
if ((Get-FileHash -LiteralPath $source).Hash -ne '9627305DB0022997961CD8FEB37523CCA49111EE8277947A0E4544B5BC66A78A') { throw 'Original trimestral diferente do catalogado.' }
$office = New-Object -ComObject PowerPoint.Application
$records = @()
try {
  $deck = $office.Presentations.Open($source, -1, 0, 0)
  try {
    if ($deck.Slides.Count -ne 89) { throw 'Ordem original indisponivel.' }
    foreach ($number in $First..$Last) {
      $slide = $deck.Slides.Item($number)
      $slide.Export((Join-Path $fortQuarterRoot "quarterly-original-$number.png"), 'PNG', 1280, 720)
      $charts = @(); $changes = @(); $table = $null; $scope = $null
      foreach ($shape in @($slide.Shapes)) {
        if ($number -in @(86,87) -and $shape.Left -lt 600) {
          $shape.Delete()
        } elseif ($number -in @(49,50,51,52,53,71) -and $shape.Type -eq 13) {
          $shape.Delete()
        } elseif ($shape.HasChart -eq -1) {
          $charts += @{x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
          $shape.Delete()
        } elseif ($shape.HasTable -eq -1) {
          $table = @{x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
          $shape.Delete()
        } elseif ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
          $content = [string]$shape.TextFrame.TextRange.Text
          if ($content.Contains('%')) {
            $changes += @{x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
            $shape.TextFrame2.TextRange.Font.Fill.Transparency = 1
          } elseif ($content.StartsWith('Obs.:') -or $content.Contains('Atualizado pelo INCC') -or $content.Contains('Trimestre de') -or $content -match 'Junho/2026') {
            $shape.TextFrame2.TextRange.Font.Fill.Transparency = 1
          } elseif ($number -in @(20,23,33,36,65,70,80) -and $content.Contains('Fortaleza,')) {
            $scope = @{x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
            $shape.TextFrame2.TextRange.Font.Fill.Transparency = 1
          }
        }
      }
      $slide.Export((Join-Path $fortQuarterAssets "$number.png"), 'PNG', 1280, 720)
      $records += @{page=$number;charts=$charts;changes=$changes;table=$table;scope=$scope}
    }
  } finally { $deck.Close() }
} finally { $office.Quit() }
$records | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $fortQuarterAssets 'layout.json') -Encoding UTF8
Write-Output 'Slides trimestrais: arte trimestral sem cifras historicas; original aberto em leitura.'
