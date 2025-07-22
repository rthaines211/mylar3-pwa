#!/usr/bin/env python3
"""
ComicVine API Proxy Server

This proxy server helps avoid CORS issues when making requests to ComicVine API
from the browser. Set up this server to enable ComicVine integration.

Usage:
1. Install dependencies: pip install flask requests
2. Get ComicVine API key from https://comicvine.gamespot.com/api/
3. Set your API key in the COMICVINE_API_KEY variable below
4. Run: python comicvine_proxy.py
5. The proxy will run on http://localhost:5000

Then update add.html to use performComicVineSearch instead of performMylarSearch
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
COMICVINE_API_KEY = 'YOUR_COMICVINE_API_KEY_HERE'  # Replace with your actual API key
COMICVINE_BASE_URL = 'https://comicvine.gamespot.com/api'
RATE_LIMIT_DELAY = 2  # Seconds between requests

# Rate limiting
last_request_time = 0

def rate_limit():
    global last_request_time
    current_time = time.time()
    time_since_last = current_time - last_request_time
    
    if time_since_last < RATE_LIMIT_DELAY:
        time.sleep(RATE_LIMIT_DELAY - time_since_last)
    
    last_request_time = time.time()

@app.route('/api/comicvine-proxy')
def comicvine_proxy():
    if COMICVINE_API_KEY == 'YOUR_COMICVINE_API_KEY_HERE':
        return jsonify({'error': 'ComicVine API key not configured'}), 500
    
    # Rate limiting
    rate_limit()
    
    # Get request parameters
    query_type = request.args.get('type', 'search')
    query = request.args.get('query', '')
    volume_id = request.args.get('volumeId', '')
    resources = request.args.get('resources', 'volume')
    field_list = request.args.get('field_list', '')
    limit = request.args.get('limit', '20')
    offset = request.args.get('offset', '0')
    sort = request.args.get('sort', '')
    
    try:
        if query_type == 'search':
            # Search for volumes/series
            url = f"{COMICVINE_BASE_URL}/search/"
            params = {
                'api_key': COMICVINE_API_KEY,
                'format': 'json',
                'query': query,
                'resources': resources,
                'limit': limit,
                'offset': offset
            }
            
        elif query_type == 'volume':
            # Get volume details
            url = f"{COMICVINE_BASE_URL}/volume/4050-{volume_id}/"
            params = {
                'api_key': COMICVINE_API_KEY,
                'format': 'json',
                'field_list': field_list
            }
            
        elif query_type == 'issues':
            # Get issues for a volume
            url = f"{COMICVINE_BASE_URL}/issues/"
            params = {
                'api_key': COMICVINE_API_KEY,
                'format': 'json',
                'filter': f'volume:{volume_id}',
                'field_list': field_list,
                'limit': limit,
                'offset': offset,
                'sort': sort
            }
            
        else:
            return jsonify({'error': 'Invalid query type'}), 400
        
        # Make request to ComicVine API
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        # Return the JSON response
        return jsonify(response.json())
        
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'ComicVine API error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Proxy error: {str(e)}'}), 500

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'service': 'comicvine-proxy'})

if __name__ == '__main__':
    print("Starting ComicVine Proxy Server...")
    print("Make sure to set your ComicVine API key in the COMICVINE_API_KEY variable")
    print("Server will run on http://localhost:5000")
    
    if COMICVINE_API_KEY == 'YOUR_COMICVINE_API_KEY_HERE':
        print("WARNING: ComicVine API key not configured!")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
