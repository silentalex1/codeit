const bmDot = document.getElementById('bm-dot');
const bmText = document.getElementById('bm-text');
const stDot = document.getElementById('st-dot');
const stText = document.getElementById('st-text');

async function updateStatus() {
    try {
        const res = await fetch('/status');
        const data = await res.json();

        if (data.bookmarklet) {
            bmDot.classList.add('status-active');
            bmDot.classList.remove('bg-[#f38ba8]');
            bmText.textContent = 'Connected';
            bmText.className = 'text-sm font-bold text-[#5ad68c]';
        }

        if (data.status === 'accepted') {
            stDot.classList.add('status-active');
            stDot.classList.remove('bg-[#f38ba8]');
            stDot.classList.remove('bg-[#f9e2af]');
            stText.textContent = 'Connected';
            stText.className = 'text-sm font-bold text-[#5ad68c]';
        } else if (data.status === 'pending') {
            stDot.classList.remove('status-active');
            stDot.className = 'w-3 h-3 rounded-full bg-[#f9e2af]';
            stText.textContent = 'Action Required';
            stText.className = 'text-sm font-bold text-[#f9e2af]';
        } else {
            stDot.classList.remove('status-active');
            stDot.className = 'w-3 h-3 rounded-full bg-[#f38ba8]';
            stText.textContent = 'Disconnected';
            stText.className = 'text-sm font-bold text-[#f38ba8]';
        }
    } catch (err) {
        bmDot.classList.remove('status-active');
        bmDot.className = 'w-3 h-3 rounded-full bg-[#f38ba8]';
        bmText.textContent = 'Offline';
        bmText.className = 'text-sm font-bold text-[#f38ba8]';

        stDot.classList.remove('status-active');
        stDot.className = 'w-3 h-3 rounded-full bg-[#f38ba8]';
        stText.textContent = 'Offline';
        stText.className = 'text-sm font-bold text-[#f38ba8]';
    }
}

setInterval(updateStatus, 1000);
updateStatus();
