$ErrorActionPreference = 'Stop'
function Get-MaceioStaticText($slide) {
 $result=@()
 foreach($shape in @($slide.Shapes)) {
  if($shape.Visible -eq 0 -or $shape.HasTextFrame -ne -1 -or $shape.TextFrame.HasText -ne -1){continue}
  if($shape.TextFrame2.TextRange.Font.Fill.Transparency -eq 1){continue}
  $range=$shape.TextFrame.TextRange
  for($i=1;$i -le $range.Lines().Count;$i++){
   $line=$range.Lines($i,1);if([string]::IsNullOrWhiteSpace($line.Text)){continue}
   $rgb=[int]$line.Characters(1,1).Font.Color.RGB
   $result+=@{text=([string]$line.Text).TrimEnd("`r","`n");x=[double]$line.BoundLeft*4/3;y=[double]$line.BoundTop*4/3;size=[double]$line.Font.Size*4/3;bold=($line.Font.Bold -eq -1);italic=($line.Font.Italic -eq -1);color=('#{0:X2}{1:X2}{2:X2}' -f ($rgb -band 255),(($rgb -shr 8) -band 255),(($rgb -shr 16) -band 255))}
  }
  $shape.TextFrame2.TextRange.Font.Fill.Transparency=1
 }
 return ,$result
}
$root = (Get-Location).Path
$inputs = @{
 monthly='5.2026_Panorama_Maceio_Sinduscon_AL_VAP_01jul_16h05.pptx'
 quarterly='Brain_Panorama_Maceio_Sinduson_AL_06.2026_vApres.pptx'
}
$office = New-Object -ComObject PowerPoint.Application
$owned = $office.Presentations.Count -eq 0
try {
 foreach ($kind in @('monthly','quarterly')) {
  $source=Join-Path $root ('.local-inputs/relatorios-lucas/maceio/'+$inputs[$kind])
  $hash=(Get-FileHash -LiteralPath $source).Hash
  $output=Join-Path $root ('src/features/relatorios-institucionais/maceio/assets/'+$kind)
  New-Item -ItemType Directory -Force -Path $output | Out-Null
  $deck=$office.Presentations.Open($source,-1,0,0)
  $records=@{}
  try {
   foreach ($n in 1..20) {
    $slide=$deck.Slides.Item($n); $slots=@(); $charts=@()
    foreach ($shape in @($slide.Shapes)) {
     if ($shape.HasChart -eq -1) {
      $charts+=@{x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
      $shape.Visible=0;continue
     }
     if ($shape.HasTable -eq -1) {$shape.Visible=0;continue}
     if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
      $text=[string]$shape.TextFrame.TextRange.Text
      $slot=$null
      if ($n -eq 2 -and $text -match '2026') {$slot='period'}
      if ($n -eq 7 -and $text -match '2026') {$slot='period'}
      if ($n -eq 7 -and $text -match 'representam') {$slot='territory-note'}
      if ($slot) {
       $slots+=@{kind=$slot;x=[double]$shape.Left*4/3;y=[double]$shape.Top*4/3;width=[double]$shape.Width*4/3;height=[double]$shape.Height*4/3}
       $shape.TextFrame2.TextRange.Font.Fill.Transparency=1
      } elseif (($n -ge 9 -and $n -le 14 -and ($text -match '%' -or $text -match '^[+\u2212-]?\d')) -or ($n -ge 16 -and ($text -match '%' -or $text -match '2026' -or $text.Trim() -eq '*'))) {
       $shape.Visible=0
      }
     } elseif ($n -ge 9 -and $n -le 14) {
      # These originals embed employment charts as pictures/groups, not data sources.
      # Preserve the small underline decoration only; branding belongs to the layout.
      if ($shape.Height -gt 22 -and $shape.Top -lt 630) {$shape.Visible=0}
     }
    }
    $texts=Get-MaceioStaticText $slide
    if($n -eq 6){foreach($shape in @($slide.Shapes)){if($shape.HasTextFrame -eq -1){$shape.TextFrame.TextRange.ParagraphFormat.Bullet.Visible=0}}}
    $records[[string]$n]=@{texts=$texts;slots=$slots;charts=$charts}
    $slide.Export((Join-Path $output "$n.png"),'PNG',1280,720)
   }
  } finally {$deck.Close()}
  $records | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $output 'layout.json') -Encoding UTF8
  if((Get-FileHash -LiteralPath $source).Hash -ne $hash){throw 'Original was modified'}
  Write-Output "$kind : 20 artworks extracted; original SHA256 unchanged"
 }
} finally {if($owned){$office.Quit()}; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($office)}
