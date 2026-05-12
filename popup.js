// Get server URL from settings
let BASE_URL = 'https://takevid-server.onrender.com';
chrome.storage.sync.get('serverURL', (data) => {
    if (data.serverURL) BASE_URL = data.serverURL;
});

// URL Validation
const ALLOWED_DOMAINS = [
    'youtube.com', 'youtu.be', 'tiktok.com',
    'facebook.com', 'fb.watch', 'instagram.com'
];

const isValidVideoURL = (url) => {
    try {
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }
        const hostname = urlObj.hostname.toLowerCase();
        return ALLOWED_DOMAINS.some(domain =>
            hostname === domain || hostname.endsWith('.' + domain)
        );
    } catch {
        return false;
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if user has accepted privacy notice
        let privacyNoticeAccepted = false;
        try {
            const result = await chrome.storage.local.get('privacyNoticeAccepted');
            privacyNoticeAccepted = !!result.privacyNoticeAccepted;
        } catch (err) {
            console.error('Error checking privacy notice:', err);
        }

        if (!privacyNoticeAccepted) {
            try {
                await chrome.windows.create({
                    url: 'privacy-notice.html',
                    type: 'popup',
                    width: 420,
                    height: 600
                });
            } catch (err) {
                console.error('Error opening privacy notice:', err);
            }
        }
    } catch (err) {
        console.error('Critical error in DOMContentLoaded:', err);
    }

    // Check if there's a pending URL from context menu
    let pendingURL = null;
    try {
        const result = await chrome.storage.local.get('pendingURL');
        pendingURL = result.pendingURL;
    } catch (err) {
        console.error('Error getting pendingURL:', err);
    }

    // State Containers
    const stateInput = document.getElementById('state-input');
    const stateLoading = document.getElementById('state-loading');
    const stateResult = document.getElementById('state-result');
    const stateHistory = document.getElementById('state-history');

    // UI Elements
    const urlInput = document.getElementById('url-input');
    const btnPaste = document.getElementById('btn-paste');
    const btnAnalyze = document.getElementById('btn-analyze');
    const videoThumb = document.getElementById('video-thumb');
    const videoTitle = document.getElementById('video-title');
    const videoUploader = document.getElementById('video-uploader');
    const videoDuration = document.getElementById('video-duration');

    // Selection Elements
    const btnDropdownToggle = document.getElementById('btn-dropdown-toggle');
    const qualityDropdown = document.getElementById('quality-dropdown');
    const videoOptionsList = document.getElementById('video-options-list');
    const audioOptionsList = document.getElementById('audio-options-list');
    const selectedQualityBadge = document.getElementById('selected-quality-badge');
    const selectedSizeText = document.getElementById('selected-size-text');
    const btnMainDownload = document.getElementById('btn-main-download');

    const btnReset = document.getElementById('btn-reset');
    const toast = document.getElementById('toast');

    // Platform Icons
    const iconYoutube = document.getElementById('icon-youtube');
    const iconTiktok = document.getElementById('icon-tiktok');
    const iconFacebook = document.getElementById('icon-facebook');
    const iconInstagram = document.getElementById('icon-instagram');

    const updatePlatformIcons = (url) => {
        if (!iconYoutube || !iconTiktok) return;

        iconYoutube.classList.add('hidden');
        iconTiktok.classList.add('hidden');
        if (iconFacebook) iconFacebook.classList.add('hidden');
        if (iconInstagram) iconInstagram.classList.add('hidden');

        if (!url) return;

        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            iconYoutube.classList.remove('hidden');
        } else if (url.includes('tiktok.com')) {
            iconTiktok.classList.remove('hidden');
        } else if (url.includes('facebook.com') || url.includes('fb.watch')) {
            if (iconFacebook) iconFacebook.classList.remove('hidden');
        } else if (url.includes('instagram.com')) {
            if (iconInstagram) iconInstagram.classList.remove('hidden');
        }
    };

    // New Elements
    const btnShowHistory = document.getElementById('btn-show-history');
    const btnHeaderBack = document.getElementById('btn-header-back');
    const appLogo = document.getElementById('app-logo');
    const btnHistoryBack = document.getElementById('btn-history-back');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const historyList = document.getElementById('history-list');

    const downloadStatusContainer = document.getElementById('download-status-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const downloadStatusLabel = document.getElementById('download-status-label');
    const downloadPercentage = document.getElementById('download-percentage');

    let currentVideoData = null;
    let selectedFormat = null;

    // Helper: Format duration (seconds to MM:SS)
    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get URL from current tab FIRST, then fall back to pendingURL
    const initializeUrl = async () => {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tab = tabs[0];

            if (tab && tab.url) {
                const url = tab.url;
                const isYouTubeVideo = url.includes('youtube.com/watch') || url.includes('youtu.be/') || url.includes('youtube.com/shorts');
                const isTikTokVideo = url.includes('tiktok.com/') && (url.includes('/video/') || url.includes('/v/') || url.includes('/@'));
                const isFacebookVideo = (url.includes('facebook.com') && (url.includes('/watch') || url.includes('/reel') || url.includes('/videos/'))) || url.includes('fb.watch');
                const isInstagramVideo = url.includes('instagram.com') && (url.includes('/reel') || url.includes('/p/'));

                if (isYouTubeVideo || isTikTokVideo || isFacebookVideo || isInstagramVideo) {
                    if (!url.includes('/search') && !url.includes('/explore')) {
                        if (urlInput) {
                            urlInput.value = url;
                            updatePlatformIcons(url);
                            showToast('Current video detected!');
                            await chrome.storage.local.remove('pendingURL');
                            return;
                        }
                    }
                }
            }

            if (pendingURL) {
                if (urlInput) {
                    urlInput.value = pendingURL;
                    updatePlatformIcons(pendingURL);
                    showToast('Video link from context menu!');
                }
                await chrome.storage.local.remove('pendingURL');
                return;
            }

            // Try to extract from TikTok feed
            if (tab && tab.url && tab.url.includes('tiktok.com')) {
                showToast('Scanning feed for video...');
                try {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            const videoLinks = Array.from(document.querySelectorAll('a[href*="/video/"]'));
                            let bestLink = null;
                            let minDistance = Infinity;
                            const viewportCenter = window.innerHeight / 2;

                            for (const link of videoLinks) {
                                const rect = link.getBoundingClientRect();
                                if (rect.width === 0 || rect.height === 0) continue;
                                const elementCenter = rect.top + (rect.height / 2);
                                const distance = Math.abs(viewportCenter - elementCenter);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    bestLink = link;
                                }
                            }
                            return bestLink ? bestLink.href : null;
                        }
                    });

                    if (results && results[0] && results[0].result && urlInput) {
                        urlInput.value = results[0].result;
                        updatePlatformIcons(results[0].result);
                        showToast('Video found in feed!');
                    }
                } catch (e) {
                    // TikTok feed scan can fail silently
                }
            }
        } catch (err) {
            console.error('Error in initializeUrl:', err);
        }
    };

    // Initialize URL
    initializeUrl();


    const showToast = (text, duration = 3000) => {
        toast.textContent = text;
        toast.classList.remove('hidden');
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s';
            toast.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, duration);
    };

    const setState = (state) => {
        [stateInput, stateLoading, stateResult, stateHistory].forEach(el => {
            if (el) el.classList.add('hidden');
        });

        let target;
        switch (state) {
            case 'input': target = stateInput; break;
            case 'loading': target = stateLoading; break;
            case 'result': target = stateResult; break;
            case 'history': target = stateHistory; renderHistory(); break;
            default: target = stateInput;
        }

        if (target) {
            target.classList.remove('hidden');
            try {
                target.animate([
                    { opacity: 0, transform: 'translateY(10px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], { duration: 300, easing: 'ease-out' });
            } catch (e) {
                // Animation not supported in some contexts
            }
        }

        // Toggle Header Back Button
        if (btnHeaderBack) {
            if (state === 'input') {
                btnHeaderBack.classList.add('hidden');
            } else {
                btnHeaderBack.classList.remove('hidden');
            }
        }
    };

    const saveToHistory = async (videoData, format) => {
        const { saveHistory } = await chrome.storage.sync.get({ saveHistory: true });
        if (!saveHistory) return;

        const historyItem = {
            id: Date.now(),
            title: videoData.title,
            thumbnail: videoData.thumbnail,
            quality: format.quality,
            type: format.type,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now()
        };

        const { downloadHistory = [] } = await chrome.storage.local.get('downloadHistory');
        const newHistory = [historyItem, ...downloadHistory].slice(0, 20);
        await chrome.storage.local.set({ downloadHistory: newHistory });

        // Auto-cleanup old items (> 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const filtered = newHistory.filter(item => item.timestamp > thirtyDaysAgo);
        if (filtered.length !== newHistory.length) {
            await chrome.storage.local.set({ downloadHistory: filtered });
        }
    };

    const renderHistory = async () => {
        const { downloadHistory = [] } = await chrome.storage.local.get('downloadHistory');
        historyList.innerHTML = '';

        if (downloadHistory.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-history';
            const p = document.createElement('p');
            p.textContent = 'No downloads yet.';
            emptyDiv.appendChild(p);
            historyList.appendChild(emptyDiv);
            return;
        }

        downloadHistory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';

            const img = document.createElement('img');
            img.src = item.thumbnail;
            img.className = 'hist-thumb';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'hist-info';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'hist-title';
            titleSpan.textContent = item.title;

            const metaDiv = document.createElement('div');
            metaDiv.className = 'hist-meta';

            const qualitySpan = document.createElement('span');
            qualitySpan.textContent = item.quality;

            const separatorSpan = document.createElement('span');
            separatorSpan.textContent = '•';

            const dateSpan = document.createElement('span');
            dateSpan.textContent = item.date;

            metaDiv.appendChild(qualitySpan);
            metaDiv.appendChild(separatorSpan);
            metaDiv.appendChild(dateSpan);

            infoDiv.appendChild(titleSpan);
            infoDiv.appendChild(metaDiv);

            div.appendChild(img);
            div.appendChild(infoDiv);

            historyList.appendChild(div);
        });
    };

    const animateProgress = () => {
        downloadStatusContainer.classList.remove('hidden');
        btnMainDownload.classList.add('hidden');

        progressBarFill.style.width = '100%';
        progressBarFill.style.animation = 'indeterminate-progress 1.5s ease-in-out infinite';
        downloadPercentage.textContent = '';

        return null;
    };

    const resetProgress = () => {
        progressBarFill.style.width = '0%';
        progressBarFill.style.animation = '';
        downloadPercentage.textContent = '';
        downloadStatusContainer.classList.add('hidden');
        btnMainDownload.classList.remove('hidden');
    };

    const populateOptions = async (formats) => {
        videoOptionsList.innerHTML = '';
        audioOptionsList.innerHTML = '';

        const videoFormats = formats.filter(f => f.type === 'video');
        const audioFormat = formats.find(f => f.type === 'audio');

        // Get user's default quality preference
        const { defaultQuality } = await chrome.storage.sync.get({ defaultQuality: 'ask' });
        let defaultIndex = 0;

        if (defaultQuality !== 'ask') {
            const matchIndex = videoFormats.findIndex(f => f.quality.includes(defaultQuality));
            if (matchIndex !== -1) defaultIndex = matchIndex;
        }

        videoFormats.forEach((fmt, index) => {
            const div = document.createElement('div');
            div.className = 'option-item';

            const isHighQuality = fmt.height >= 1080;
            const qualityLabel = isHighQuality ? `${fmt.quality} ${fmt.quality.includes('2160') ? '4K' : 'HD'}` : fmt.quality;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'opt-name';
            nameSpan.textContent = qualityLabel;

            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'opt-size';
            sizeSpan.textContent = fmt.size_text;

            div.appendChild(nameSpan);
            div.appendChild(sizeSpan);

            div.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                updateSelectedFormat(fmt);
                qualityDropdown.classList.add('hidden');
            });

            videoOptionsList.appendChild(div);

            // FIX: Only mark the defaultIndex item as selected (not always index 0)
            if (index === defaultIndex) {
                div.classList.add('selected');
                updateSelectedFormat(fmt);
            }
        });

        if (audioFormat) {
            const div = document.createElement('div');
            div.className = 'option-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'opt-name';
            nameSpan.textContent = 'MP3 Audio';

            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'opt-size';
            sizeSpan.textContent = audioFormat.size_text;

            div.appendChild(nameSpan);
            div.appendChild(sizeSpan);

            div.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                updateSelectedFormat(audioFormat);
                qualityDropdown.classList.add('hidden');
            });
            audioOptionsList.appendChild(div);
        }
    };

    const updateSelectedFormat = (fmt) => {
        selectedFormat = fmt;
        selectedQualityBadge.textContent = fmt.type === 'audio' ? 'MP3' : fmt.quality;
        selectedSizeText.textContent = fmt.size_text;
    };

    // FIX: Use background script for analysis instead of direct fetch (unified cookie handling + retry logic)
    const handleAnalyze = async () => {
        const url = urlInput.value.trim();
        if (!url) {
            showToast('Please paste a video URL');
            return;
        }

        if (!isValidVideoURL(url)) {
            showToast('Invalid URL. Only YouTube, TikTok, Facebook, Instagram supported.', 5000);
            return;
        }

        setState('loading');

        try {
            // Use background script which has unified cookie handling + retry logic
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeVideo',
                url: url,
                userAgent: navigator.userAgent
            });

            if (!response || !response.success) {
                throw new Error((response && response.error) || 'Analysis failed');
            }

            const data = response.data;
            currentVideoData = data;

            // Update UI with null checks
            if (videoThumb) videoThumb.src = data.thumbnail || '';
            if (videoTitle) videoTitle.textContent = data.title || 'Unknown Video';
            if (videoUploader) videoUploader.textContent = data.uploader || 'Unknown Creator';
            if (videoDuration) videoDuration.textContent = formatDuration(data.duration);

            populateOptions(data.formats);
            setState('result');

        } catch (err) {
            console.error('Analysis error:', err);

            let userMessage = 'Analysis failed.';

            if (err.name === 'AbortError' || (err.message && err.message.includes('abort'))) {
                userMessage = 'Server is taking too long. Please try again.';
            } else if (err.message && err.message.includes('Extension context invalidated')) {
                userMessage = 'Extension was updated. Please close and reopen this popup.';
            } else if (err.message && err.message.includes('Server error')) {
                userMessage = 'Server is having issues. Please try again in a moment.';
            } else if (err.message) {
                userMessage = err.message;
            }

            showToast(userMessage, 5000);
            setState('input');
        }
    };

    const handleDownload = async () => {
        if (!selectedFormat || !currentVideoData) return;

        downloadStatusLabel.textContent = 'Preparing...';
        animateProgress();

        try {
            downloadStatusLabel.textContent = 'Downloading...';

            const response = await chrome.runtime.sendMessage({
                action: 'download',
                url: currentVideoData.webpage_url,
                format: selectedFormat.type,
                quality: selectedFormat.height || selectedFormat.id,
                format_id: selectedFormat.id,
                userAgent: navigator.userAgent
            });

            downloadStatusLabel.textContent = 'Starting browser download...';

            if (response && response.success) {
                progressBarFill.style.animation = '';
                progressBarFill.style.width = '100%';
                downloadStatusLabel.textContent = 'Completed!';

                showToast('Download started!');
                await saveToHistory(currentVideoData, selectedFormat);

                setTimeout(() => {
                    resetProgress();
                }, 2000);
            } else {
                resetProgress();
                showToast((response && response.error) || 'Download error', 5000);
            }
        } catch (err) {
            resetProgress();

            let errorMsg = 'Download error';
            if (err.message) {
                errorMsg = err.message.includes('Extension context invalidated')
                    ? 'Extension was updated. Please close and reopen this popup.'
                    : err.message;
            }

            showToast(errorMsg, 5000);
        }
    };

    // Validate critical elements exist
    if (!btnAnalyze) {
        console.error('CRITICAL: btn-analyze element not found!');
    }
    if (!urlInput) {
        console.error('CRITICAL: url-input element not found!');
    }

    // Event Listeners
    if (btnPaste) {
        btnPaste.addEventListener('click', async () => {
            if (urlInput) urlInput.focus();
            try {
                const text = await navigator.clipboard.readText();
                if (text && urlInput) {
                    urlInput.value = text;
                    updatePlatformIcons(text);
                    showToast('Link pasted!');
                } else {
                    showToast('Clipboard is empty');
                }
            } catch (err) {
                showToast('Please paste manually (Ctrl+V)', 4000);
                if (urlInput) urlInput.focus();
            }
        });
    }

    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // FIX: properly handle async errors with .catch()
            handleAnalyze().catch(err => {
                console.error('Unhandled error in handleAnalyze:', err);
                showToast('An unexpected error occurred', 5000);
                setState('input');
            });
        });
    }

    if (urlInput) {
        urlInput.addEventListener('input', (e) => {
            updatePlatformIcons(e.target.value);
        });

        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleAnalyze().catch(err => {
                    console.error('Unhandled error in handleAnalyze:', err);
                });
            }
        });
    }

    if (btnDropdownToggle && qualityDropdown) {
        btnDropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            qualityDropdown.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', () => {
        if (qualityDropdown) qualityDropdown.classList.add('hidden');
    });

    if (btnMainDownload) {
        btnMainDownload.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDownload().catch(err => {
                console.error('Unhandled error in handleDownload:', err);
            });
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (urlInput) urlInput.value = '';
            updatePlatformIcons('');
            setState('input');
        });
    }

    if (btnShowHistory) {
        btnShowHistory.addEventListener('click', () => setState('history'));
    }

    if (btnHistoryBack) {
        btnHistoryBack.addEventListener('click', () => setState(currentVideoData ? 'result' : 'input'));
    }

    // Settings button
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // Header Back Button Logic
    if (btnHeaderBack) {
        btnHeaderBack.addEventListener('click', () => {
            if (stateHistory && !stateHistory.classList.contains('hidden')) {
                setState(currentVideoData ? 'result' : 'input');
            } else {
                // Go back to input but keep data so user can re-analyze
                setState('input');
            }
        });
    }

    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', async () => {
            await chrome.storage.local.set({ downloadHistory: [] });
            renderHistory();
            showToast('History cleared');
        });
    }
});
