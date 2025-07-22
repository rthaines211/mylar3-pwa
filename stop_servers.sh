#!/bin/bash

# Mylar3 PWA Server Stop Script
echo "🛑 Stopping Mylar3 PWA Servers..."

# Function to stop a server by PID file
stop_server() {
    local name=$1
    local pid_file=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/-/_/g').pid
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            echo "   🔧 Stopping $name (PID: $pid)..."
            kill $pid
            rm -f "$pid_file"
            echo "   ✅ $name stopped"
        else
            echo "   ⚠️  $name was not running"
            rm -f "$pid_file"
        fi
    else
        echo "   ❓ No PID file found for $name"
    fi
}

# Stop servers by PID files
stop_server "CORS-Server"
stop_server "Mobile-Server" 
stop_server "Pull-Proxy"

# Kill any remaining processes
echo "🧹 Cleaning up any remaining processes..."
pkill -f "cors_server.py" 2>/dev/null || true
pkill -f "mobile_server.py" 2>/dev/null || true
pkill -f "mylar-pull-proxy" 2>/dev/null || true

# Clean up log files if desired
read -p "🗑️  Delete log files? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f *.log
    echo "   ✅ Log files deleted"
fi

echo "✅ All servers stopped!"
