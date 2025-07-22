#!/usr/bin/env python3
"""
Simple HTTP server with CORS support for serving mylar.db
Usage: python3 cors_server.py [port] [directory]
"""
import http.server
import socketserver
import sys
import os

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests with CORS headers"""
        # Set CORS headers before calling parent
        self.send_response(200)
        
        # Get file info
        path = self.translate_path(self.path)
        if os.path.isfile(path):
            self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Content-Length', str(os.path.getsize(path)))
            self.send_header('Last-Modified', self.date_time_string(os.path.getmtime(path)))
        
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Pragma')
        self.end_headers()
        
        # Send file content
        if os.path.isfile(path):
            with open(path, 'rb') as f:
                self.wfile.write(f.read())
    
    def do_OPTIONS(self):
        """Handle preflight OPTIONS requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Pragma')
        self.end_headers()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8002
    directory = sys.argv[2] if len(sys.argv) > 2 else os.getcwd()
    
    os.chdir(directory)
    
    with socketserver.TCPServer(("0.0.0.0", port), CORSRequestHandler) as httpd:
        print(f"CORS-enabled server running at http://localhost:{port}")
        print(f"Also accessible from mobile devices at http://192.168.86.24:{port}")
        print(f"Serving files from: {os.getcwd()}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")
