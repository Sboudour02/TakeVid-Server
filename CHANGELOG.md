# Changelog

## [1.0.1] - 2026-01-24

### 🔒 Security Improvements
- **Critical:** Added URL validation to prevent SSRF attacks - only whitelisted domains allowed
- **Critical:** Added privacy notice modal on first use with explicit consent
- Removed unnecessary `clipboardRead` permission
- Added backend URL validation on server-side
- Enhanced error messages to avoid leaking internal details

### 🛡️ Privacy Enhancements
- Created comprehensive Privacy Policy (PRIVACY_POLICY.md)
- Added settings page to control cookie sending
- Added option to disable download history saving
- Auto-cleanup of history items older than 30 days
- Cookies now respect user settings (can be disabled)

### 🐛 Bug Fixes
- Fixed fake progress bar - now uses indeterminate animation instead of misleading percentages
- Removed deprecated `document.execCommand` fallback for clipboard paste
- Added 45-second timeout to network requests to prevent hanging
- Improved error handling with user-friendly messages
- Fixed multi-worker compatibility in backend using Redis (with fallback)

### ✨ New Features
- **Settings Page:** Configure default quality, cookie sending, history saving, and server URL
- **Privacy Notice:** First-run modal explaining data collection
- **Better Error Messages:** Network errors, timeouts, and server issues now have clear explanations
- Increased history limit from 10 to 20 items

### 🎨 UI/UX Improvements
- Indeterminate progress bar animation for downloads
- Better error toast messages with longer display time
- Settings accessible via right-click on extension icon → Options

### 🔧 Backend Improvements
- Added Redis support for multi-worker deployments (Gunicorn compatibility)
- URL validation on backend to reject invalid/malicious URLs
- Improved token cleanup mechanism
- Added fallback to in-memory storage if Redis unavailable

### 📦 Dependencies
- Added `redis` to requirements.txt for optional Redis support

---

## [1.0.0] - Initial Release

- YouTube and TikTok video download support
- Multiple quality options (4K, 1080p, 720p, etc.)
- Audio extraction to MP3
- Download history tracking
- Modern glassmorphism UI
- Platform icons for supported sites
