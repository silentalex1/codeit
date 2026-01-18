const API_URL = "http://localhost:3000/api";

document.addEventListener('DOMContentLoaded', async () => {
    let auth = JSON.parse(sessionStorage.getItem('copilot_auth'));
    if (!auth) { window.location.href = "../"; return; }

    const response = await fetch(`${API_URL}/user/${auth.username}`);
    const userData = await response.json();
    let history = userData.history || [];
    let settings = userData.settings || { nickname: auth.username, pfp: '', workMode: false, hideSidebar: false };

    const hub = document.getElementById('hub-container');
    const scroller = document.getElementById('chat-scroller');
    const input = document.getElementById('main-prompt');
    const genBtn = document.getElementById('submit-gen');
    const sidebar = document.getElementById('side-panel');
    const restoreBtn = document.getElementById('side-restore');

    const updateUIState = () => {
        document.getElementById('top-pfp').style.backgroundImage = settings.pfp ? `url(${settings.pfp})` : '';
        document.getElementById('set-nick').value = settings.nickname;
        document.getElementById('set-pfp').value = settings.pfp;
        
        if (settings.workMode) {
            genBtn.innerText = "Ask";
            genBtn.classList.add('ask-mode');
            document.getElementById('work-mode-lever').classList.add('active');
        } else {
            genBtn.innerText = "Generate";
            genBtn.classList.remove('ask-mode');
            document.getElementById('work-mode-lever').classList.remove('active');
        }

        if (settings.hideSidebar) {
            document.getElementById('side-toggle-lever').classList.add('active');
        }
    };
    updateUIState();

    const saveToServer = async () => {
        await fetch(`${API_URL}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: auth.username, settings, history })
        });
    };

    const addMessage = (text, isUser = false, isError = false) => {
        hub.classList.add('active');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'u-bubble' : 'ai-bubble';
        if (isError) div.classList.add('red-error');
        
        if (isUser) div.innerText = text;
        else div.innerHTML = text.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        
        scroller.appendChild(div);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const handleChat = async () => {
        const val = input.value.trim();
        if (!val) return;
        addMessage(val, true);
        input.value = '';
        input.style.height = '24px';

        const aiB = document.createElement('div');
        aiB.className = 'ai-bubble';
        aiB.innerText = 'Thinking...';
        scroller.appendChild(aiB);

        try {
            const res = await puter.ai.chat(val);
            aiB.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            history.push({ q: val, a: res });
            renderHistory();
            saveToServer();
        } catch (e) {
            aiB.innerText = "Error. Puter AI connection failed.";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const renderHistory = () => {
        const list = document.getElementById('chat-list');
        list.innerHTML = history.map((h, i) => `
            <div class="hist-item" onclick="loadHistoryItem(${i})">${h.q}</div>
        `).join('');
    };
    renderHistory();

    window.loadHistoryItem = (i) => {
        scroller.innerHTML = '';
        hub.classList.add('active');
        scroller.style.display = 'block';
        addMessage(history[i].q, true);
        addMessage(history[i].a);
    };

    genBtn.addEventListener('click', handleChat);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); }
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    });

    sidebar.addEventListener('dblclick', () => {
        if (settings.hideSidebar || window.innerWidth < 1024) {
            sidebar.classList.add('hidden');
            restoreBtn.style.display = 'block';
        }
    });

    restoreBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        restoreBtn.style.display = 'none';
    });

    document.getElementById('top-pfp').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('user-dropdown').classList.toggle('active');
    });

    document.addEventListener('click', () => {
        document.getElementById('user-dropdown').classList.remove('active');
    });

    document.getElementById('open-settings-ui').addEventListener('click', () => {
        document.getElementById('settings-modal').style.display = 'flex';
    });

    document.querySelectorAll('.s-link').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.s-link, .tab-pane').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        });
    });

    document.getElementById('work-mode-lever').addEventListener('click', function() { this.classList.toggle('active'); });
    document.getElementById('side-toggle-lever').addEventListener('click', function() { this.classList.toggle('active'); });

    document.getElementById('save-all').addEventListener('click', async () => {
        settings.nickname = document.getElementById('set-nick').value;
        settings.pfp = document.getElementById('set-pfp').value;
        settings.workMode = document.getElementById('work-mode-lever').classList.contains('active');
        settings.hideSidebar = document.getElementById('side-toggle-lever').classList.contains('active');
        await saveToServer();
        location.reload();
    });

    document.getElementById('clear-all').addEventListener('click', async () => {
        if (confirm("are you sure you want to clear your chat history?")) {
            history = [];
            await saveToServer();
            location.reload();
        }
    });

    document.getElementById('btn-plugin').addEventListener('click', () => {
        document.getElementById('plugin-modal').style.display = 'flex';
    });

    document.getElementById('plug-yes').addEventListener('click', () => { window.open('https://example.com'); });
    document.getElementById('plug-no').addEventListener('click', () => {
        document.getElementById('plugin-modal').style.display = 'none';
        addMessage("you need to install the plugin for the website to connect and work.", false, true);
    });

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            document.getElementById('search-modal').style.display = 'flex';
            document.getElementById('search-input').focus();
        }
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-wrap').forEach(m => m.style.display = 'none');
        }
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = history.filter(h => h.q.toLowerCase().includes(val));
        document.getElementById('search-res-list').innerHTML = filtered.map(f => `
            <div class="hist-item" onclick="loadSearchItem('${f.q}')">${f.q}</div>
        `).join('');
    });

    window.loadSearchItem = (query) => {
        const item = history.find(h => h.q === query);
        if (item) {
            document.getElementById('search-modal').style.display = 'none';
            scroller.innerHTML = '';
            addMessage(item.q, true);
            addMessage(item.a);
        }
    };

    document.querySelectorAll('.opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.p;
            input.focus();
        });
    });

    document.getElementById('menu-burger').addEventListener('click', () => sidebar.classList.toggle('open'));
    document.getElementById('logout-trigger').addEventListener('click', () => { sessionStorage.clear(); window.location.href = "../"; });
});
