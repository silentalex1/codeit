document.addEventListener('DOMContentLoaded', async () => {
    const session = sessionStorage.getItem('cp_session');
    const isPuter = await puter.auth.isSignedIn();
    if (!session && !isPuter) { window.location.href = "../"; return; }

    const input = document.getElementById('prompt-input');
    const send = document.getElementById('send-btn');
    const hub = document.getElementById('hub-container');
    const output = document.getElementById('chat-output');
    const modal = document.getElementById('search-modal');
    const sidebar = document.getElementById('sidebar');
    const historyList = document.getElementById('history-box');

    let history = [];

    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;

        hub.classList.add('shifted');
        output.innerHTML += `<div class="msg-u">${text}</div>`;
        
        const loader = document.createElement('div');
        loader.className = 'msg-ai';
        loader.innerText = 'Creating...';
        output.appendChild(loader);
        
        input.value = '';
        history.push(text);
        renderHistory();

        try {
            const res = await puter.ai.chat(text);
            loader.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        } catch(e) { loader.innerText = "Error loading AI. Try again."; }
        
        output.scrollTop = output.scrollHeight;
    };

    const renderHistory = () => {
        historyList.innerHTML = history.map(h => `<div class="history-item">${h.substring(0,25)}...</div>`).join('');
    };

    const toggleSearch = () => {
        modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
        if(modal.style.display === 'flex') document.getElementById('search-input').focus();
    };

    window.addEventListener('keydown', (e) => {
        if(e.ctrlKey && e.key === 'k') { e.preventDefault(); toggleSearch(); }
        if(e.key === 'Enter' && !e.shiftKey && document.activeElement === input) { e.preventDefault(); sendMessage(); }
        if(e.key === 'Escape') modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => { if(e.target === modal) modal.style.display = 'none'; });

    document.getElementById('menu-toggle').addEventListener('click', () => sidebar.classList.toggle('open'));
    document.getElementById('search-box-btn').addEventListener('click', toggleSearch);
    document.getElementById('new-chat-btn').addEventListener('click', () => { hub.classList.remove('shifted'); output.innerHTML = ''; });
    document.getElementById('logout').addEventListener('click', () => { sessionStorage.clear(); puter.auth.signOut(); window.location.href="../"; });

    document.querySelectorAll('.pill').forEach(p => p.addEventListener('click', () => { input.value = p.dataset.p; input.focus(); }));
});
