// Background service worker

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'download') {
        const BASE_URL = 'https://takevid-server.onrender.com';

        // Step 1: Prepare download on server
        fetch(`${BASE_URL}/prepare_download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: request.url,
                format: request.format,
                quality: request.quality,
                format_id: request.format_id,
                cookies: request.cookies || [],
                userAgent: request.userAgent
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                if (!data.token) {
                    throw new Error('No download token received from server');
                }

                // Step 2: Trigger the actual download via browser API (GET request)
                const downloadUrl = `${BASE_URL}/trigger_download/${data.token}`;

                chrome.downloads.download({
                    url: downloadUrl,
                    conflictAction: 'uniquify',
                    saveAs: false
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        console.error('Download start error:', chrome.runtime.lastError);
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        console.log('Download started with ID:', downloadId);
                        sendResponse({ success: true, downloadId: downloadId });
                    }
                });
            })
            .catch(err => {
                console.error('Preparation error:', err);
                sendResponse({ success: false, error: err.message });
            });

        return true; // Keep channel open for async response
    }
});
