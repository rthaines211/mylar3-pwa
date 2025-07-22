#!/usr/bin/env python3
"""
Mobile-friendly HTTP server with reverse proxy for Mylar3 PWA
Forwards API requests to the appropriate backend servers
Includes compression support for better mobile performance
"""
import http.server
import socketserver
import urllib.request
import sys
import os
import gzip
import io
import json
import subprocess
import signal
from urllib.error import URLError

# Configuration
import json
import os

PORT = 8888
CONFIG_FILE = 'mylar_config.json'

def load_config():
    """Load configuration from file"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading config: {e}")
    # Return empty config if no config file exists
    return {'cors_url': 'http://localhost:8002'}

def save_config(config):
    """Save configuration to file"""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False

# Load initial config
config = load_config()

def get_cors_server_url():
    """Get the CORS server URL from config"""
    return config.get('cors_url', 'http://localhost:8002')

def get_mylar_server_url():
    """Get the Mylar3 server URL from config"""
    if 'mylar_url' not in config or not config['mylar_url']:
        raise ValueError("Mylar3 server URL not configured. Please set it in the settings page.")
    return config['mylar_url']

def update_proxy_routes():
    """Update proxy routes based on current config"""
    routes = {}
    cors_url = get_cors_server_url()
    
    try:
        mylar_url = get_mylar_server_url()
        # Only add Mylar routes if URL is configured
        routes.update({
            "/proxy/api/mylar": f"{mylar_url}/api/mylar",
            "/api/mylar": f"{mylar_url}/api/mylar",
            "/proxy/api": f"{mylar_url}/api"
        })
    except ValueError:
        # Mylar URL not configured yet, only add CORS route
        pass
        
    # Always add CORS route if available
    if cors_url:
        routes["/mylar.db"] = f"{cors_url}/mylar.db"
        
    return routes

# Initial proxy routes
PROXY_ROUTES = update_proxy_routes()

class ProxyRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests for configuration updates"""
        if self.path == '/api/update_config':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                if 'mylar_url' in data:
                    # Update config
                    global config, PROXY_ROUTES
                    config['mylar_url'] = data['mylar_url'].rstrip('/')
                    if 'cors_url' in data:
                        config['cors_url'] = data['cors_url'].rstrip('/')
                    
                    # Save config
                    if save_config(config):
                        # Update proxy routes
                        PROXY_ROUTES = update_proxy_routes()
                        self.send_response(200)
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
                        return
                
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': 'Invalid request'}).encode('utf-8'))
                
            except Exception as e:
                print(f"Error updating config: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def stop_cors_server(self):
        """Stop the CORS server using its PID file"""
        try:
            if os.path.exists('cors_server.pid'):
                with open('cors_server.pid', 'r') as f:
                    pid = int(f.read().strip())
                os.kill(pid, signal.SIGTERM)
                os.remove('cors_server.pid')
                return True
        except (ValueError, ProcessLookupError, OSError) as e:
            print(f"Error stopping CORS server: {e}")
        return False
    
    def start_cors_server(self, database_path=None):
        """Start the CORS server with optional database path"""
        try:
            # Default database path
            if not database_path:
                database_path = "/Volumes/Comics/Mylar3Config/mylar/mylar"
            
            print(f"Starting CORS server with database path: {database_path}")
            
            # Check if database path exists
            if not os.path.exists(database_path):
                print(f"Warning: Database path does not exist: {database_path}")
                return False
            
            # Change to the database directory
            original_dir = os.getcwd()
            os.chdir(database_path)
            print(f"Changed to directory: {os.getcwd()}")
            
            # Start the CORS server
            process = subprocess.Popen(
                ["python3", f"{original_dir}/cors_server.py", "8002"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait a moment to see if the process starts successfully
            import time
            time.sleep(0.5)
            
            # Check if process is still running
            if process.poll() is not None:
                # Process has already terminated
                stdout, stderr = process.communicate()
                print(f"CORS server failed to start. Return code: {process.returncode}")
                print(f"STDOUT: {stdout.decode()}")
                print(f"STDERR: {stderr.decode()}")
                os.chdir(original_dir)
                return False
            
            # Save PID
            with open(f"{original_dir}/cors_server.pid", 'w') as f:
                f.write(str(process.pid))
            
            print(f"CORS server started successfully with PID: {process.pid}")
            os.chdir(original_dir)
            return True
        except Exception as e:
            print(f"Error starting CORS server: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def do_POST(self):
        """Handle POST requests for server management"""
        if self.path == '/api/stop-cors-server':
            success = self.stop_cors_server()
            self.send_response(200 if success else 500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = json.dumps({'success': success})
            self.wfile.write(response.encode())
            return
        
        elif self.path == '/api/start-cors-server':
            # Read request body for database path
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            database_path = None
            if post_data:
                try:
                    data = json.loads(post_data.decode())
                    database_path = data.get('databasePath')
                except json.JSONDecodeError:
                    pass
            
            success = self.start_cors_server(database_path)
            self.send_response(200 if success else 500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = json.dumps({'success': success})
            self.wfile.write(response.encode())
            return
        
        # Handle OPTIONS for CORS preflight
        elif self.path.startswith('/api/'):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            return
        
        # Default POST handler
        self.send_response(404)
        self.end_headers()
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def can_compress(self, content_type):
        """Check if content type should be compressed"""
        compressible_types = [
            'text/html', 'text/css', 'text/javascript', 'application/javascript',
            'application/json', 'text/plain', 'application/xml', 'text/xml'
        ]
        return any(ct in content_type.lower() for ct in compressible_types)
    
    def should_compress_file(self, path):
        """Check if file should be compressed based on extension"""
        compressible_extensions = ['.html', '.css', '.js', '.json', '.xml', '.txt']
        return any(path.lower().endswith(ext) for ext in compressible_extensions)
    
    def compress_content(self, content):
        """Compress content using gzip"""
        buffer = io.BytesIO()
        with gzip.GzipFile(fileobj=buffer, mode='wb') as f:
            if isinstance(content, str):
                content = content.encode('utf-8')
            f.write(content)
        return buffer.getvalue()

    def do_GET(self):
        # Handle If-None-Match for database caching
        if self.path.startswith('/mylar.db'):
            client_etag = self.headers.get('If-None-Match')
            db_path = "mylar.db"
            if os.path.exists(db_path):
                mtime = os.path.getmtime(db_path)
                server_etag = f'"{int(mtime)}"'
                if client_etag == server_etag:
                    # Database hasn't changed, return 304 Not Modified
                    self.send_response(304)
                    self.send_header('ETag', server_etag)
                    self.end_headers()
                    return
        
        # Check if the path should be proxied
        for prefix, target_base in PROXY_ROUTES.items():
            if self.path.startswith(prefix):
                # Get the full target URL by replacing the prefix with the target base
                query = self.path[len(prefix):] if len(self.path) > len(prefix) else ""
                target_url = f"{target_base}{query}"
                print(f"Proxying: {self.path} -> {target_url}")
                
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        # Forward the request to the target
                        response = urllib.request.urlopen(target_url)
                        # Send the response back to the client
                        self.send_response(response.status)
                        # Add headers from response, but skip problematic headers
                        for header, value in response.getheaders():
                            if header.lower() not in ('transfer-encoding', 'connection', 'content-length', 'content-encoding', 'access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers'):
                                self.send_header(header, value)
                        # Add CORS headers and compression support
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.send_header('Permissions-Policy', 'browsing-topics=()')  # Fix browsing-topics warning
                        # Add cache headers for database files to enable ETags
                        if self.path.endswith('.db'):
                            try:
                                db_path = "mylar.db"  # Local database file
                                if os.path.exists(db_path):
                                    mtime = os.path.getmtime(db_path)
                                    etag = f'"{int(mtime)}"'
                                    self.send_header('ETag', etag)
                                    self.send_header('Cache-Control', 'public, max-age=0, must-revalidate')
                            except Exception:
                                pass
                        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                        # Read response content first
                        content = response.read()
                        # Check if we should compress
                        accept_encoding = self.headers.get('Accept-Encoding', '')
                        should_compress = ('gzip' in accept_encoding and (
                            self.can_compress(response.getheader('Content-Type', '')) or 
                            self.path.endswith('.db')  # Always compress database files
                        ))
                        if should_compress:
                            content = self.compress_content(content)
                            self.send_header('Content-Encoding', 'gzip')
                        # Set correct content length
                        self.send_header('Content-Length', str(len(content)))
                        self.end_headers()
                        self.wfile.write(content)
                        return
                    except URLError as e:
                        print(f"Proxy error for {target_url} (attempt {attempt+1}/{max_retries}): {e}")
                        if attempt < max_retries - 1:
                            import time
                            time.sleep(0.5)  # Wait before retrying
                        else:
                            print(f"Max retries reached for {target_url}. Falling back to static file serving.")
                            # If proxy fails after retries, continue with normal processing
                            # This allows fallback to static files if APIs are down
                            break
                # If all retries fail, fall through to static file serving below
        
        return http.server.SimpleHTTPRequestHandler.do_GET(self)
    
    def do_OPTIONS(self):
        """Handle preflight OPTIONS requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Permissions-Policy', 'browsing-topics=()')  # Fix browsing-topics warning
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == "__main__":
    # Use command line port if provided
    if len(sys.argv) > 1:
        PORT = int(sys.argv[1])

    # Bind to all interfaces for mobile access
    with socketserver.TCPServer(("0.0.0.0", PORT), ProxyRequestHandler) as httpd:
        print(f"Mobile-friendly server running at:")
        print(f"- Local: http://localhost:{PORT}")
        print(f"- Network: http://192.168.86.24:{PORT}")
        print(f"Serving files from: {os.getcwd()}")
        print(f"API requests will be proxied to backend servers")
        print("Press Ctrl+C to stop")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")
