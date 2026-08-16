# Genera los íconos de la PWA (fondo magenta de acento + marca simple en
# blanco) usando System.Drawing, sin depender de Node/Python. Ejecutar con:
#   powershell -File scripts/generate-pwa-icons.ps1
Add-Type -AssemblyName System.Drawing

$bgHex = '#D6006C'
$bg = [System.Drawing.ColorTranslator]::FromHtml($bgHex)
$white = [System.Drawing.Color]::White

function New-Icon {
  param(
    [int]$Size,
    [string]$Path,
    [double]$SafeZoneRatio = 1.0
  )

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear($bg)

  $center = $Size / 2
  $glyphDiameter = $Size * 0.62 * $SafeZoneRatio

  # Círculo blanco (espejo/compacto) centrado
  $r1 = $glyphDiameter / 2
  $g.FillEllipse([System.Drawing.Brushes]::White, $center - $r1, $center - $r1, $glyphDiameter, $glyphDiameter)

  # Círculo de acento dentro, mismo tono del fondo
  $glyphInner = $glyphDiameter * 0.56
  $r2 = $glyphInner / 2
  $accentBrush = New-Object System.Drawing.SolidBrush $bg
  $g.FillEllipse($accentBrush, $center - $r2, $center - $r2, $glyphInner, $glyphInner)

  # Punto blanco pequeño (highlight) arriba a la izquierda del círculo interior
  $dotDiameter = $glyphInner * 0.22
  $dotOffset = $r2 * 0.55
  $g.FillEllipse([System.Drawing.Brushes]::White, $center - $dotOffset - $dotDiameter / 2, $center - $dotOffset - $dotDiameter / 2, $dotDiameter, $dotDiameter)

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

$publicDir = Join-Path $PSScriptRoot '..\public'

New-Icon -Size 192 -Path (Join-Path $publicDir 'pwa-192.png')
New-Icon -Size 512 -Path (Join-Path $publicDir 'pwa-512.png')
New-Icon -Size 512 -Path (Join-Path $publicDir 'pwa-maskable-512.png') -SafeZoneRatio 0.72
New-Icon -Size 180 -Path (Join-Path $publicDir 'apple-touch-icon.png')

Write-Output "Íconos generados en $publicDir"
