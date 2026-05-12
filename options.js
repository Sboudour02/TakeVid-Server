// TakeVid Options Page

document.addEventListener('DOMContentLoaded', async () => {
    // Load settings
    const settings = await chrome.storage.sync.get({
        sendCookies: true,
        saveHistory: true,
        defaultQuality: 'ask',
        autoSubtitles: true,
        serverURL: ''
    });

    document.getElementById('setting-cookies').checked = settings.sendCookies;
    document.getElementById('setting-history').checked = settings.saveHistory;
    document.getElementById('setting-quality').value = settings.defaultQuality;
    document.getElementById('setting-subtitles').checked = settings.autoSubtitles;
    document.getElementById('setting-server').value = settings.serverURL;

    // Save button listener inside DOMContentLoaded
    document.getElementById('btn-save').addEventListener('click', async () => {
        const serverURLInput = document.getElementById('setting-server').value.trim();

        // Validate server URL if provided
        if (serverURLInput) {
            try {
                const urlObj = new URL(serverURLInput);
                if (!['http:', 'https:'].includes(urlObj.protocol)) {
                    showToast('Invalid server URL: must use http or https', 'error');
                    return;
                }
            } catch {
                showToast('Invalid server URL format', 'error');
                return;
            }
        }

        await chrome.storage.sync.set({
            sendCookies: document.getElementById('setting-cookies').checked,
            saveHistory: document.getElementById('setting-history').checked,
            defaultQuality: document.getElementById('setting-quality').value,
            autoSubtitles: document.getElementById('setting-subtitles').checked,
            serverURL: serverURLInput
        });

        showToast('Settings saved!', 'success');
    });
});

function showToast(msg, type = 'success') {
    const existing = document.querySelector('.options-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `options-toast ${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
