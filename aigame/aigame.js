document.addEventListener('DOMContentLoaded', async () => {
    const input = document.getElementById('ai-input');
    const trigger = document.getElementById('send-trigger');
    const hub = document.getElementById('hub');
    const stream = document.getElementById('chat-stream');
    const searchOverlay = document.getElementById('search-overlay');
    const historyBox = document.getElementById('history');

    let chatHistory = [];

    const startChat = async () => {
        const val = input.value.trim();
        if(!val) return;

        hub.classList.add('active');
        stream.innerHTML += `<div class="user-msg">${val}</div>`;
        
        const aiBox = document.createElement('div');
        aiBox.className = 'ai-msg';
        aiBox.innerText = 'Creating your imagination...';
        stream.appendChild(aiBox);
        
        input.value = '';
        chatHistory.push(val);
        updateHistory();

        try {
            const res = await puter.ai.chat(val, { model: 'gemini-1.5-pro-latest' });
            aiBox.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        } catch(e) { aiBox.innerText = "Error loading Gemini 3."; }
        
        stream.scrollTop = stream.scrollHeight;
    };

    const updateHistory = () => {
        historyBox.innerHTML = chatHistory.map(h => `<div class="hist-item">${h.substring(0, 30)}...</div>`).join('');
    };

    window.addEventListener('keydown', (e) => {
        if(e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            searchOverlay.style.display = 'flex';
            document.getElementById('search-input').focus();
        }
        if(e.key === 'Escape') searchOverlay.style.display = 'none';
    });

    document.querySelectorAll('.pill').forEach(p => {
        p.addEventListener('click', () => {
            input.value = p.dataset.prompt;
            input.focus();
        });
    });

    trigger.addEventListener('click', startChat);
    input.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startChat(); } });

    document.getElementById('reset-ui').addEventListener('click', () => {
        hub.classList.remove('active');
        stream.innerHTML = '';
    });
});
