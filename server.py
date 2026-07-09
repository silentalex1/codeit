from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

PORT = 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print(f"Starting PrysmisAI Website Server...")
print(f"Open http://localhost:{PORT} in your browser")
print(f"Press Ctrl+C to stop")

server = HTTPServer(('localhost', PORT), CORSRequestHandler)
server.serve_forever()