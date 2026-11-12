. (Join-Path $PSScriptRoot 'fortaleza-static-text.ps1')
$staticText = @{}
$ErrorActionPreference = 'Stop'
$fortIntroRoot = (Resolve-Path '.local-inputs/relatorios-lucas/fortaleza').Path
$fortIntroAssets = Join-Path (Get-Location) 'src/features/relatorios-institucionais/fortaleza/assets/intro'
New-Item -ItemType Directory -Path $fortIntroAssets -Force | Out-Null
$fortSlots = Get-Content -LiteralPath (Join-Path $fortIntroRoot 'intro-slots.json') -Raw -Encoding UTF8 | ConvertFrom-Json
function HexColor($color) { $value = [int]$color; return ('#{0:X2}{1:X2}{2:X2}' -f ($value -band 255), (($value -shr 8) -band 255), (($value -shr 16) -band 255)) }
function FontRecord($range) { return @{family=[string]$range.Font.Name;size=[double]$range.Font.Size*4/3;bold=($range.Font.Bold -eq -1);italic=($range.Font.Italic -eq -1);color=(HexColor $range.Characters(1,1).Font.Color.RGB)} }
$fortOffice = New-Object -ComObject PowerPoint.Application
$fortLayouts = @{}
try {
  foreach ($model in @('junho','julho')) {
    $deck = $fortOffice.Presentations.Open((Join-Path $fortIntroRoot "fortaleza-$model-2026.pptx"), -1, 0, 0)
    $records = @()
    try {
      foreach ($page in $fortSlots.$model) {
        $slide = $deck.Slides.Item($page.number)
        $slide.Export((Join-Path $fortIntroRoot "$model-intro-original-$($page.number).png"), 'PNG', 1280, 720)
        $shapes = @()
        foreach ($slot in $page.slots) {
          $shape = @($slide.Shapes | Where-Object { $_.Id -eq $slot.id })[0]
          $record = @{slot=$slot.slot; x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
          if ($slot.slot -eq 'table') {
            $table = $shape.Table; $cells=@(); $y=[double]$shape.Top*4/3
            for($r=1;$r -le $table.Rows.Count;$r++) {
              $x=[double]$shape.Left*4/3; $h=[double]$table.Rows.Item($r).Height*4/3
              for($c=1;$c -le $table.Columns.Count;$c++) {
                $cell=$table.Cell($r,$c).Shape; $w=[double]$table.Columns.Item($c).Width*4/3
                $cells += @{row=$r-1;column=$c-1;x=$x;y=$y;width=$w;height=$h;font=(FontRecord $cell.TextFrame.TextRange);text=[string]$cell.TextFrame.TextRange.Text;align=[int]$cell.TextFrame.TextRange.ParagraphFormat.Alignment;marginLeft=[double]$cell.TextFrame.MarginLeft*4/3;marginRight=[double]$cell.TextFrame.MarginRight*4/3}
                $x += $w
              }
              $y += $h
            }
            $record.cells=$cells;$record.rows=$table.Rows.Count;$record.columns=$table.Columns.Count
          } elseif ($slot.slot -ne 'chart') {
            $text=$shape.TextFrame.TextRange; $lines=@()
            for($i=1;$i -le $text.Lines().Count;$i++) { $line=$text.Lines($i,1);$lines += @{text=[string]$line.Text;x=[double]$line.BoundLeft*4/3;y=[double]$line.BoundTop*4/3;width=[double]$line.BoundWidth*4/3;height=[double]$line.BoundHeight*4/3;font=(FontRecord $line);align=[int]$line.ParagraphFormat.Alignment} }
            $record.lines=$lines
          }
          $shapes += $record
        }
        $records += @{number=[int]$page.number;shapes=$shapes}
        # Render and hide in the same native layout instance, after font measurement.
        $slide.Export((Join-Path $fortIntroRoot "$model-intro-original-$($page.number).png"), 'PNG', 1280, 720)
        foreach ($slot in $page.slots) {
          $dynamicShape = @($slide.Shapes | Where-Object { $_.Id -eq $slot.id })[0]
          if ($slot.slot -eq 'chart') { $dynamicShape.Delete() }
          elseif ($slot.slot -eq 'table') { $dynamicShape.Delete() } else { $dynamicShape.TextFrame2.TextRange.Font.Fill.Transparency = 1 }
        }
        $staticText["$model-$($page.number)"] = Get-FortalezaStaticText $slide
        $slide.Export((Join-Path $fortIntroAssets "$model-$($page.number).png"), 'PNG', 1280, 720)
      }
    } finally { $deck.Close() }
    $fortLayouts[$model]=$records
  }
} finally { $fortOffice.Quit() }
$fortLayouts | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath (Join-Path $fortIntroRoot 'intro-layout-original.json') -Encoding UTF8
Write-Output '20 original slides rendered; exact native artwork and dynamic element positions extracted.'

$staticText | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $fortIntroAssets 'static-text.json') -Encoding UTF8
