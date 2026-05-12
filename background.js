// TakeVid Background Service Worker
// Enhanced with keyboard shortcuts, notifications, and better download handling

const BASE_URL = 'https://takevid-server.onrender.com';

// ============================================
// Storage Helpers (Async/Await Pattern)
// ============================================
async function getStorage(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
    });
}

async function setStorage(data) {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, resolve);
    });
}

async function getSyncStorage(keys) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(keys, resolve);
    });
}

// ============================================
// Cookie Helper (single source of truth)
// ============================================
const ESSENTIAL_COOKIE_NAMES = [
    'SID', 'HSID', 'SSID', 'APISID', 'SAPISID',
    '__Secure-1PSID', '__Secure-3PSID', '__Secure-1PAPISID', '__Secure-3PAPISID',
    'LOGIN_INFO', 'VISITOR_INFO1_LIVE', 'CONSENT', 'PREF', // YouTube
    'sessionid', 'tt_webid_v2' // TikTok
];

async function getAllCookies(url) {
    // Check if user disabled cookie sending
    const settings = await getSyncStorage({ sendCookies: true });
    if (!settings.sendCookies) {
        return [];
    }

    return new Promise((resolve) => {
        try {
            const urlObj = new URL(url);
            let domain = urlObj.hostname;

            if (domain.includes('youtube.com')) domain = 'youtube.com';
            else if (domain.includes('tiktok.com')) domain = 'tiktok.com';

            chrome.cookies.getAll({ domain: domain }, (cookies) => {
                const filtered = (cookies || []).filter(c =>
                    ESSENTIAL_COOKIE_NAMES.includes(c.name) || c.name.startsWith('__Secure-')
                );
                resolve(filtered);
            });
        } catch (e) {
            console.warn("Cookie fetch error:", e);
            resolve([]);
        }
    });
}

// ============================================
// Active Downloads Tracking (using chrome.storage.session for MV3 compatibility)
// ============================================
async function trackDownload(downloadId, info) {
    try {
        const data = await new Promise(resolve =>
            chrome.storage.session.get('activeDownloads', resolve)
        );
        const downloads = data.activeDownloads || {};
        downloads[downloadId] = info;
        await new Promise(resolve =>
            chrome.storage.session.set({ activeDownloads: downloads }, resolve)
        );
    } catch (e) {
        // chrome.storage.session may not be available in older Chrome
        console.warn('Failed to track download:', e);
    }
}

async function getTrackedDownload(downloadId) {
    try {
        const data = await new Promise(resolve =>
            chrome.storage.session.get('activeDownloads', resolve)
        );
        const downloads = data.activeDownloads || {};
        return downloads[downloadId];
    } catch (e) {
        return null;
    }
}

async function removeTrackedDownload(downloadId) {
    try {
        const data = await new Promise(resolve =>
            chrome.storage.session.get('activeDownloads', resolve)
        );
        const downloads = data.activeDownloads || {};
        delete downloads[downloadId];
        await new Promise(resolve =>
            chrome.storage.session.set({ activeDownloads: downloads }, resolve)
        );
    } catch (e) {
        // Ignore
    }
}

// ============================================
// Statistics Tracking
// ============================================
async function updateStats(platform, fileSize = 0) {
    const data = await getStorage(['downloadStats']);
    const stats = data.downloadStats || {
        totalDownloads: 0,
        bytesSaved: 0,
        platformStats: {
            youtube: 0,
            tiktok: 0,
            facebook: 0,
            instagram: 0
        },
        lastDownload: null
    };

    stats.totalDownloads++;
    stats.bytesSaved += fileSize;
    if (stats.platformStats[platform] !== undefined) {
        stats.platformStats[platform]++;
    }
    stats.lastDownload = new Date().toISOString();

    await setStorage({ downloadStats: stats });
    return stats;
}

// ============================================
// Notifications
// ============================================
function showNotification(title, message, isSuccess = true) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: isSuccess ? 0 : 2
    });
}

