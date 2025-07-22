#!/bin/bash

# Mylar3 PWA Server Status Check Script
echo "📊 Mylar3 PWA Server Status"
echo "=========================="

# Function to check server status
check_server() {
    local name=$1
    local port=$2
    local pid_file=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/-/_/g').pid
    
    echo -n "🔧 $name (port $port): "
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo "✅ Running (PID: $pid)"
            else
                echo "⚠️  Process exists but port not listening"
            fi
        else
            echo "❌ Not running (stale PID file)"
            rm -f "$pid_file"
        fi
    else
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "⚠️  Port in use (unknown process)"
        else
            echo "❌ Not running"
        fi
    fi
}

# Check each server
check_server "CORS-Server" 8002
check_server "Mobile-Server" 8888
check_server "Pull-Proxy" 8091

echo ""
echo "🌐 Network Information:"
echo "   Local IP: $(ifconfig | grep -E 'inet.*broadcast' | awk '{print $2}' | head -1)"
echo "   PWA URL:  http://$(ifconfig | grep -E 'inet.*broadcast' | awk '{print $2}' | head -1):8888"

echo ""
echo "📋 Recent Log Activity:"
if [ -f "mobile_server.log" ]; then
    echo "   Mobile Server (last 3 lines):"
    tail -3 mobile_server.log | sed 's/^/     /'
fi

if [ -f "cors_server.log" ]; then
    echo "   CORS Server (last 3 lines):"
    tail -3 cors_server.log | sed 's/^/     /'
fi
