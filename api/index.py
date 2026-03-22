from http.server import BaseHTTPRequestHandler
import json
import sys

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        data = {"status": "ok", "python": sys.version, "path": self.path}
        self.wfile.write(json.dumps(data).encode())
