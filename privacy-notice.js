// TakeVid Privacy Notice Script
document.addEventListener('DOMContentLoaded', () => {
    const btnAccept = document.getElementById('btn-accept');
    const btnDecline = document.getElementById('btn-decline');

    if (!btnAccept || !btnDecline) {
        console.error('Privacy notice buttons not found');
        return;
    }

    // Accept - save to storage first, then close
    btnAccept.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await chrome.storage.local.set({ privacyNoticeAccepted: true });
            // Small delay to ensure storage is written before closing
            setTimeout(() => window.close(), 100);
        } catch (err) {
            console.error('Error accepting privacy notice:', err);
            // Still close on error
            window.close();
        }
    });

    // Decline - mark as declined so extension shows disabled state
    btnDecline.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await chrome.storage.local.set({ privacyNoticeDeclined: true });
            setTimeout(() => window.close(), 100);
        } catch (err) {
            console.error('Error declining privacy notice:', err);
            window.close();
        }
    });
});
