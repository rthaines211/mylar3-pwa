#!/bin/bash

# Mylar3 PWA Server Startup Script
# This script starts all the necessary servers for the Mylar3 PWA

echo "🚀 Starting Mylar3 PWA Servers..."
echo "================================"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use"
        return 1
    else
        return 0
    fi
}

# Function to start a server in the background
start_server() {
    local name=$1
    local command=$2
    local port=$3
    local log_file=$4
    
    if check_port $port; then
        echo "🔧 Starting $name on port $port..."
        eval "$command" > "$log_file" 2>&1 &
        local pid=$!
        local pid_file=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/-/_/g').pid
        echo "$pid" > "$pid_file"
        echo "   ✅ $name started (PID: $pid)"
        sleep 2
    else
        echo "   ❌ Cannot start $name - port $port in use"
    fi
}

# Kill any existing servers
echo "🧹 Cleaning up existing servers..."
pkill -f "cors_server.py" 2>/dev/null || true
pkill -f "mobile_server.py" 2>/dev/null || true
pkill -f "mylar-pull-proxy" 2>/dev/null || true
rm -f *.pid 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

# Start CORS Server (Database access - port 8002) from the live database directory
echo "🔧 Starting CORS-Server on port 8002..."
original_dir=$(pwd)
cd "/Volumes/Comics/Mylar3Config/mylar/mylar"
if check_port 8002; then
    python3 "$original_dir/cors_server.py" 8002 > "$original_dir/cors_server.log" 2>&1 &
    cors_pid=$!
    echo "$cors_pid" > "$original_dir/cors_server.pid"
    echo "   ✅ CORS-Server started (PID: $cors_pid)"
    sleep 2
else
    echo "   ❌ Cannot start CORS-Server - port 8002 in use"
fi
cd "$original_dir"

# Start Mobile Proxy Server (PWA files + API proxy - port 8888)  
start_server "Mobile-Server" "python3 mobile_server.py" 8888 "mobile_server.log"

# Start Node.js Pull Proxy (Additional proxy - port 8091)
if [ -d "mylar-pull-proxy" ]; then
    echo "🔧 Starting Node.js Pull Proxy on port 8091..."
    cd mylar-pull-proxy
    if [ ! -d "node_modules" ]; then
        echo "   📦 Installing Node.js dependencies..."
        npm install
    fi
    start_server "Pull-Proxy" "npm start" 8091 "../pull_proxy.log"
    cd ..
fi

echo ""
echo "🎉 All servers started!"
echo "================================"
echo "📱 PWA Access URLs:"
echo "   Local:    http://localhost:8888"
echo "   Network:  http://$(ifconfig | grep -E 'inet.*broadcast' | awk '{print $2}' | head -1):8888"
echo ""
echo "🔧 Server Status:"
echo "   CORS Server:    http://localhost:8002 (Database access)"
echo "   Mobile Server:  http://localhost:8888 (PWA + API proxy)"
echo "   Pull Proxy:     http://localhost:8091 (Additional proxy)"
echo ""
echo "📋 Server Management:"
echo "   View logs:      tail -f *.log"
echo "   Stop servers:   ./stop_servers.sh"
echo "   Check status:   ./check_servers.sh"
echo ""
echo "💡 Open http://localhost:8888 in your browser to use the PWA!"
