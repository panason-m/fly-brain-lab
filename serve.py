"""Local server for Fly Brain Lab.

    python serve.py          ->  http://localhost:8000

Serves the app (dist/) and the full-connectome arena (arena/). The arena shares one
connectome between worker threads, which needs cross-origin isolation, so /arena/ is
served with COOP/COEP headers.
"""
import http.server, os, sys, webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript',
                      '.wasm': 'application/wasm', '.json': 'application/json'}

    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_GET(self):
        if self.path in ('/', '/index.html'):
            self.send_response(302); self.send_header('Location', '/dist/index.html'); self.end_headers(); return
        super().do_GET()

    def end_headers(self):
        if self.path.startswith('/arena/'):
            self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
            self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
            self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, *a):
        pass

if __name__ == '__main__':
    url = f'http://localhost:{PORT}/dist/index.html'
    print(f'Fly Brain Lab running at {url}  (arena: http://localhost:{PORT}/arena/arena.html)\nPress Ctrl+C to stop.')
    try: webbrowser.open(url)
    except Exception: pass
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
