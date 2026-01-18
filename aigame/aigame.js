document.addEventListener('DOMContentLoaded', async () => {
    const input = document.getElementById('ai-in');
    const run = document.getElementById('run');
    const hub = document.getElementById('hub');
    const msgs = document.getElementById('messages');
    const overlay = document.getElementById('overlay');
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-toggle');

    const toggleSearch = () => {
        overlay.style.display = (overlay.style.display === 'flex') ? 'none' : 'flex';
        if(overlay.style.display === 'flex') document.getElementById('s-input').focus();
    };

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); toggleSearch(); }
        if (e.key === 'Escape') overlay.style.display = 'none';
        if (e.key === 'Enter' && !e.shiftKey && document.activeElement === input) { e.preventDefault(); sendMessage(); }
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.style.display = 'none'; });

    menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        hub.classList.add('min');
        msgs.innerHTML += `<div class="user-q">${text}</div>`;
        input.value = "";

        const aiBox = document.createElement('div');
        aiBox.className = 'ai-a';
        aiBox.innerText = 'Analyzing...';
        msgs.appendChild(aiBox);

        try {
            const response = await puter.ai.chat(text);
            aiBox.innerHTML = response.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        } catch (e) {
            aiBox.innerText = "Connection error. Please ensure you are logged in.";
        }
        msgs.scrollTop = msgs.scrollHeight;
    }

    run.addEventListener('click', sendMessage);
    document.getElementById('reset').addEventListener('click', () => {
        hub.classList.remove('min');
        msgs.innerHTML = '';
    });
});
