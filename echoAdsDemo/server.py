#!/usr/bin/env python3
"""
Simple server for Echo Ads Demo that can save creatives.json
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
from urllib.parse import urlparse

class SaveHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Handle POST requests to save creatives"""
        if self.path == '/test-creatives/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                creatives = data.get('creatives', [])
                
                # Save to creatives.json
                json_path = os.path.join(os.path.dirname(__file__), 'test-creatives', 'creatives.json')
                with open(json_path, 'w') as f:
                    json.dump(creatives, f, indent=2)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'message': 'Creatives saved successfully'}).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        """Serve static files"""
        # Map paths to files
        if self.path == '/' or self.path == '/index.html':
            file_path = os.path.join(os.path.dirname(__file__), 'index.html')
        elif self.path.startswith('/test-creatives/'):
            # Serve JSON files from test-creatives directory
            filename = os.path.basename(self.path)
            file_path = os.path.join(os.path.dirname(__file__), 'test-creatives', filename)
        elif self.path.startswith('/creatives/'):
            # Serve files from creatives directory
            filename = os.path.basename(self.path)
            file_path = os.path.join(os.path.dirname(__file__), 'creatives', filename)
        elif self.path == '/prebid.js':
            file_path = os.path.join(os.path.dirname(__file__), 'prebid.js')
        else:
            # Try to serve other files
            file_path = os.path.join(os.path.dirname(__file__), self.path.lstrip('/'))
        
        try:
            if os.path.isfile(file_path):
                with open(file_path, 'rb') as f:
                    content = f.read()
                
                self.send_response(200)
                # Set appropriate content type
                if file_path.endswith('.html'):
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                elif file_path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript')
                elif file_path.endswith('.json'):
                    self.send_header('Content-Type', 'application/json')
                elif file_path.endswith('.png'):
                    self.send_header('Content-Type', 'image/png')
                elif file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
                    self.send_header('Content-Type', 'image/jpeg')
                else:
                    self.send_header('Content-Type', 'application/octet-stream')
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'File not found')
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(f'Server error: {str(e)}'.encode())

    def log_message(self, format, *args):
        """Override to customize log format"""
        print(f"[{self.log_date_time_string()}] {format % args}")

if __name__ == '__main__':
    port = 8080
    server = HTTPServer(('', port), SaveHandler)
    print(f'🚀 Echo Ads Demo Server running on http://localhost:{port}')
    print(f'📝 Save endpoint: http://localhost:{port}/test-creatives/save')
    print(f'📄 Open http://localhost:{port} in your browser')
    print('Press Ctrl+C to stop the server')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n👋 Server stopped')
        server.server_close()

