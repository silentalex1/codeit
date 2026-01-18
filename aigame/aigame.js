document.addEventListener('DOMContentLoaded', async () => {
    let session = JSON.parse(sessionStorage.getItem('copilot_session'));
    if (!session) { window.location.href = "../"; return; }

    const input = document.getElementById('ai-input');
    const submitBtn = document.getElementById('btn-submit');
    const hub = document.getElementById('hub-ui');
    const scroller = document.getElementById('chat-scroller');
    const sidebar = document.getElementById('sidebar');
    const restoreBtn = document.getElementById('sidebar-restore');
    const avatar = document.getElementById('user-avatar');
    const dropdown = document.getElementById('pfp-dropdown');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');

    let chatHistory = [];
    let state = session.settings || { nickname: session.username, pfp: '', workMode: false, hideSidebar: false };

    const syncStateUI = () => {
        avatar.style.backgroundImage = state.pfp ? `url(${state.pfp})` : '';
        document.getElementById('set-nickname').value = state.nickname;
        document.getElementById('set-pfp').value = state.pfp;
        
        if (state.workMode) {
            submitBtn.innerText = "Ask";
            submitBtn.classList.add('work-mode-btn');
            document.getElementById('work-mode-lever').classList.add('on');
        } else {
            submitBtn.innerText = "Generate";
            submitBtn.classList.remove('work-mode-btn');
            document.getElementById('work-mode-lever').classList.remove('on');
        }

        if (state.hideSidebar) {
            document.getElementById('side-toggle-lever').classList.add('on');
        } else {
            document.getElementById('side-toggle-lever').classList.remove('on');
        }
    };
    syncStateUI();

    const writeMessage = (text, isUser = false, isError = false) => {
        hub.classList.add('minimized');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'msg-u' : 'msg-ai';
        if (isError) div.classList.add('error-ai');
        
        if (isUser) {
            div.innerText = text;
        } else {
            div.innerHTML = text.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        }
        
        scroller.appendChild(div);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const runAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        writeMessage(val, true);
        input.value = '';
        input.style.height = '26px';

        const aiThinking = document.createElement('div');
        aiThinking.className = 'msg-ai';
        aiThinking.innerText = 'Analyzing...';
        scroller.appendChild(aiThinking);

        try {
            const res = await puter.ai.chat(val, { model: 'gemini-1.5-pro-latest' });
            aiThinking.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            chatHistory.push({ q: val, a: res });
            refreshHistoryUI();
            saveSessionToCloud();
        } catch (e) {
            aiThinking.innerText = "Connection lost. Please ensure you are logged in via Puter.";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const saveSessionToCloud = async () => {
        let db = JSON.parse(await puter.kv.get('codeit_copilot_users'));
        db[session.username].history = chatHistory;
        db[session.username].settings = state;
        await puter.kv.set('codeit_copilot_users', JSON.stringify(db));
    };

    const refreshHistoryUI = () => {
        const container = document.getElementById('history-container');
        container.innerHTML = chatHistory.map((h, i) => `
            <div class="hist-item" onclick="loadHist(${i})">${h.q}</div>
        `).join('');
    };

    window.loadHist = (i) => {
        hub.classList.add('minimized');
        scroller.style.display = 'block';
        scroller.innerHTML = '';
        writeMessage(chatHistory[i].q, true);
        writeMessage(chatHistory[i].a);
    };

    submitBtn.addEventListener('click', runAI);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); }
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    });

    sidebar.addEventListener('dblclick', () => {
        if (state.hideSidebar || window.innerWidth < 1024) {
            sidebar.classList.add('hidden');
            restoreBtn.style.display = 'block';
        }
    });

    restoreBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        restoreBtn.style.display = 'none';
    });

    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => dropdown.classList.remove('active'));

    document.getElementById('btn-settings').addEventListener('click', () => settingsModal.style.display = 'flex');
    
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => { if (e.target === m) m.style.display = 'none'; });
    });

    document.querySelectorAll('.s-link').forEach(nav => {
        nav.addEventListener('click', () => {
            document.querySelectorAll('.s-link, .tab-content').forEach(el => el.classList.remove('active'));
            nav.classList.add('active');
            document.getElementById(nav.dataset.tab).classList.add('active');
        });
    });

    document.getElementById('work-mode-lever').addEventListener('click', function() { this.classList.toggle('on'); });
    document.getElementById('side-toggle-lever').addEventListener('click', function() { this.classList.toggle('on'); });

    document.getElementById('save-settings').addEventListener('click', async () => {
        state.nickname = document.getElementById('set-nickname').value;
        state.pfp = document.getElementById('set-pfp').value;
        state.workMode = document.getElementById('work-mode-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-toggle-lever').classList.contains('on');

        session.settings = state;
        sessionStorage.setItem('copilot_session', JSON.stringify(session));
        await saveSessionToCloud();
        location.reload();
    });

    document.getElementById('clear-history').addEventListener('click', async () => {
        if (confirm("are you sure you want to clear your chat history?")) {
            chatHistory = [];
            refreshHistoryUI();
            scroller.innerHTML = '';
            hub.classList.remove('minimized');
            settingsModal.style.display = 'none';
            await saveSessionToCloud();
        }
    });

    document.getElementById('btn-plugin').addEventListener('click', () => pluginModal.style.display = 'flex');
    document.getElementById('plugin-yes').addEventListener('click', () => { 
        window.open('https://example.com');
        pluginModal.style.display = 'none';
    });
    document.getElementById('plugin-no').addEventListener('click', () => {
        pluginModal.style.display = 'none';
        writeMessage("you need to install the plugin for the website to connect and work.", false, true);
    });

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchModal.style.display = 'flex'; document.getElementById('search-input').focus(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const matches = chatHistory.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-results').innerHTML = matches.map(m => `
            <div class="hist-item" onclick="viewSearchMatch('${m.q}')">${m.q}</div>
        `).join('');
    });

    window.viewSearchMatch = (query) => {
        const item = chatHistory.find(h => h.q === query);
        if (item) {
            searchModal.style.display = 'none';
            scroller.innerHTML = '';
            writeMessage(item.q, true);
            writeMessage(item.a);
        }
    };

    document.querySelectorAll('.sq-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.p;
            input.focus();
        });
    });

    document.getElementById('mob-burger').addEventListener('click', () => sidebar.classList.toggle('open'));
    document.getElementById('btn-logout').addEventListener('click', () => { sessionStorage.clear(); window.location.href = "../"; });

    let dbRaw = await puter.kv.get('codeit_copilot_users');
    if (dbRaw) {
        let db = JSON.parse(dbRaw);
        if (db[session.username]) {
            chatHistory = db[session.username].history || [];
            refreshHistoryUI();
        }
    }
});
