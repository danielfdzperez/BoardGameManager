"""Servidor local de 'Mis juegos de mesa' (solo librería estándar de Python).
Sirve la web y permite que crear.html guarde los juegos DIRECTAMENTE en data/juegos.js.
Uso: python servidor.py   (o doble clic en iniciar.bat)  ->  http://localhost:8080/web/index.html"""
import json, os, shutil, sys, tempfile, urllib.error, urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # raíz del proyecto (este script vive en serverTest/)
FICHERO = os.path.join(RAIZ, "data", "juegos.js")
PREFIJO = "window.DATOS_JUEGOS = "
CABECERA = ("/* FUENTE DE DATOS de los juegos (única). Formato: window.DATOS_JUEGOS = { version, actualizado, fuente, juegos: [...] };\n"
            "   Solo lo lee js/datos/repositorio-js.js (y servidor.py). Esquema en IADocs/datos-juegos.md */\n")

def leer():
    with open(FICHERO, encoding="utf-8") as f:
        t = f.read()
    i = t.index("\n" + PREFIJO) + 1 + len(PREFIJO)   # la cabecera también menciona el prefijo: usar el del inicio de línea
    return json.loads(t[i:].strip().rstrip(";"))

def escribir(datos):
    if os.path.exists(FICHERO):
        shutil.copyfile(FICHERO, FICHERO + ".bak")
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(FICHERO), suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(CABECERA + PREFIJO + json.dumps(datos, ensure_ascii=False, indent=2) + ";\n")
    os.replace(tmp, FICHERO)

class Manejador(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RAIZ, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, codigo, obj):
        cuerpo = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/estado":
            return self._json(200, {"ok": True, "escritura": True})
        ruta, _, consulta = self.path.partition("?")
        if ruta in ("/api/bgg/geekitems", "/api/bgg/dynamicinfo"):   # proxy a BGG (api.geekdo.com no manda CORS)
            try:
                peticion = urllib.request.Request("https://api.geekdo.com/api/" + ruta.rsplit("/", 1)[1] + "?" + consulta,
                                                  headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(peticion, timeout=15) as r:
                    return self._json(r.status, json.loads(r.read().decode("utf-8")))
            except urllib.error.HTTPError as e:
                return self._json(e.code, {"error": str(e)})
            except Exception as e:
                return self._json(502, {"error": str(e)})
        if self.path.split("?")[0] == "/api/juegos":
            try: return self._json(200, leer())
            except Exception as e: return self._json(500, {"error": str(e)})
        return super().do_GET()

    def do_PUT(self):
        if self.path.split("?")[0] != "/api/juegos":
            return self._json(404, {"error": "no existe"})
        try:
            n = int(self.headers.get("Content-Length", 0))
            datos = json.loads(self.rfile.read(n).decode("utf-8"))
            if not isinstance(datos.get("juegos"), list): raise ValueError("falta la lista 'juegos'")
            escribir(datos)
            return self._json(200, {"ok": True})
        except Exception as e:
            return self._json(400, {"error": str(e)})

    def log_message(self, fmt, *args):
        pass

if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print("Mis juegos de mesa -> http://localhost:%d/web/index.html  (Ctrl+C para parar)" % puerto)
    ThreadingHTTPServer(("127.0.0.1", puerto), Manejador).serve_forever()
