$ErrorActionPreference = 'Stop'
$folder = (Resolve-Path '.local-inputs/relatorios-lucas/fortaleza/export-2026-11-11').Path
$app = New-Object -ComObject PowerPoint.Application
$owned = $app.Presentations.Count -eq 0
$alerts = $app.DisplayAlerts
try {
  $app.DisplayAlerts = 1
  foreach ($mode in @('faithful','editable')) {
    $file = Join-Path $folder "mensal-$mode.pptx"
    $before = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
    $deck = $app.Presentations.Open($file,-1,0,0)
    try {
      if ($deck.Slides.Count -ne 60) { throw 'Contagem inválida no Office' }
      foreach ($number in @(1,3,13,37,47,52,57,60)) {
        $deck.Slides.Item($number).Export((Join-Path $folder "office-$mode-$number.png"),'PNG',1280,720)
      }
    } finally { $deck.Close() }
    if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $before) { throw 'Arquivo alterado pelo ensaio' }
    Write-Output "Office: $mode, 60 slides; 8 renders; hash preservado"
  }
} finally { $app.DisplayAlerts = $alerts; if ($owned) { $app.Quit() }; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app) }
