const BASE_URL = 'http://127.0.0.1:5000';

document.addEventListener('DOMContentLoaded', async () => {
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

    // Auto-pull URL from active tab (Only if it looks like a video)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url) {
            const url = tab.url;
            const isYouTubeVideo = url.includes('youtube.com/watch') || url.includes('youtu.be/');
            const isTikTokVideo = url.includes('tiktok.com/') && (url.includes('/video/') || url.includes('/v/'));

            if (isYouTubeVideo || isTikTokVideo) {
                // Video page detected directly from URL
                if (!url.includes('/search') && !url.includes('/explore')) {
                    urlInput.value = url;
                    showToast('Video link pulled from tab!');
                }
            } else if (url.includes('tiktok.com')) {
                // If on TikTok feed (home/explore), try to find the visible video link from DOM
                showToast('Scanning feed for video...');
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        // Find all potential video links
                        const videoLinks = Array.from(document.querySelectorAll('a[href*="/video/"]'));

                        let bestLink = null;
                        let minDistance = Infinity;
                        const viewportCenter = window.innerHeight / 2;

                        for (const link of videoLinks) {
                            const rect = link.getBoundingClientRect();
                            // Skip hidden elements (width=0 usually implies hidden or barely visible)
                            if (rect.width === 0 || rect.height === 0) continue;

                            // Calculate center of the element
                            const elementCenter = rect.top + (rect.height / 2);
                            // Distance from viewport center
                            const distance = Math.abs(viewportCenter - elementCenter);

                            // We consider it "in view" if it's somewhat close to center
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestLink = link;
                            }
                        }
                        return bestLink ? bestLink.href : null;
                    }
                }, (results) => {
                    if (results && results[0] && results[0].result) {
                        urlInput.value = results[0].result;
                        showToast('Video found in feed!');
                    } else {
                        // Fallback check: Look for the TikTok video element itself?
                        // Usually links are enough. If failed, just notify user.
                        // showToast('No video found. Open specific video.');
                    }
                });
            }
        }
    });

    const getCookies = (url) => {
        return new Promise((resolve) => {
            try {
                const urlObj = new URL(url);
                // Request cookies for the specific domain to ensure we get auth tokens
                chrome.cookies.getAll({ domain: urlObj.hostname }, (cookies) => {
                    resolve(cookies || []);
                });
            } catch (e) {
                console.warn("Cookie fetch error:", e);
                resolve([]);
            }
        });
    };

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
        [stateInput, stateLoading, stateResult, stateHistory].forEach(el => el.classList.add('hidden'));

        let target;
        switch (state) {
            case 'input': target = stateInput; break;
            case 'loading': target = stateLoading; break;
            case 'result': target = stateResult; break;
            case 'history': target = stateHistory; renderHistory(); break;
            default: target = stateInput;
        }

        target.classList.remove('hidden');
        // Simple entry animation
        target.animate([
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 300, easing: 'ease-out' });

        // Toggle Header Back Button
        if (state === 'input') {
            btnHeaderBack.classList.add('hidden');
        } else {
            btnHeaderBack.classList.remove('hidden');
        }
    };

    const saveToHistory = async (videoData, format) => {
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
        // Keep last 10 items
        const newHistory = [historyItem, ...downloadHistory].slice(0, 10);
        await chrome.storage.local.set({ downloadHistory: newHistory });
    };

    const renderHistory = async () => {
        const { downloadHistory = [] } = await chrome.storage.local.get('downloadHistory');
        historyList.innerHTML = '';

        if (downloadHistory.length === 0) {
            historyList.innerHTML = '<div class="empty-history"><p>No downloads yet.</p></div>';
            return;
        }

        downloadHistory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <img src="${item.thumbnail}" class="hist-thumb">
                <div class="hist-info">
                    <span class="hist-title">${item.title}</span>
                    <div class="hist-meta">
                        <span>${item.quality}</span>
                        <span>•</span>
                        <span>${item.date}</span>
                    </div>
                </div>
            `;
            historyList.appendChild(div);
        });
    };

    const animateProgress = () => {
        let progress = 0;
        downloadStatusContainer.classList.remove('hidden');
        btnMainDownload.classList.add('hidden');

        const interval = setInterval(() => {
            if (progress >= 95) {
                clearInterval(interval);
                return;
            }
            progress += Math.random() * 5;
            if (progress > 95) progress = 95;

            progressBarFill.style.width = `${progress}%`;
            downloadPercentage.textContent = `${Math.round(progress)}%`;
        }, 800);

        return interval;
    };

    const resetProgress = () => {
        progressBarFill.style.width = '0%';
        downloadPercentage.textContent = '0%';
        downloadStatusContainer.classList.add('hidden');
        btnMainDownload.classList.remove('hidden');
    };

    const populateOptions = (formats) => {
        videoOptionsList.innerHTML = '';
        audioOptionsList.innerHTML = '';

        const videoFormats = formats.filter(f => f.type === 'video');
        const audioFormat = formats.find(f => f.type === 'audio');

        videoFormats.forEach((fmt, index) => {
            const div = document.createElement('div');
            div.className = 'option-item';
            if (index === 0) div.classList.add('selected');

            const isHighQuality = fmt.height >= 1080;
            const qualityLabel = isHighQuality ? `${fmt.quality} ${fmt.quality.includes('2160') ? '4K' : 'HD'}` : fmt.quality;

            div.innerHTML = `
                <span class="opt-name">${qualityLabel}</span>
                <span class="opt-size">${fmt.size_text}</span>
            `;

            div.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                updateSelectedFormat(fmt);
                qualityDropdown.classList.add('hidden');
            });

            videoOptionsList.appendChild(div);

            // Default select the best quality
            if (index === 0) updateSelectedFormat(fmt);
        });

        if (audioFormat) {
            const div = document.createElement('div');
            div.className = 'option-item';
            div.innerHTML = `
                <span class="opt-name">MP3 Audio</span>
                <span class="opt-size">${audioFormat.size_text}</span>
            `;
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

    const handleAnalyze = async () => {
        const url = urlInput.value.trim();
        if (!url) {
            showToast('Please paste a video URL');
            return;
        }

        setState('loading');

        try {
            const cookies = await getCookies(url);
            const response = await fetch(`${BASE_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, cookies })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);
            if (data.info && data.info.error) throw new Error(data.info.error);

            currentVideoData = data;
            videoThumb.src = data.thumbnail;
            videoTitle.textContent = data.title;
            videoUploader.textContent = data.uploader || 'Unknown Creator';
            videoDuration.textContent = formatDuration(data.duration);

            populateOptions(data.formats);
            setState('result');

        } catch (err) {
            console.error(err);
            showToast('Analysis failed. Check your connection.');
            setState('input');
        }
    };

    const handleDownload = async () => {
        if (!selectedFormat || !currentVideoData) return;

        downloadStatusLabel.textContent = 'Preparing...';
        const progressInterval = animateProgress();

        try {
            const cookies = await getCookies(currentVideoData.webpage_url);

            downloadStatusLabel.textContent = 'Downloading...';

            const response = await chrome.runtime.sendMessage({
                action: 'download',
                url: currentVideoData.webpage_url,
                format: selectedFormat.type,
                quality: selectedFormat.height || selectedFormat.id,
                format_id: selectedFormat.id,
                cookies: cookies
            });

            clearInterval(progressInterval);

            if (response && response.success) {
                progressBarFill.style.width = '100%';
                downloadPercentage.textContent = '100%';
                downloadStatusLabel.textContent = 'Completed!';

                showToast('Download started!');
                await saveToHistory(currentVideoData, selectedFormat);

                setTimeout(() => {
                    resetProgress();
                }, 2000);
            } else {
                resetProgress();
                showToast(response.error || 'Download error');
            }
        } catch (err) {
            clearInterval(progressInterval);
            resetProgress();
            console.error(err);
            showToast('Error: ' + (err.message || 'Communication error'));
        }
    };

    // Event Listeners
    btnPaste.addEventListener('click', async () => {
        urlInput.focus();
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                urlInput.value = text;
                showToast('Link pasted!');
            } else {
                showToast('Clipboard is empty');
            }
        } catch (err) {
            console.error('navigator.clipboard error:', err);
            // Fallback for older browsers or specific security contexts
            try {
                urlInput.select();
                const success = document.execCommand('paste');
                if (success) {
                    showToast('Link pasted!');
                } else {
                    throw new Error('execCommand paste failed');
                }
            } catch (fallbackErr) {
                console.error('Paste fallback failed:', fallbackErr);
                showToast('Manual paste needed (Ctrl+V)');
            }
        }
    });

    btnAnalyze.addEventListener('click', handleAnalyze);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAnalyze();
    });

    btnDropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        qualityDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        qualityDropdown.classList.add('hidden');
    });

    btnMainDownload.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDownload();
    });

    btnReset.addEventListener('click', () => {
        urlInput.value = '';
        setState('input');
    });

    btnShowHistory.addEventListener('click', () => setState('history'));
    btnHistoryBack.addEventListener('click', () => setState(currentVideoData ? 'result' : 'input'));

    // Header Back Button Logic
    btnHeaderBack.addEventListener('click', () => {
        // If we are in history, go back to where we were (result or input)
        if (!stateHistory.classList.contains('hidden')) {
            setState(currentVideoData ? 'result' : 'input');
        } else {
            // Default back to input
            setState('input');
            // reset logic if needed
            currentVideoData = null; // Clear session if we go fully back? 
            // Maybe keep data if they just want to analyze another link
        }
    });

    btnClearHistory.addEventListener('click', async () => {
        await chrome.storage.local.set({ downloadHistory: [] });
        renderHistory();
        showToast('History cleared');
    });
});
