param([Parameter(Mandatory=$true)][string]$EvidenceRoot)
$root=(Resolve-Path -LiteralPath $EvidenceRoot).Path
$office=New-Object -ComObject PowerPoint.Application
try {
 foreach($region in @('sul','sudeste','nordeste','norte','centro-oeste')) {
  $source=Join-Path $root ('modelo02-'+$region+'.pptx')
  $dest=Join-Path $root ('pptx-'+$region)
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  $deck=$office.Presentations.Open($source,-1,0,0)
  try { $deck.Export($dest,'JPG',1280,720); Write-Output ($region+': '+$deck.Slides.Count+' slides renderizados') } finally { $deck.Close() }
 }
 $copy=Join-Path $root 'sul-editabilidade-teste.pptx'
 Copy-Item -LiteralPath (Join-Path $root 'modelo02-sul.pptx') -Destination $copy -Force
 $deck=$office.Presentations.Open($copy,0,0,0)
 try {
  $editedTitle=$false; $editedTable=$false; $editedSeries=$false
  foreach($slide in $deck.Slides) {
   foreach($shape in $slide.Shapes) {
    if(!$editedTitle -and $shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
     $shape.TextFrame.TextRange.Text='TESTE DE EDICAO: '+$shape.TextFrame.TextRange.Text
     $editedTitle=$true
    }
    if(!$editedTable -and $shape.HasTable -eq -1) {
     $shape.Table.Cell(1,1).Shape.TextFrame.TextRange.Text='TESTE DE TABELA'
     $editedTable=$true
    }
    if(!$editedSeries -and $shape.HasChart -eq -1) {
     $chart=$shape.Chart
     $chart.ChartData.Activate()
     $book=$chart.ChartData.Workbook
     try {
      if($book.Windows.Count -gt 0){$book.Windows.Item(1).Visible=$false}
      $book.Worksheets.Item(1).Cells.Item(2,2).Value2=12345
     } finally { $book.Close($true) }
     $values=@($chart.SeriesCollection(1).Values)
     $values[0]=12345
     $chart.SeriesCollection(1).Values=$values
     $chart.Refresh()
     $editedSeries=$true
    }
   }
   if($editedTitle -and $editedTable -and $editedSeries){break}
  }
  if(!$editedTitle -or !$editedTable -or !$editedSeries){throw 'Objeto editavel nao encontrado.'}
  $deck.Save()
  @{title=$editedTitle;table=$editedTable;series=$editedSeries;testValue=12345;copy=$copy} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root 'office-editabilidade.json') -Encoding UTF8
 } finally { $deck.Close() }
} finally {
 [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($office)
}
