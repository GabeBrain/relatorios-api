param([Parameter(Mandatory=$true)][string]$PresentationPath,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$source=(Resolve-Path -LiteralPath $PresentationPath).Path
$destination=[IO.Path]::GetFullPath($OutputDirectory)
$localRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../.local-inputs'))+[IO.Path]::DirectorySeparatorChar
if(-not $destination.StartsWith($localRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'Use um diretório de saída dentro de .local-inputs do repositório.'}
if(Test-Path -LiteralPath (Join-Path $destination 'manifest.json')){throw 'A saída já tem manifesto. Escolha um diretório novo para preservar a evidência anterior.'}
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$sourceSha1=(Get-FileHash -LiteralPath $source -Algorithm SHA1).Hash.ToLowerInvariant()
$sourceSha256=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::OpenRead($source)
try{
  $reader=[IO.StreamReader]::new($zip.GetEntry('ppt/presentation.xml').Open())
  try{[xml]$xml=$reader.ReadToEnd()}finally{$reader.Dispose()}
  $ids=@($xml.SelectNodes('/*[local-name()="presentation"]/*[local-name()="sldIdLst"]/*[local-name()="sldId"]') | ForEach-Object {[int]$_.GetAttribute('id')})
}finally{$zip.Dispose()}
$app=$null;$deck=$null;$initialCount=0;$timer=[Diagnostics.Stopwatch]::StartNew()
try{
  $app=New-Object -ComObject PowerPoint.Application
  $initialCount=$app.Presentations.Count;$app.AutomationSecurity=3
  $deck=$app.Presentations.Open($source,-1,0,0)
  if($ids.Count -ne $deck.Slides.Count){throw 'A ordem XML e a apresentação divergem.'}
  $width=1600;$height=[int][Math]::Round($width*$deck.PageSetup.SlideHeight/$deck.PageSetup.SlideWidth)
  $pages=@()
  for($n=1;$n -le $deck.Slides.Count;$n++){
    $slide=$deck.Slides.Item($n)
    if($slide.SlideID -ne $ids[$n-1]){throw "Referência divergente na página $n"}
    $hidden=$slide.SlideShowTransition.Hidden -ne 0
    $name="slide-$n.png";$target=Join-Path $destination $name
    $slide.Export($target,'PNG',$width,$height)
    $pages+=@{page=$n;slideId=$slide.SlideID;hidden=$hidden;width=$width;height=$height;file=$name;sha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant();bytes=(Get-Item -LiteralPath $target).Length}
    $slide.SlideShowTransition.Hidden=0
  }
  $pdf=Join-Path $destination 'preview.pdf';$deck.SaveAs($pdf,32)
  $timer.Stop()
  $manifest=@{schema=1;original=@{name=[IO.Path]::GetFileName($source);sha1=$sourceSha1;sha256=$sourceSha256};converter="Microsoft PowerPoint $($app.Version)";order='presentation.xml sldIdLst e SlideID do PowerPoint';includesHidden=$true;pages=$pages;pdf=@{file='preview.pdf';sha256=(Get-FileHash -LiteralPath $pdf -Algorithm SHA256).Hash.ToLowerInvariant();bytes=(Get-Item -LiteralPath $pdf).Length};elapsedSeconds=$timer.Elapsed.TotalSeconds;createdAt=[DateTime]::UtcNow.ToString('o')}
  $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $destination 'manifest.json') -Encoding UTF8
}finally{
  if($deck){$deck.Close();[void][Runtime.InteropServices.Marshal]::ReleaseComObject($deck)}
  if($app){if($initialCount -eq 0){$app.Quit()};[void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)}
}
if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $sourceSha256){throw 'O original mudou durante a conversão.'}
Get-Content -LiteralPath (Join-Path $destination 'manifest.json') -Encoding UTF8
