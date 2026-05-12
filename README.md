# TakeVid 1.0 🎥

A professional Chrome/Edge extension for downloading videos from YouTube, TikTok, Facebook, and Instagram in high quality.

![Version](https://img.shields.io/badge/version-1.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Manifest](https://img.shields.io/badge/manifest-v3-orange)

## ✨ Features

### Core Functionality
- 📥 **Multi-Platform Support:** YouTube, TikTok, Facebook, Instagram
- 🎬 **Quality Options:** 4K, 1440p, 1080p, 720p, 480p, 360p
- 🎵 **Audio Extraction:** Download as MP3 audio
- 📊 **Format Detection:** Automatic best quality selection
- 📜 **Download History:** Keep track of your downloads locally

### Privacy & Security
- 🔒 **Privacy-First:** Explicit consent required, no tracking
- 🛡️ **Secure:** HTTPS-only, validated URLs, no data selling
- ⚙️ **Configurable:** Control cookie sending and history saving
- 📝 **Transparent:** Full privacy policy included

### User Experience
- 🎨 **Modern UI:** Beautiful glassmorphism design with smooth animations
- 🌙 **Dark Theme:** Easy on the eyes
- ⚡ **Fast:** Optimized performance with smart caching
- 🔄 **Auto-Detection:** Pulls video URL from active tab

## 🚀 Installation

### From Source (Developer Mode)

1. **Clone or Download** this repository
2. **Open Chrome/Edge** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

### Backend Setup

The extension requires a backend server. Two options:

#### Option A: Use Existing Hosted Server (Recommended)
- Default server is pre-configured at `https://takevid-server.onrender.com`
- No setup needed, just install the extension

#### Option B: Self-Host Backend

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. (Optional) Setup Redis for multi-worker support:
```bash
# Install Redis
# Ubuntu/Debian: sudo apt install redis-server
# macOS: brew install redis

# Start Redis
redis-server
```

3. Run the Flask backend:
```bash
# Development
python app.py

# Production with Gunicorn
gunicorn app:app --workers 4 --bind 0.0.0.0:5000
```

4. Update extension settings:
   - Right-click extension icon → Options
   - Change "Server URL" to your backend URL
   - Save settings

## 📖 Usage

### Basic Download

1. **Open a video** on YouTube, TikTok, Facebook, or Instagram
2. **Click the TakeVid icon** in your toolbar
3. The URL auto-fills (or paste manually)
4. **Click "Analyze Link"** to fetch available formats
5. **Select quality** from the dropdown
6. **Click "Download Now"** and your browser will start the download

### Settings

Access settings by:
- Right-clicking the extension icon → **Options**
- Or going to `chrome://extensions/` → TakeVid → **Options**

Available settings:
- **Send Cookies:** Enable/disable cookie sending (required for age-restricted videos)
- **Save History:** Toggle download history tracking
- **Default Quality:** Auto-select preferred quality (4K, 1080p, etc.)
- **Auto-Download Subtitles:** Include captions when available
- **Server URL:** Custom backend server endpoint

### Privacy Notice

On first use, you'll see a privacy notice explaining:
- What data is collected (cookies, URLs, history)
- Why it's needed (to bypass platform restrictions)
- How it's used (temporarily, not stored or sold)
- Your rights (disable cookies, clear history, uninstall)

## 🔒 Privacy & Security

### What We Collect
- ✅ Essential cookies (YouTube/TikTok session tokens) - only when needed
- ✅ Video URLs you paste
- ✅ Download history (stored locally on your device)

### What We DON'T Collect
- ❌ Personal identity or email
- ❌ Browsing history outside the extension
- ❌ Passwords
- ❌ Analytics or tracking data

### Security Measures
- URL validation to prevent malicious inputs
- HTTPS-only communication
- Cookies deleted immediately after processing
- No third-party tracking scripts
- Open-source code for transparency

**Full Privacy Policy:** See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)

## ⚖️ Legal Disclaimer

**Important:** Downloading videos may violate the Terms of Service of YouTube, TikTok, Facebook, and Instagram. This extension is intended for:
- Personal use
- Educational purposes
- Fair use cases (commentary, criticism, research)
- Content you own or have permission to download

**You are responsible for:**
- Complying with copyright laws in your jurisdiction
- Respecting platform Terms of Service
- Respecting content creators' rights

We are not liable for any misuse of this extension.

## 🛠️ Technical Details

### Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Popup UI  │────────▶│   Background │────────▶│   Backend   │
│  (popup.js) │         │(background.js)│         │   (Flask)   │
└─────────────┘         └──────────────┘         └─────────────┘
      │                                                  │
      │                                                  │
      ▼                                                  ▼
┌─────────────┐                                  ┌─────────────┐
│   Storage   │                                  │   yt-dlp    │
│  (Local)    │                                  │  (Extractor)│
└─────────────┘                                  └─────────────┘
```

### Tech Stack

**Frontend (Extension):**
- Manifest V3 (Chrome Extension API)
- Vanilla JavaScript (no frameworks)
- CSS with glassmorphism design
- Chrome Storage API for settings/history

**Backend (Server):**
- Python 3.11+
- Flask + Flask-CORS
- yt-dlp (video extractor)
- Gunicorn (production server)
- Redis (optional, for multi-worker support)
- FFmpeg (for format merging)

### Permissions Explained

| Permission | Purpose | Required? |
|------------|---------|-----------|
| `activeTab` | Access current tab URL | ✅ Yes |
| `scripting` | Inject content scripts (TikTok feed detection) | ✅ Yes |
| `downloads` | Trigger browser downloads | ✅ Yes |
| `cookies` | Access cookies for auth | ⚠️ Optional (disable in settings) |
| `storage` | Save settings and history | ✅ Yes |

**Removed permissions:**
- ~~`clipboardRead`~~ - Not needed (deprecated API removed)

## 🐛 Known Issues

1. **TikTok Feed Detection:** May not work on all TikTok feed layouts (SPA dynamic rendering)
2. **Geo-Blocked Videos:** Some videos restricted by region may fail
3. **Rate Limiting:** Excessive requests may trigger platform rate limits
4. **4K/8K Videos:** Very large files may timeout (increase server timeout if self-hosting)

## 🗺️ Roadmap

### Short-term (v1.1.0)
- [ ] Subtitle download support (SRT, VTT)
- [ ] Batch download (multiple URLs)
- [ ] Internationalization (Arabic, Spanish, French)
- [ ] Right-click context menu integration

### Medium-term (v1.2.0)
- [ ] Instagram Reels support
- [ ] Twitter/X video support
- [ ] Download queue management
- [ ] Progress tracking with real percentages

### Long-term (v2.0.0)
- [ ] Firefox Add-on port
- [ ] Native Messaging for local yt-dlp (no backend needed)
- [ ] Video trimming/clipping
- [ ] Format conversion (MP4, WebM, etc.)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The incredible video extraction library
- [FFmpeg](https://ffmpeg.org/) - For video/audio processing
- Chrome Extension team for Manifest V3 documentation

## 📞 Support

- 🐛 **Bug Reports:** Open an issue on GitHub
- 💡 **Feature Requests:** Open an issue with "enhancement" label
- 📧 **Contact:** [Your support email]

---

**Made with ❤️ for the community**

**Star ⭐ this repo if you find it useful!**
