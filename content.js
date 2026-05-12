// TakeVid Content Script
// Robust Overlay Version - Ensures button visibility overlaying the video
// Updated: Button moved to RIGHT side, uses MutationObserver for efficiency

(function () {
    'use strict';

    if (window.TakeVidInjected) return;
    window.TakeVidInjected = true;

    // ==========================================
    // STYLES
    // ==========================================
    const STYLE_ID = 'takevid-overlay-style';
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .takevid-overlay-btn {
                position: fixed; /* FIXED positioning */
                z-index: 2147483647;
                background: linear-gradient(135deg, #6366f1, #4f46e5);
                color: white;
                border-radius: 8px;
                padding: 8px 14px;
                font-family: sans-serif;
                font-size: 13px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                transition: transform 0.2s, opacity 0.2s;
                opacity: 0.8;
                border: 1px solid rgba(255,255,255,0.2);
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }
            .takevid-overlay-btn:hover {
                opacity: 1;
                transform: scale(1.05);
                box-shadow: 0 6px 16px rgba(99, 102, 241, 0.6);
            }
            .takevid-overlay-btn svg {
                width: 18px;
                height: 18px;
                fill: white;
            }
            
            /* MENU STYLES */
            .takevid-menu {
                position: fixed;
                width: 280px;
                background: #1f2937;
                border: 1px solid #374151;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.6);
                z-index: 2147483647;
                display: none;
                flex-direction: column;
                font-family: sans-serif;
                overflow: hidden;
            }
            .takevid-menu.open { display: flex; animation: tv-fadein 0.2s ease-out; }
            @keyframes tv-fadein { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            
            .tv-header { padding: 12px; background: #111827; border-bottom: 1px solid #374151; display: flex; justify-content: space-between; align-items: center; color: white; font-weight: 600; }
            .tv-close { cursor: pointer; padding: 4px; color: #9ca3af; }
            .tv-close:hover { color: white; }
            .tv-content { padding: 8px; max-height: 300px; overflow-y: auto; background: #1f2937; }
            
            .tv-item { padding: 10px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: #e5e7eb; margin-bottom: 4px; transition: background 0.2s; }
            .tv-item:hover { background: #374151; }
            .tv-tag { background: #4b5563; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
            .tv-hd { color: #818cf8; }
            
            .tv-msg { padding: 15px; text-align: center; color: #d1d5db; font-size: 13px; }
            .tv-err { color: #f87171; background: rgba(127, 29, 29, 0.2); border-radius: 6px; }
            
            .tv-spinner { width: 20px; height: 20px; border: 3px solid #374151; border-top-color: #6366f1; border-radius: 50%; animation: tv-spin 1s infinite linear; margin: 0 auto 8px; }
            @keyframes tv-spin { to { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);
    }

    // ==========================================
    // OVERLAY MANAGER
    // ==========================================
    let activeOverlay = null;

    function createOverlay(videoElement) {
        if (activeOverlay) {
            activeOverlay.btn.remove();
            activeOverlay.menu.remove();
            activeOverlay = null;
        }

        const div = document.createElement('div');
        div.className = 'takevid-overlay-btn';
        div.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            <span>TakeVid</span>
        `;

        const menu = document.createElement('div');
        menu.className = 'takevid-menu';
        menu.innerHTML = `
            <div class="tv-header"><span>Download Video</span><div class="tv-close">✕</div></div>
            <div class="tv-content"></div>
        `;

        document.body.appendChild(div);
        document.body.appendChild(menu);

        // Listeners
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            if (menu.classList.contains('open')) {
                menu.classList.remove('open');
            } else {
                menu.classList.add('open');
                updatePosition();
                startAnalysis(menu);
            }
        });

        menu.querySelector('.tv-close').addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.remove('open');
        });

        const closeMenuHandler = (e) => {
            if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== div && !div.contains(e.target)) {
                menu.classList.remove('open');
            }
        };
        document.addEventListener('click', closeMenuHandler);

        activeOverlay = { btn: div, menu: menu, video: videoElement };
        updatePosition();
    }

    function updatePosition() {
        if (!activeOverlay || !activeOverlay.video) return;

        const video = activeOverlay.video;
        if (!document.body.contains(video)) {
            activeOverlay.btn.remove();
            activeOverlay.menu.remove();
            activeOverlay = null;
            return;
        }

        const rect = video.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(video).display === 'none') {
            activeOverlay.btn.style.display = 'none';
            return;
        } else {
            activeOverlay.btn.style.display = 'flex';
        }

        // POSITIONING LOGIC: Top Right
        const top = rect.top + 20;
        const buttonWidth = 100;
        const left = (rect.left + rect.width) - buttonWidth - 30;

        activeOverlay.btn.style.top = `${Math.max(10, top)}px`;
        activeOverlay.btn.style.left = `${Math.max(10, left)}px`;

        // Menu below button, aligned to right of button
        const menuWidth = 280;
        activeOverlay.menu.style.top = `${Math.max(10, top + 50)}px`;
        const menuLeft = Math.min(
            Math.max(10, left + 100 - menuWidth),
            window.innerWidth - menuWidth - 10
        );
        activeOverlay.menu.style.left = `${menuLeft}px`;
    }

    // ==========================================
    // ANALYSIS LOGIC
    // ==========================================
    async function startAnalysis(menu) {
        const content = menu.querySelector('.tv-content');
        content.innerHTML = '';
        const msgDiv = document.createElement('div');
        msgDiv.className = 'tv-msg';
        const spinner = document.createElement('div');
        spinner.className = 'tv-spinner';
        msgDiv.appendChild(spinner);
        msgDiv.appendChild(document.createTextNode('Analyzing...'));
        content.appendChild(msgDiv);

        try {
            const url = window.location.href;

            const response = await chrome.runtime.sendMessage({
                action: 'analyzeVideo',
                url: url,
                userAgent: navigator.userAgent
            });

            if (response && response.success) {
                renderOptions(content, response.data);
            } else {
                let msg = (response && response.error) || 'Server Error';
                if (msg.includes('500') || msg.includes('Taking too long')) {
                    msg = 'Failed to analyze. Try refreshing the page.';
                }
                renderError(content, msg);
            }
        } catch (err) {
            renderError(content, err.message || 'Unknown error');
        }
    }

    function renderOptions(container, data) {
        container.innerHTML = '';

        if (data.formats && data.formats.length > 0) {
            const formats = data.formats.filter(f => f.type === 'video');
            const audio = data.formats.find(f => f.type === 'audio');

            formats.forEach(format => {
                const item = document.createElement('div');
                item.className = 'tv-item';

                const qualitySpan = document.createElement('span');
                if (format.height >= 720) qualitySpan.className = 'tv-hd';
                qualitySpan.textContent = format.quality;

                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'tv-tag';
                sizeSpan.textContent = format.size_text;

                item.appendChild(qualitySpan);
                item.appendChild(sizeSpan);
                item.onclick = () => triggerDownload(container, data.webpage_url, format);
                container.appendChild(item);
            });

            if (audio) {
                const item = document.createElement('div');
                item.className = 'tv-item';

                const nameSpan = document.createElement('span');
                nameSpan.textContent = 'MP3 Audio';

                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'tv-tag';
                sizeSpan.textContent = audio.size_text;

                item.appendChild(nameSpan);
                item.appendChild(sizeSpan);
                item.onclick = () => triggerDownload(container, data.webpage_url, audio);
                container.appendChild(item);
            }
        } else {
            renderError(container, 'No formats found');
        }
    }

    // FIX: Use textContent instead of innerHTML to prevent XSS
    function renderError(container, msg) {
        container.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'tv-msg tv-err';
        div.textContent = msg;
        container.appendChild(div);
    }

    async function triggerDownload(container, url, format) {
        container.innerHTML = '';
        const msgDiv = document.createElement('div');
        msgDiv.className = 'tv-msg';
        const spinner = document.createElement('div');
        spinner.className = 'tv-spinner';
        msgDiv.appendChild(spinner);
        msgDiv.appendChild(document.createTextNode('Starting...'));
        container.appendChild(msgDiv);

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'download',
                url: url,
                format: format.type,
                quality: format.height || format.id,
                format_id: format.id,
                userAgent: navigator.userAgent
            });

            if (response && response.success) {
                container.innerHTML = '';
                const successDiv = document.createElement('div');
                successDiv.className = 'tv-msg';
                successDiv.style.color = '#4ade80';
                successDiv.textContent = 'Download Started!';
                container.appendChild(successDiv);
            } else {
                renderError(container, (response && response.error) || 'Failed');
            }
        } catch (err) {
            renderError(container, err.message || 'Download failed');
        }
    }

    // ==========================================
    // MESSAGE HANDLER (for notifications from background)
    // ==========================================
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'showNotification') {
            // Could show an in-page notification here
            sendResponse({ received: true });
        }
        return false;
    });

    // ==========================================
    // EFFICIENT VIDEO DETECTOR (MutationObserver instead of rAF loop)
    // ==========================================
    function findMainVideo() {
        const videos = Array.from(document.querySelectorAll('video'));
        let maxArea = 0;
        let mainVideo = null;

        videos.forEach(v => {
            const r = v.getBoundingClientRect();
            if (r.width > 200 && r.height > 200) {
                const area = r.width * r.height;
                if (area > maxArea) {
                    maxArea = area;
                    mainVideo = v;
                }
            }
        });

        return mainVideo;
    }

    function checkForVideo() {
        const video = findMainVideo();
        if (video) {
            if (!activeOverlay || activeOverlay.video !== video) {
                createOverlay(video);
            } else {
                updatePosition();
            }
        } else {
            if (activeOverlay) {
                activeOverlay.btn.remove();
                activeOverlay.menu.remove();
                activeOverlay = null;
            }
        }
    }

    // Initial check
    checkForVideo();

    // Use MutationObserver instead of requestAnimationFrame loop
    let checkTimeout = null;
    const debouncedCheck = () => {
        if (checkTimeout) clearTimeout(checkTimeout);
        checkTimeout = setTimeout(checkForVideo, 300);
    };

    const observer = new MutationObserver(debouncedCheck);
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Update position on scroll/resize, but debounced
    let scrollTimeout = null;
    const debouncedPosition = () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updatePosition, 50);
    };

    window.addEventListener('scroll', debouncedPosition, true);
    window.addEventListener('resize', debouncedPosition);

})();
