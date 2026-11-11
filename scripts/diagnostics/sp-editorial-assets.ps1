param([string]$Source = '.local-inputs/relatorios-lucas/sp/revisao-finotti-2026-11-11/2026.06_PANORAMA_SAO_PAULO_VAP_13ago.pptx')
$ErrorActionPreference = 'Stop'
if ((Get-FileHash -LiteralPath $Source -Algorithm SHA256).Hash -ne '1350F82CB1D9386487CA1A9AEE110FB19CF3D6EA7CB40D4A0205025802D9939B') { throw 'Original SP diferente da referência conferida.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing
$spAssets = Join-Path (Get-Location) 'src/features/relatorios-institucionais/sp/assets/people'
New-Item -ItemType Directory -Force $spAssets | Out-Null
$spArchive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Source).Path)
function Read-SpEntry([string]$Name) {
  $entry = $spArchive.GetEntry($Name)
  if (!$entry) { throw "Parte ausente: $Name" }
  $stream = $entry.Open(); $memory = [System.IO.MemoryStream]::new()
  try { $stream.CopyTo($memory); return ,$memory.ToArray() } finally { $stream.Dispose(); $memory.Dispose() }
}
function Read-SpImage([int]$Page, [int]$Index) {
  [xml]$slide = [Text.Encoding]::UTF8.GetString((Read-SpEntry "ppt/slides/slide$Page.xml"))
  [xml]$rels = [Text.Encoding]::UTF8.GetString((Read-SpEntry "ppt/slides/_rels/slide$Page.xml.rels"))
  $ns = [Xml.XmlNamespaceManager]::new($slide.NameTable)
  $ns.AddNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main')
  $id = $slide.SelectNodes('//a:blip',$ns).Item($Index).GetAttribute('embed','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
  $target = @($rels.GetElementsByTagName('Relationship') | Where-Object { $_.Id -eq $id })[0].Target
  if ($target -notmatch '^\.\./media/[a-zA-Z0-9_.-]+$') { throw 'Parte de imagem inesperada.' }
  return ,(Read-SpEntry ('ppt/'+$target.Substring(3)))
}
try {
  foreach ($photo in @(@{name='fabio';index=3},@{name='marcos';index=2},@{name='teresa';index=1},@{name='mariana';index=0},@{name='lucas';index=4})) {
    [IO.File]::WriteAllBytes((Join-Path $spAssets "$($photo.name).png"),(Read-SpImage 82 $photo.index))
  }
  [IO.File]::WriteAllBytes((Join-Path $spAssets 'consulting-reference.jpg'),(Read-SpImage 83 0))
  $regions = @(
    @{page=4;x=73;y=165;width=465;height=141},
    @{page=5;x=630;y=380;width=300;height=103},
    @{page=84;x=100;y=157;width=295;height=140},
    @{page=84;x=193;y=375;width=220;height=70},
    @{page=85;x=335;y=354;width=292;height=64}
  )
  $records = @()
  foreach ($region in $regions) {
    $memory=[IO.MemoryStream]::new((Read-SpImage $region.page 0))
    $image=[Drawing.Bitmap]::new($memory)
    try {
      # Source artwork is 1920×1080; layout coordinates below use 960×540.
      # Use a median neighborhood to avoid sampling letters or decorative lines.
      $bands=@()
      for($offset=0;$offset -lt $region.height;$offset+=4) {
        $colors=@()
        foreach($x in @(($region.x-3),($region.x+$region.width+3))) {
          $samples=@(-6,-3,0,3,6 | ForEach-Object { $image.GetPixel($x*2,($region.y+$offset+$_+3)*2) })
          $rgb=@('R','G','B' | ForEach-Object { $channel=$_; @($samples | ForEach-Object { $_.$channel } | Sort-Object)[2] })
          $colors+=('#{0:X2}{1:X2}{2:X2}' -f $rgb[0],$rgb[1],$rgb[2])
        }
        $bands+=@{offset=$offset;height=[Math]::Min(4,$region.height-$offset);left=$colors[0];right=$colors[1]}
      }
      # Smooth the measured endpoints: JPEG noise or a decorative stroke must
      # not become a horizontal stripe behind a shorter replacement text.
      foreach($side in @('left','right')) {
        $edge=4
        $first=@(0,1,2 | ForEach-Object { $channel=$_; [int](@($bands | Select-Object -First $edge | ForEach-Object { [Convert]::ToInt32($_[$side].Substring(1+$channel*2,2),16) } | Sort-Object)[[int]($edge/2)]) })
        $last=@(0,1,2 | ForEach-Object { $channel=$_; [int](@($bands | Select-Object -Last $edge | ForEach-Object { [Convert]::ToInt32($_[$side].Substring(1+$channel*2,2),16) } | Sort-Object)[[int]($edge/2)]) })
        for($i=0;$i -lt $bands.Count;$i++) { $ratio=$i/[double]($bands.Count-1);$values=@(0,1,2 | ForEach-Object { [int][Math]::Round($first[$_]+($last[$_]-$first[$_])*$ratio) });$bands[$i][$side]=('#{0:X2}{1:X2}{2:X2}' -f $values[0],$values[1],$values[2]) }
      }
      $records+=@{page=$region.page;x=$region.x;y=$region.y;width=$region.width;height=$region.height;bands=$bands}
    } finally { $image.Dispose(); $memory.Dispose() }
  }
  $records | ConvertTo-Json -Depth 8 | Set-Content 'src/features/relatorios-institucionais/sp/institutional-text-background.json' -Encoding UTF8
} finally { $spArchive.Dispose() }
Write-Output 'Retratos originais preservados e cores de fundo medidas; sem alteração do PPTX de origem.'
