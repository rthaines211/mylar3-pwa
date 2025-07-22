# Mylar3 PWA

A Progressive Web App (PWA) for [Mylar3](https://github.com/mylar3/mylar3) comic book management. This mobile-friendly web application allows you to manage your comic library, search for new comics, view pull lists, and track reading history.

## Features

- 📱 **Mobile-optimized** - Works great on phones and tablets
- 🔍 **Comic Search** - Search and add comics using ComicVine API
- 📚 **Library Management** - Browse your comic collection
- 📅 **Pull List** - View upcoming releases
- 📈 **Reading History** - Track your reading progress
- 🌙 **Dark/Light Theme** - Customizable appearance
- � **Auto-refresh** - Keep data up-to-date automatically
- ⚙️ **Configurable** - Set up for any Mylar3 instance

## Quick Setup

### Option 1: Use with Existing Mylar3 Instance

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/yourusername/mylar3-pwa.git
   cd mylar3-pwa
   ```

2. **Host the files** on any web server (Apache, Nginx, or simple HTTP server)

3. **Open the PWA** in your browser

4. **Go to Settings** and configure:
   - Your Mylar3 server URL (e.g., `http://192.168.1.100:8090`)
   - Your Mylar3 API key (found in Mylar3 → Settings → Web Interface)
   - Your ComicVine API key (get free at [ComicVine API](https://comicvine.gamespot.com/api/))

### Option 2: Development Setup with Local Servers

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/mylar3-pwa.git
   cd mylar3-pwa
   ```

2. **Start the development servers**:
   ```bash
   chmod +x start_servers.sh
   ./start_servers.sh
   ```

3. **Open in browser**: http://localhost:8888

4. **Configure in Settings** with your API keys

## Configuration

### Getting Your API Keys

#### Mylar3 API Key
1. Open your Mylar3 web interface
2. Go to Settings → Web Interface
3. Enable "API" if not already enabled
4. Copy the API Key value

#### ComicVine API Key
1. Visit [ComicVine API](https://comicvine.gamespot.com/api/)
2. Sign up for a free account
3. Request an API key
4. Wait for approval (usually instant)

### Setting Up the PWA

1. **Open the PWA** in your browser
2. **Go to Settings** (gear icon in top-right)
3. **Configure Instance Settings**:
   - **Mylar3 Server URL**: Your Mylar3 server address (e.g., `http://192.168.1.100:8090`)
   - **Mylar3 API Key**: The API key from your Mylar3 settings
   - **ComicVine API Key**: Your ComicVine API key
4. **Test Connection** to verify settings work
5. **Save Configuration** - settings are stored locally in your browser

### Instance Configuration Examples

**Local Development:**
- Server URL: `http://localhost:8090`
- Use the included proxy servers for CORS handling

**Home Network:**
- Server URL: `http://192.168.1.100:8090` (replace with your Mylar3 server IP)
- Ensure Mylar3 is accessible from your network

**Remote Access:**
- Server URL: `https://mylar.yourdomain.com`
- Ensure HTTPS is configured for PWA functionality

## Installation as PWA

### On Mobile (iOS/Android)

**iOS Safari:**
1. Open the PWA in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Name your app and tap "Add"

**Android Chrome:**
1. Open the PWA in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen"
4. Confirm installation

### On Desktop

**Chrome/Edge:**
1. Look for the install icon in the address bar
2. Click to install as a desktop app
3. Or use menu → "Install Mylar3 PWA..."

## Features Guide

### Library Page (index.html)
- Browse your complete comic collection
- View cover art and metadata
- Search and filter functionality
- Auto-refresh every 15 minutes (configurable)

### Add Comics (add.html)
- Search ComicVine database for new comics
- View detailed comic information
- Add series directly to your Mylar3 collection
- Advanced search filters

### Pull List (Pull-list.html)
- View weekly upcoming releases
- See what's coming out this week
- Mark issues as wanted/unwanted
- Direct integration with Mylar3 pull list

### Reading History (history.html)
- Track your reading progress
- View recently read issues
- Search through reading history
- Mark issues as read/unread

### Settings (settings.html)
- Configure your Mylar3 instance
- Set API keys
- Choose themes (dark/light)
- Enable/disable auto-refresh
- Test connection to your servers

## File Structure

```
mylar3-pwa/
├── index.html          # Library/Home page
├── add.html           # Search and add comics
├── Pull-list.html     # Weekly pull list
├── history.html       # Reading history
├── settings.html      # Configuration and settings
├── config.js          # Configuration management
├── theme-manager.js   # Theme switching
├── pwa-utils.js       # PWA utilities
├── themes.css         # Theme definitions
├── manifest.json      # PWA manifest
├── sw.js             # Service worker
├── start_servers.sh   # Development server script
├── mobile_server.py   # Mobile proxy server
├── cors_server.py     # CORS proxy server
└── README.md         # This file
```

## Development

### Requirements

- Python 3.x (for development servers)
- Web server (for production)
- Mylar3 instance with API enabled
- ComicVine API key

### Local Development

1. **Start development servers**:
   ```bash
   ./start_servers.sh
   ```
   This starts:
   - CORS server on port 8002 (for database access)
   - Mobile server on port 8888 (serves PWA files)

2. **Access the application**:
   - Local: http://localhost:8888
   - Network: http://[your-ip]:8888

3. **Stop servers**:
   ```bash
   ./stop_servers.sh
   ```

### Production Deployment

1. **Host the files** on any web server (Apache, Nginx, etc.)
2. **Configure HTTPS** (required for full PWA features)
3. **Set up your instance** in the Settings page
4. **Test PWA functionality** and installation

## Troubleshooting

### Connection Issues

**"Cannot connect to Mylar3":**
1. Verify Mylar3 is running and accessible
2. Check the server URL in settings
3. Ensure API is enabled in Mylar3
4. Verify the API key is correct
5. Test the URL in a browser: `http://your-server:8090/api?cmd=getIndex&apikey=YOUR_KEY`

**CORS Errors:**
1. Use the development proxy servers: `./start_servers.sh`
2. Configure your web server to allow CORS
3. Host PWA and Mylar3 on the same domain

### PWA Installation Issues

**Cannot install as PWA:**
1. Ensure the site is served over HTTPS (required for PWA)
2. Check that `manifest.json` is accessible
3. Verify service worker registration in browser dev tools
4. Clear browser cache and try again

### API Issues

**ComicVine search not working:**
1. Verify your ComicVine API key is valid
2. Check for rate limiting (ComicVine limits requests)
3. Test API key: `https://comicvine.gamespot.com/api/search/?api_key=YOUR_KEY&format=json&query=batman`

**Data not loading:**
1. Check browser console for errors
2. Verify API endpoints are accessible
3. Test connection in Settings page
4. Check Mylar3 logs for API request errors

### Configuration Issues

**Settings not saving:**
1. Check browser localStorage support
2. Ensure you're not in private/incognito mode
3. Clear browser data and reconfigure

**Auto-refresh not working:**
1. Check if auto-refresh is enabled in Settings
2. Verify the page is active (auto-refresh pauses on inactive tabs)
3. Check browser console for errors

## Browser Support

- **Chrome** 70+ (full PWA support)
- **Firefox** 65+ (good support, limited PWA)
- **Safari** 12+ (iOS/macOS PWA support)
- **Edge** 79+ (full PWA support)

## Security Considerations

- API keys are stored locally in browser localStorage
- All communication uses standard HTTP/HTTPS
- No sensitive data is transmitted beyond API keys
- Consider HTTPS for production deployments
- ComicVine API key is safe to use client-side

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly with your Mylar3 instance
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Test on both mobile and desktop
- Verify PWA functionality
- Check theme compatibility (dark/light)
- Test with different Mylar3 configurations
- Ensure CORS handling works correctly

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- **Mylar3**: [https://github.com/mylar3/mylar3](https://github.com/mylar3/mylar3)
- **ComicVine API**: [https://comicvine.gamespot.com/api/](https://comicvine.gamespot.com/api/)
- **Tailwind CSS**: [https://tailwindcss.com/](https://tailwindcss.com/)

## Support

For issues and questions:

1. **Check the [Issues](https://github.com/yourusername/mylar3-pwa/issues)** page first
2. **Create a new issue** with:
   - Browser and version
   - Operating system
   - Mylar3 version
   - Steps to reproduce the problem
   - Error messages (check browser console)
3. **Include configuration details** (without API keys)

### Common Questions

**Q: Can I use this with multiple Mylar3 instances?**
A: Currently, the PWA is configured for one instance at a time. You can change the configuration in Settings.

**Q: Does this work offline?**
A: Yes! Once installed as a PWA, the app works offline. However, data sync requires an internet connection.

**Q: Is this officially supported by Mylar3?**
A: This is an unofficial PWA. For official Mylar3 support, visit the [Mylar3 repository](https://github.com/mylar3/mylar3).

**Q: Can I contribute new features?**
A: Absolutely! See the Contributing section above.

---

**Note**: This is an unofficial PWA for Mylar3. For official Mylar3 support and documentation, please visit the [official Mylar3 repository](https://github.com/mylar3/mylar3).
