# Chrome Web Store Listing

## Extension Name
TakeVid - Video Downloader for YouTube & TikTok

## Short Description (132 characters max)
Download YouTube, TikTok, Facebook & Instagram videos in high quality. Privacy-first, no tracking, open source.

## Detailed Description (max 16,000 characters)

**TakeVid - Professional Video Downloader**

Download videos from YouTube, TikTok, Facebook, and Instagram in the highest quality available. TakeVid is a privacy-first, open-source extension that puts you in control.

**✨ KEY FEATURES:**

• **Multi-Platform Support**
  - YouTube (including Shorts)
  - TikTok
  - Facebook Videos
  - Instagram (Reels & Posts)

• **Quality Options**
  - 4K Ultra HD (2160p)
  - QHD (1440p)
  - Full HD (1080p)
  - HD (720p)
  - SD (480p, 360p)
  - Audio-only MP3 extraction

• **Privacy & Security**
  - No tracking or analytics
  - Data is never sold or shared
  - Explicit consent required
  - Full privacy policy included
  - Open-source code for transparency

• **User-Friendly Interface**
  - Modern, beautiful design
  - Auto-detects video URLs
  - One-click downloads
  - Download history tracking
  - Dark theme

• **Customization**
  - Set default quality preferences
  - Control cookie usage
  - Manage download history
  - Configure server endpoint

**🔒 PRIVACY COMMITMENT:**

We take your privacy seriously:
- ✅ Only essential data collected (cookies for video access)
- ✅ Data processed temporarily, never stored long-term
- ✅ No third-party tracking scripts
- ✅ Full control via settings
- ✅ Complete transparency

**⚖️ LEGAL NOTICE:**

This extension is for personal, educational, and fair-use purposes only. Users are responsible for complying with copyright laws and platform Terms of Service. Downloading content without permission may violate copyright.

**🛠️ HOW IT WORKS:**

1. Navigate to any supported video platform
2. Click the TakeVid icon (URL auto-fills)
3. Select your preferred quality
4. Click Download - that's it!

**💡 ADVANCED FEATURES:**

- Right-click context menu: "Download with TakeVid"
- Automatic subtitle embedding
- Download history with thumbnails
- Auto-retry on interrupted downloads
- Settings page for full customization

**🌟 WHY CHOOSE TAKEVID?**

- **No Ads**: Clean interface, no annoying advertisements
- **Fast**: Optimized for performance
- **Reliable**: Built with modern technology
- **Open Source**: Code available for review
- **Free Forever**: No premium tiers or hidden costs

**📱 SUPPORTED PLATFORMS:**

- YouTube (videos, Shorts, age-restricted)
- TikTok (videos, slideshows)
- Facebook (public videos)
- Instagram (posts, Reels)

**🆘 SUPPORT:**

Need help? Found a bug? Have a feature request?
- Visit our GitHub repository (link in developer info)
- Check the documentation
- Contact support via email

**⚡ QUICK START:**

1. Install the extension
2. Accept the privacy notice
3. Navigate to any video
4. Click the TakeVid icon
5. Download in your preferred quality

**🔄 REGULAR UPDATES:**

We continuously improve TakeVid with:
- Bug fixes
- New platform support
- Feature enhancements
- Security updates

**📋 PERMISSIONS EXPLAINED:**

- **Active Tab**: To detect video URLs automatically
- **Downloads**: To save videos to your device
- **Cookies**: Optional, for accessing age-restricted content
- **Storage**: To save your settings and history locally
- **Context Menus**: For right-click download option

**🌍 COMING SOON:**

- Multi-language support (Arabic, Spanish, French, German)
- Batch downloading
- Video trimming
- More platform support

Download TakeVid today and take control of your video downloads!

---

**⭐ If you find TakeVid useful, please leave a review! Your feedback helps us improve.**

## Category
Productivity

## Language
English (more languages coming soon)

## Screenshots (Recommended: 1280x800 or 640x400)

1. **Main Interface** - Screenshot showing the modern UI with a video ready to download
2. **Quality Selection** - Dropdown showing multiple quality options
3. **Download History** - History view with thumbnails
4. **Settings Page** - Settings interface showing privacy controls
5. **Context Menu** - Right-click menu in action

## Privacy Practices

### Data Usage
- **Personally identifiable information**: No
- **Health information**: No
- **Financial information**: No
- **Authentication information**: Yes (cookies, optional)
- **Personal communications**: No
- **Location**: No
- **Web history**: No
- **User activity**: Yes (download history, stored locally)
- **Website content**: Yes (video URLs)

### Data Handling
- **Is any data being used or transferred for purposes unrelated to the extension's core functionality?**: No
- **Is any data being sold?**: No
- **Is any data being used or transferred for advertising purposes?**: No

### Data Encryption
- All data in transit is encrypted via HTTPS

## Justification for Permissions

### activeTab
**Purpose**: To automatically detect and extract video URLs from the current tab
**Usage**: Only activated when user clicks the extension icon

### downloads
**Purpose**: To save downloaded videos to the user's device
**Usage**: Only when user explicitly clicks "Download Now" button

### cookies
**Purpose**: To access age-restricted, private, or geo-blocked videos that require authentication
**Usage**: Optional - can be disabled in settings. Only essential cookies (session tokens) are used, never stored permanently

### storage
**Purpose**: To save user preferences (settings) and download history locally
**Usage**: All data stored locally on user's device, never transmitted except to our secure server for video processing

### contextMenus
**Purpose**: To provide convenient right-click "Download with TakeVid" option on video links
**Usage**: Only appears on supported video platform URLs

### scripting
**Purpose**: To inject content scripts for detecting videos in dynamic pages (e.g., TikTok feed)
**Usage**: Only on user-initiated actions, not automatic

## Host Permissions Justification

### https://takevid-server.onrender.com/*
**Purpose**: Our secure backend server for video extraction using yt-dlp
**Usage**: Video URLs and optional cookies sent for processing, immediately deleted after

### *://*.youtube.com/*
**Purpose**: To access YouTube videos and extract download links
**Usage**: Only when user explicitly analyzes a YouTube video

### *://*.tiktok.com/*
**Purpose**: To access TikTok videos and extract download links
**Usage**: Only when user explicitly analyzes a TikTok video

## Developer Info

**Developer Name**: [Your Name/Organization]
**Email**: [Your Support Email]
**Website**: [Your Website/GitHub]
**Privacy Policy**: [Link to PRIVACY_POLICY.md hosted online]

## Additional Notes for Reviewers

- This extension uses an external backend server (Flask + yt-dlp) for video extraction
- Cookies are only sent with explicit user consent (privacy notice on first use)
- All sensitive data is transmitted via HTTPS and immediately deleted
- No analytics, tracking, or third-party scripts included
- Source code is open-source and available for review
- We comply with DMCA - users are warned about copyright in privacy notice

## Testing Instructions for Reviewers

1. Install extension
2. Accept privacy notice (appears on first use)
3. Go to any YouTube video (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
4. Click extension icon - URL auto-fills
5. Click "Analyze Link" - formats load
6. Select quality and click "Download Now"
7. Video downloads via browser's native download manager
8. Check History tab for saved record
9. Right-click Options to see Settings page
10. Test right-click context menu on any video link

## Version History

**1.0.1** (Current)
- Added privacy notice and explicit consent
- Added comprehensive settings page
- Improved error handling
- Added context menu support
- Enhanced security (URL validation, removed unnecessary permissions)
- Added subtitle embedding
- Fixed multi-worker backend issues

**1.0.0** (Initial)
- Basic download functionality
- YouTube and TikTok support
- Multiple quality options
- Download history
