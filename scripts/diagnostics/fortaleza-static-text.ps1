function Get-FortalezaStaticText($slide) {
  $result = @()
  foreach ($shape in @($slide.Shapes)) {
    if ($shape.HasTextFrame -ne -1 -or $shape.TextFrame.HasText -ne -1) { continue }
    if ($shape.TextFrame2.TextRange.Font.Fill.Transparency -eq 1) { continue }
    $range = $shape.TextFrame.TextRange
    $range.Font.Name = 'Tahoma'
    if ($shape.Top -lt 100 -and $shape.Width -gt 300 -and $range.Font.Size -ge 18 -and $range.Text.Length -gt 6) { $range.Font.Size = [Math]::Max(30, $range.Font.Size) }
    for ($lineIndex=1; $lineIndex -le $range.Lines().Count; $lineIndex++) {
      $line = $range.Lines($lineIndex,1)
      if ([string]::IsNullOrWhiteSpace($line.Text)) { continue }
      $rgb=[int]$line.Characters(1,1).Font.Color.RGB
      $color=('#{0:X2}{1:X2}{2:X2}' -f ($rgb -band 255), (($rgb -shr 8) -band 255), (($rgb -shr 16) -band 255))
      $result += @{text=([string]$line.Text).TrimEnd("`r","`n");x=[double]$line.BoundLeft*4/3;y=[double]$line.BoundTop*4/3;size=[double]$line.Font.Size*4/3;bold=($line.Font.Bold -eq -1);italic=($line.Font.Italic -eq -1);color=$color}
    }
    $shape.TextFrame2.TextRange.Font.Fill.Transparency = 1
  }
  return ,$result
}
