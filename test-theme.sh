#!/bin/bash

# Test theme switching functionality
echo "Testing Mylar3 PWA Theme System"
echo "================================"

echo "1. Testing theme CSS variables..."
if grep -q "data-theme.*light" /Users/ryanhaines/Projects/mylar3-pwa/themes.css; then
    echo "✅ Light theme CSS definitions found"
else
    echo "❌ Light theme CSS definitions missing"
fi

echo "2. Testing theme-manager.js..."
if grep -q "toggleTheme" /Users/ryanhaines/Projects/mylar3-pwa/theme-manager.js; then
    echo "✅ Theme toggle function found"
else
    echo "❌ Theme toggle function missing"
fi

echo "3. Testing theme switch in settings..."
if grep -q "theme-switch" /Users/ryanhaines/Projects/mylar3-pwa/settings.html; then
    echo "✅ Theme switch found in settings"
else
    echo "❌ Theme switch missing in settings"
fi

echo "4. Testing server availability..."
if curl -s http://localhost:8888/settings.html | grep -q "theme-switch"; then
    echo "✅ Theme switch accessible via server"
else
    echo "❌ Theme switch not accessible via server"
fi

echo ""
echo "Test completed! Try accessing:"
echo "http://localhost:8888/theme-test.html"
echo "http://localhost:8888/settings.html"
