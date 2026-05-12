# Testing Checklist for TakeVid 1.0.1

## Pre-Installation Tests

- [ ] Verify all files exist in the correct locations
- [ ] Check manifest.json syntax is valid
- [ ] Ensure icons are properly sized (16x16, 48x48, 128x128)
- [ ] Backend server is running and accessible

## Installation Tests

- [ ] Load extension in Developer Mode
- [ ] No console errors on installation
- [ ] Extension icon appears in toolbar
- [ ] Right-click extension icon shows "Options"

## Privacy Notice Tests

- [ ] First launch shows privacy notice modal
- [ ] "I Understand & Accept" button works
- [ ] "Decline" button closes popup
- [ ] After accepting, notice doesn't show again
- [ ] Can view privacy notice again from Settings

## Basic Functionality Tests

### YouTube
- [ ] Standard public video downloads
- [ ] Age-restricted video (requires cookies)
- [ ] YouTube Shorts downloads
- [ ] 4K video support
- [ ] Audio-only (MP3) extraction
- [ ] Long videos (>1 hour)

### TikTok
- [ ] Standard TikTok video
- [ ] TikTok slideshow post
- [ ] From TikTok feed auto-detection
- [ ] Private/login-required video (with cookies enabled)

### Facebook
- [ ] Public Facebook video
- [ ] fb.watch short link

### Instagram
- [ ] Instagram post video
- [ ] Instagram Reel

## URL Validation Tests

- [ ] Valid YouTube URL accepted
- [ ] Valid TikTok URL accepted
- [ ] Invalid URL rejected (e.g., `file:///etc/passwd`)
- [ ] Malicious URL rejected (e.g., `http://localhost:5000/admin`)
- [ ] Non-video URL rejected with clear message

## Quality Selection Tests

- [ ] Multiple qualities shown for HD videos
- [ ] 4K option available for 4K videos
- [ ] Default quality auto-selected (based on settings)
- [ ] Audio option available
- [ ] Size estimates displayed

## Download Tests

- [ ] Download starts successfully
- [ ] Progress indicator shows (indeterminate animation)
- [ ] Browser download manager triggered
- [ ] File saved with correct format (MP4/MP3)
- [ ] Toast notification shows "Download started!"
- [ ] Download appears in history

## Error Handling Tests

- [ ] Invalid URL shows clear error
- [ ] Network timeout handled gracefully (45s)
- [ ] Server error shows user-friendly message
- [ ] Geo-blocked video error is clear
- [ ] Age-restricted video with cookies disabled shows helpful error

## History Tests

- [ ] Downloaded video appears in history
- [ ] History shows thumbnail, title, quality, date
- [ ] History limited to 20 items
- [ ] Old items (>30 days) auto-cleaned
- [ ] "Clear All" button works
- [ ] Empty state shows when no history

## Settings Tests

### Privacy & Security
- [ ] "Send Cookies" toggle works
- [ ] "Save Download History" toggle works
- [ ] When cookies disabled, age-restricted videos fail with notice
- [ ] When history disabled, downloads don't save to history

### Download Preferences
- [ ] "Default Quality" dropdown works
- [ ] Selected quality auto-selected on next analyze
- [ ] "Auto-Download Subtitles" toggle works (backend embeds subs)

### Advanced
- [ ] Custom server URL can be set
- [ ] Custom server URL is used for requests
- [ ] Invalid server URL shows error

## Context Menu Tests

- [ ] Right-click on YouTube video link shows "Download with TakeVid"
- [ ] Right-click on TikTok link shows menu item
- [ ] Clicking context menu opens popup with URL pre-filled
- [ ] Context menu doesn't appear on non-video links

## UI/UX Tests

- [ ] Paste button works
- [ ] Platform icon appears when URL entered (YouTube/TikTok/Facebook/Instagram)
- [ ] Loading state shows spinner
- [ ] Analyze button disabled during loading
- [ ] Back button works correctly
- [ ] Reset button clears and goes to input state
- [ ] Toast notifications visible and auto-hide

## Backend Tests

### URL Validation (Server-Side)
- [ ] Server rejects invalid protocols (file://, ftp://)
- [ ] Server rejects non-whitelisted domains
- [ ] Server returns 400 for invalid URLs

### Token System
- [ ] prepare_download returns valid token
- [ ] trigger_download works with valid token
- [ ] Expired token (>5 min) returns 404
- [ ] Token can only be used once

### Multi-Worker Support
- [ ] With Redis: tokens work across workers
- [ ] Without Redis: warning logged, single worker mode

### Cookie Handling
- [ ] Cookies converted to Netscape format correctly
- [ ] Cookie file created and deleted properly
- [ ] No cookie leakage in logs

## Security Tests

- [ ] No cookies sent if user disabled in settings
- [ ] No XSS via video title (textContent used)
- [ ] No SSRF via malicious URL
- [ ] HTTPS enforced for all requests
- [ ] No secrets in console logs

## Performance Tests

- [ ] Extension loads in < 1 second
- [ ] Analyze completes in < 10 seconds (normal video)
- [ ] No memory leaks after 10+ downloads
- [ ] No excessive CPU usage
- [ ] History renders quickly even with 20 items

## Compatibility Tests

### Browsers
- [ ] Chrome (latest)
- [ ] Edge (latest)
- [ ] Brave (Chromium-based)

### Operating Systems
- [ ] Windows 10/11
- [ ] macOS (if available)
- [ ] Linux (if available)

## Edge Cases

- [ ] Very long video title (>100 chars) truncates properly
- [ ] Video with no thumbnail shows placeholder
- [ ] Video with unknown uploader shows "Unknown Creator"
- [ ] Playlist URL only analyzes first video (no playlist download)
- [ ] Live stream URL rejected with clear error
- [ ] Private video without cookies fails gracefully

## Regression Tests (From v1.0.0)

- [ ] Basic download still works
- [ ] History still saves (when enabled)
- [ ] Auto-pull from active tab still works
- [ ] TikTok feed detection still functional

## Documentation Tests

- [ ] README.md is accurate and up-to-date
- [ ] PRIVACY_POLICY.md covers all data collection
- [ ] CHANGELOG.md lists all changes
- [ ] STORE_LISTING.md ready for submission
- [ ] Code comments are clear

## Pre-Submission Checklist

- [ ] All critical bugs fixed
- [ ] All features tested and working
- [ ] Privacy policy hosted online
- [ ] Screenshots prepared (5x, 1280x800)
- [ ] Store listing text ready
- [ ] Version bumped to 1.0.1
- [ ] Extension built with build_extension.py
- [ ] ZIP file < 5MB
- [ ] No development files in ZIP (no .py, .md, etc.)

## Known Issues to Document

- TikTok feed detection may not work on all layouts
- Geo-blocked videos will fail (platform limitation)
- Very large 8K videos may timeout (increase server timeout if needed)

---

**Test Date:** _____________
**Tested By:** _____________
**Platform:** _____________
**Result:** ☐ PASS  ☐ FAIL  ☐ NEEDS FIXES