// ============================================
// Context Menu Setup
// ============================================
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'downloadVideo',
        title: '⬇️ Download with TakeVid',
        contexts: ['link'],
        targetUrlPatterns: [
            '*://*.youtube.com/*',
            '*://*.youtu.be/*',
            '*://*.tiktok.com/*',
            '*://*.facebook.com/*',
            '*://*.fb.watch/*',
            '*://*.instagram.com/*'
        ]
    });

    chrome.contextMenus.create({
        id: 'downloadCurrentVideo',
        title: '⬇️ Download this video with TakeVid',
        contexts: ['page'],
        documentUrlPatterns: [
            '*://*.youtube.com/watch*',
            '*://*.youtube.com/shorts/*',
            '*://*.tiktok.com/*video*',
            '*://*.tiktok.com/@*',
            '*://*.facebook.com/watch*',
            '*://*.facebook.com/reel*',
            '*://*.instagram.com/reel/*',
            '*://*.instagram.com/p/*'
        ]
    });

    // Initialize stats if not exists
    getStorage(['downloadStats']).then(data => {
        if (!data.downloadStats) {
            setStorage({
                downloadStats: {
                    totalDownloads: 0,
                    bytesSaved: 0,
                    platformStats: { youtube: 0, tiktok: 0, facebook: 0, instagram: 0 },
                    lastDownload: null
                }
            });
        }
    });
});

// ============================================
// Context Menu Click Handler
// ============================================
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'downloadVideo' && info.linkUrl) {
        await chrome.storage.local.set({ pendingURL: info.linkUrl });
        try {
            chrome.action.openPopup();
        } catch (e) {
            // Fallback: open as popup window
            chrome.windows.create({
                url: 'popup.html',
                type: 'popup',
                width: 450,
                height: 600,
                focused: true
            });
        }
    }

    if (info.menuItemId === 'downloadCurrentVideo') {
        await chrome.storage.local.set({ pendingURL: tab.url });
        try {
            chrome.action.openPopup();
        } catch (e) {
            chrome.windows.create({
                url: 'popup.html',
                type: 'popup',
                width: 450,
                height: 600,
                focused: true
            });
        }
    }
});

// ============================================
// Keyboard Shortcut Handler
// ============================================
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'download-current') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.url) {
            const supportedPatterns = [
                'youtube.com/watch',
                'youtube.com/shorts',
                'youtu.be',
                'tiktok.com',
                'facebook.com/watch',
                'facebook.com/reel',
                'fb.watch',
                'instagram.com/reel',
                'instagram.com/p/'
            ];

            const isSupported = supportedPatterns.some(pattern => tab.url.includes(pattern));

            if (isSupported) {
                await chrome.storage.local.set({ pendingURL: tab.url });
                try {
                    chrome.action.openPopup();
                } catch (e) {
                    chrome.windows.create({
                        url: 'popup.html',
                        type: 'popup',
                        width: 450,
                        height: 600,
                        focused: true
                    });
                }
            } else {
                showNotification(
                    'TakeVid',
                    'This page doesn\'t contain a supported video. Try opening a YouTube, TikTok, Facebook, or Instagram video.',
                    false
                );
            }
        }
    }
});

