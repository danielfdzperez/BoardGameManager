# Genera el icono de la app (meeple) en android/app/src/main/res (mipmap-*). Uso: powershell -File generar-icono.ps1
# Colores: los de la web (--fondo #14161c, --acento #f2a93b).
Add-Type -AssemblyName System.Drawing
$res = Join-Path $PSScriptRoot "android\app\src\main\res"
$fondo = [Drawing.ColorTranslator]::FromHtml("#14161c")
$acento = [Drawing.ColorTranslator]::FromHtml("#f2a93b")

# Silueta de meeple en una caja de 100x100 (cabeza + cuerpo con brazos y piernas)
$cuerpo = @(58,33, 88,43, 91,53, 84,60, 67,60, 81,92, 55,92, 50,80, 45,92, 19,92, 33,60, 16,60, 9,53, 12,43, 42,33)
function Dibujar-Meeple($g, [float]$cx, [float]$cy, [float]$alto) {
  $k = $alto / 86.0                       # el meeple ocupa de y=8 a y=94
  $ox = $cx - 50 * $k; $oy = $cy - 51 * $k
  $pts = New-Object 'System.Collections.Generic.List[Drawing.PointF]'
  for ($i = 0; $i -lt $cuerpo.Count; $i += 2) { $pts.Add((New-Object Drawing.PointF(($ox + $cuerpo[$i] * $k), ($oy + $cuerpo[$i+1] * $k)))) }
  $brocha = New-Object Drawing.SolidBrush $acento
  $pluma = New-Object Drawing.Pen($acento, [float](7 * $k)); $pluma.LineJoin = [Drawing.Drawing2D.LineJoin]::Round
  $g.FillPolygon($brocha, $pts.ToArray()); $g.DrawPolygon($pluma, $pts.ToArray())   # esquinas redondeadas
  $g.FillEllipse($brocha, [float]($ox + 35 * $k), [float]($oy + 6 * $k), [float](30 * $k), [float](30 * $k))
  $brocha.Dispose(); $pluma.Dispose()
}
function Nuevo-Lienzo([int]$t) {
  $b = New-Object Drawing.Bitmap($t, $t, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [Drawing.Graphics]::FromImage($b); $g.SmoothingMode = 'AntiAlias'; $g.Clear([Drawing.Color]::Transparent)
  return @($b, $g)
}
function Guardar($b, $g, $ruta) { $g.Dispose(); $b.Save($ruta, [Drawing.Imaging.ImageFormat]::Png); $b.Dispose() }

$dens = @{ "mdpi" = 1.0; "hdpi" = 1.5; "xhdpi" = 2.0; "xxhdpi" = 3.0; "xxxhdpi" = 4.0 }
foreach ($d in $dens.Keys) {
  $m = $dens[$d]; $dir = Join-Path $res "mipmap-$d"
  # Primer plano adaptativo (108dp; zona segura central de 66dp): solo el meeple
  $t = [int](108 * $m); $b, $g = Nuevo-Lienzo $t
  Dibujar-Meeple $g ($t / 2) ($t / 2) ($t * 0.50)
  Guardar $b $g (Join-Path $dir "ic_launcher_foreground.png")
  # Iconos antiguos (48dp): cuadrado redondeado y círculo con fondo
  $t = [int](48 * $m)
  foreach ($forma in "cuadrado", "redondo") {
    $b, $g = Nuevo-Lienzo $t
    $f = New-Object Drawing.SolidBrush $fondo
    if ($forma -eq "redondo") { $g.FillEllipse($f, 0, 0, $t - 1, $t - 1) }
    else {
      $r = $t * 0.22; $ruta = New-Object Drawing.Drawing2D.GraphicsPath
      $ruta.AddArc(0, 0, 2*$r, 2*$r, 180, 90); $ruta.AddArc($t - 1 - 2*$r, 0, 2*$r, 2*$r, 270, 90)
      $ruta.AddArc($t - 1 - 2*$r, $t - 1 - 2*$r, 2*$r, 2*$r, 0, 90); $ruta.AddArc(0, $t - 1 - 2*$r, 2*$r, 2*$r, 90, 90)
      $ruta.CloseFigure(); $g.FillPath($f, $ruta)
    }
    $f.Dispose()
    Dibujar-Meeple $g ($t / 2) ($t / 2) ($t * 0.62)
    Guardar $b $g (Join-Path $dir $(if ($forma -eq "redondo") { "ic_launcher_round.png" } else { "ic_launcher.png" }))
  }
}
Write-Host "Iconos generados en $res"
