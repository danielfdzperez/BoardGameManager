# Servidor local de "Mis juegos de mesa" para Windows (PowerShell, no hay que instalar nada).
# Sirve la web y permite que crear.html guarde los juegos DIRECTAMENTE en data\juegos.js.
# Uso: doble clic en iniciar.bat  ->  http://localhost:8080/web/index.html
param([int]$Puerto = 8080)
$ErrorActionPreference = "Stop"
$raiz = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))   # raiz del proyecto (este script vive en serverTest)
$fichero = Join-Path $raiz "data\juegos.js"
$prefijo = "window.DATOS_JUEGOS = "
$cabecera = "/* FUENTE DE DATOS de los juegos (unica). Formato: window.DATOS_JUEGOS = { version, actualizado, fuente, juegos: [...] };`n   Solo lo lee js/datos/repositorio-js.js (y el servidor). Esquema en IADocs/datos-juegos.md */`n"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$tipos = @{ ".html"="text/html; charset=utf-8"; ".js"="application/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8";
  ".json"="application/json; charset=utf-8"; ".png"="image/png"; ".jpg"="image/jpeg"; ".svg"="image/svg+xml"; ".ico"="image/x-icon"; ".md"="text/plain; charset=utf-8" }

function Enviar($ctx, [int]$codigo, [string]$tipo, [byte[]]$bytes) {
  $r = $ctx.Response
  $r.StatusCode = $codigo
  $r.ContentType = $tipo
  $r.Headers.Add("Cache-Control", "no-store")
  $r.ContentLength64 = $bytes.Length
  $r.OutputStream.Write($bytes, 0, $bytes.Length)
  $r.OutputStream.Close()
}
function EnviarJson($ctx, [int]$codigo, [string]$json) { Enviar $ctx $codigo "application/json; charset=utf-8" ($utf8.GetBytes($json)) }

function LeerJuegosJson {
  $t = [System.IO.File]::ReadAllText($fichero, $utf8)
  $i = $t.IndexOf("`n" + $prefijo)
  if ($i -lt 0) { throw "data/juegos.js no tiene el formato esperado" }
  return $t.Substring($i + 1 + $prefijo.Length).Trim().TrimEnd(";")
}

$escucha = New-Object System.Net.HttpListener
$escucha.Prefixes.Add("http://localhost:$Puerto/")
$escucha.Start()
Write-Host "Mis juegos de mesa -> http://localhost:$Puerto/web/index.html  (cierra esta ventana para parar)"

while ($escucha.IsListening) {
  $ctx = $escucha.GetContext()
  try {
    $ruta = $ctx.Request.Url.AbsolutePath
    $metodo = $ctx.Request.HttpMethod
    if ($ruta -eq "/api/estado") {
      EnviarJson $ctx 200 '{"ok":true,"escritura":true}'
    } elseif (($ruta -eq "/api/bgg/geekitems" -or $ruta -eq "/api/bgg/dynamicinfo") -and $metodo -eq "GET") {
      # Proxy a BGG (api.geekdo.com no manda CORS)
      $destino = "https://api.geekdo.com/api/" + $ruta.Substring("/api/bgg/".Length) + $ctx.Request.Url.Query
      try {
        $resp = Invoke-WebRequest -Uri $destino -UseBasicParsing -TimeoutSec 15 -Headers @{ Accept = "application/json"; "User-Agent" = "Mozilla/5.0" }
        EnviarJson $ctx 200 $resp.Content
      } catch {
        $codigo = 502
        if ($_.Exception.Response) { $codigo = [int]$_.Exception.Response.StatusCode }
        EnviarJson $ctx $codigo ('{"error":"' + ($_.Exception.Message -replace '[\\"\r\n]', ' ') + '"}')
      }
    } elseif ($ruta -eq "/api/juegos" -and $metodo -eq "GET") {
      EnviarJson $ctx 200 (LeerJuegosJson)
    } elseif ($ruta -eq "/api/juegos" -and $metodo -eq "PUT") {
      $lector = New-Object System.IO.StreamReader($ctx.Request.InputStream, $utf8)
      $cuerpo = $lector.ReadToEnd()
      $datos = $cuerpo | ConvertFrom-Json
      if ($null -eq $datos.juegos) { throw "falta la lista juegos" }
      if (Test-Path $fichero) { Copy-Item $fichero ($fichero + ".bak") -Force }
      [System.IO.File]::WriteAllText($fichero, $cabecera + $prefijo + $cuerpo + ";`n", $utf8)
      EnviarJson $ctx 200 '{"ok":true}'
    } elseif ($metodo -eq "GET") {
      $rel = [System.Uri]::UnescapeDataString($ruta).TrimStart("/").Replace("/", "\")
      $archivo = [System.IO.Path]::GetFullPath((Join-Path $raiz $rel))
      if ($archivo.StartsWith($raiz) -and (Test-Path $archivo -PathType Leaf)) {
        $ext = [System.IO.Path]::GetExtension($archivo).ToLower()
        $tipo = if ($tipos.ContainsKey($ext)) { $tipos[$ext] } else { "application/octet-stream" }
        Enviar $ctx 200 $tipo ([System.IO.File]::ReadAllBytes($archivo))
      } else { EnviarJson $ctx 404 '{"error":"no existe"}' }
    } else { EnviarJson $ctx 405 '{"error":"metodo no permitido"}' }
  } catch {
    try { EnviarJson $ctx 500 ('{"error":"' + ($_.Exception.Message -replace '[\\"\r\n]', ' ') + '"}') } catch { }
  }
}