// ============================================
// Download Progress Monitoring
// ============================================
chrome.downloads.onChanged.addListener(async (delta) => {
    if (delta.state) {
        if (delta.state.current === 'interrupted') {
            chrome.downloads.resume(delta.id, () => {
                if (chrome.runtime.lastError) {
                    showNotification('Download Failed', 'The download was interrupted and could not be resumed.', false);
                }
            });
        } else if (delta.state.current === 'complete') {
            chrome.downloads.search({ id: delta.id }, async (downloads) => {
                if (downloads && downloads[0]) {
                    const download = downloads[0];
                    const filename = download.filename.split(/[/\\]/).pop();

                    let platform = 'unknown';
                    const url = download.url || '';
                    if (url.includes('youtube') || download.referrer?.includes('youtube')) {
                        platform = 'youtube';
                    } else if (url.includes('tiktok')) {
                        platform = 'tiktok';
                    } else if (url.includes('facebook') || url.includes('fb.watch')) {
                        platform = 'facebook';
                    } else if (url.includes('instagram')) {
                        platform = 'instagram';
                    }

                    const stats = await updateStats(platform, download.fileSize || 0);

                    showNotification(
                        '✅ Download Complete!',
                        `${filename}\nTotal downloads: ${stats.totalDownloads}`
                    );

                    const downloadInfo = await getTrackedDownload(delta.id);
                    if (downloadInfo && downloadInfo.tabId) {
                        try {
                            chrome.tabs.sendMessage(downloadInfo.tabId, {
                                action: 'showNotification',
                                title: 'Download Complete!',
                                text: filename
                            });
                        } catch (e) {
                            // Tab might be closed
                        }
                    }
                }
            });

            await removeTrackedDownload(delta.id);
        }
    }
});

// ============================================
// Message Handler
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle download request
    if (request.action === 'download') {
        handleDownloadRequest(request, sender)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    // Handle popup open request from content script
    if (request.action === 'openPopupWithUrl') {
        chrome.storage.local.set({ pendingURL: request.url });
        chrome.windows.create({
            url: 'popup.html',
            type: 'popup',
            width: 450,
            height: 600,
            focused: true
        });
        sendResponse({ success: true });
        return true;
    }

    // Get download stats
    if (request.action === 'getStats') {
        getStorage(['downloadStats']).then(data => {
            sendResponse(data.downloadStats || {});
        });
        return true;
    }

    // Handle video analysis request (from both popup and content script)
    if (request.action === 'analyzeVideo') {
        handleAnalyzeRequest(request.url, request.userAgent)
            .then(data => sendResponse({ success: true, data: data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});

// ============================================
// Analysis Request Handler
// ============================================
async function handleAnalyzeRequest(url, userAgent, retryWithoutCookies = false) {
    try {
        const settings = await getSyncStorage({ serverURL: BASE_URL });
        const serverUrl = settings.serverURL || BASE_URL;

        let cookies = [];
        if (!retryWithoutCookies) {
            cookies = await getAllCookies(url);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        const response = await fetch(`${serverUrl}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, cookies, userAgent }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 500 && !retryWithoutCookies && cookies.length > 0) {
                return handleAnalyzeRequest(url, userAgent, true);
            }
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        if (data.info && data.info.error) throw new Error(data.info.error);

        return data;
    } catch (err) {
        throw err;
    }
}

// ============================================
// Download Request Handler
// ============================================
async function handleDownloadRequest(request, sender) {
    try {
        const settings = await getSyncStorage({ serverURL: BASE_URL });
        const serverUrl = settings.serverURL || BASE_URL;

        // Fetch cookies in background (single source of truth)
        const cookies = await getAllCookies(request.url);

        const response = await fetch(`${serverUrl}/prepare_download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: request.url,
                format: request.format,
                quality: request.quality,
                format_id: request.format_id,
                cookies: cookies,
                userAgent: request.userAgent
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.token) {
            throw new Error('No download token received from server');
        }

        const downloadUrl = `${serverUrl}/trigger_download/${data.token}`;

        return new Promise((resolve) => {
            chrome.downloads.download({
                url: downloadUrl,
                conflictAction: 'uniquify',
                saveAs: false
            }, async (downloadId) => {
                if (chrome.runtime.lastError) {
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    await trackDownload(downloadId, {
                        tabId: sender?.tab?.id,
                        url: request.url,
                        startTime: Date.now()
                    });

                    resolve({ success: true, downloadId: downloadId });
                }
            });
        });

    } catch (err) {
        throw err;
    }
}

// ============================================
// Listen for storage changes
// ============================================
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.serverURL) {
        console.log('TakeVid: Server URL updated to:', changes.serverURL.newValue);
    }
});
