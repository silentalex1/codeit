document.addEventListener('DOMContentLoaded', async () => {
    let session = JSON.parse(sessionStorage.getItem('active_session'));
    if (!session) { window.location.href = "../"; return; }

    const input = document.getElementById('ai-query');
    const genBtn = document.getElementById('gen-action');
    const hub = document.getElementById('hub');
    const scroller = document.getElementById('chat-view');
    const sidebar = document.getElementById('sidebar');
    const restoreBtn = document.getElementById('restore-sidebar');
    const avatar = document.getElementById('user-avatar');
    const dropdown = document.getElementById('user-drop');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');

    let chatHistory = [];
    let state = session.settings || { nickname: session.name, pfp: '', workMode: false, hideSidebar: false };

    const syncUI = () => {
        avatar.style.backgroundImage = state.pfp ? `url(${state.pfp})` : '';
        document.getElementById('set-name').value = state.nickname;
        document.getElementById('set-pfp').value = state.pfp;
        
        if (state.workMode) {
            genBtn.innerText = "Ask";
            document.getElementById('work-lever').classList.add('on');
        }
        if (state.hideSidebar) document.getElementById('side-lever').classList.add('on');
    };
    syncUI();

    const writeMsg = (text, isUser = false, isError = false) => {
        hub.classList.add('up');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'msg-u' : 'msg-ai';
        if (isError) div.classList.add('red-error');
        div.innerHTML = isUser ? text : text.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        scroller.appendChild(div);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const runAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        writeMsg(val, true);
        input.value = '';
        input.style.height = '26px';

        const aiThinking = document.createElement('div');
        aiThinking.className = 'msg-ai';
        aiThinking.innerText = 'Analyzing...';
        scroller.appendChild(aiThinking);

        try {
            const res = await puter.ai.chat(val);
            aiThinking.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            chatHistory.push({ q: val, a: res });
            updateHistoryUI();
            saveCloud();
        } catch (e) {
            aiThinking.innerText = "Connection lost. Please ensure you are logged into Puter.";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const saveCloud = async () => {
        let db = JSON.parse(await puter.kv.get('copilot_db'));
        if (db[session.name]) {
            db[session.name].history = chatHistory;
            db[session.name].settings = state;
            await puter.kv.set('copilot_db', JSON.stringify(db));
        }
    };

    const updateHistoryUI = () => {
        document.getElementById('chat-list').innerHTML = chatHistory.map((h, i) => `
            <div class="hist-item" onclick="loadChat(${i})">${h.q}</div>
        `).join('');
    };

    window.loadChat = (i) => {
        scroller.innerHTML = '';
        writeMsg(chatHistory[i].q, true);
        writeMsg(chatHistory[i].a);
    };

    genBtn.addEventListener('click', runAI);
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
    document.getElementById('open-settings').addEventListener('click', () => settingsModal.style.display = 'flex');
    
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => { if (e.target === m) m.style.display = 'none'; });
    });

    document.querySelectorAll('.s-nav').forEach(nav => {
        nav.addEventListener('click', () => {
            document.querySelectorAll('.s-nav, .tab').forEach(el => el.classList.remove('active'));
            nav.classList.add('active');
            document.getElementById(nav.dataset.tab).classList.add('active');
        });
    });

    document.getElementById('work-lever').addEventListener('click', function() { this.classList.toggle('on'); });
    document.getElementById('side-lever').addEventListener('click', function() { this.classList.toggle('on'); });

    document.getElementById('save-all').addEventListener('click', async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp').value;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        session.settings = state;
        sessionStorage.setItem('active_session', JSON.stringify(session));
        await saveCloud();
        location.reload();
    });

    document.getElementById('clear-history').addEventListener('click', async () => {
        if (confirm("are you sure you want to clear your chat history?")) {
            chatHistory = [];
            updateHistoryUI();
            scroller.innerHTML = '';
            hub.classList.remove('up');
            settingsModal.style.display = 'none';
            await saveCloud();
        }
    });

    document.getElementById('conn-btn').addEventListener('click', () => pluginModal.style.display = 'flex');
    document.getElementById('plug-yes').addEventListener('click', () => { 
        window.open('https://example.com');
        pluginModal.style.display = 'none';
    });
    document.getElementById('plug-no').addEventListener('click', () => {
        pluginModal.style.display = 'none';
        writeMsg("you need to install the plugin for the website to connect and work.", false, true);
    });

    const toggleSearch = () => {
        searchModal.style.display = searchModal.style.display === 'flex' ? 'none' : 'flex';
        if (searchModal.style.display === 'flex') document.getElementById('search-q').focus();
    };

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); toggleSearch(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    document.getElementById('search-q').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const matches = chatHistory.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-results').innerHTML = matches.map(m => `
            <div class="hist-item" onclick="loadHistMatch('${m.q}')">${m.q}</div>
        `).join('');
    });

    window.loadHistMatch = (q) => {
        const item = chatHistory.find(h => h.q === q);
        if (item) {
            searchModal.style.display = 'none';
            scroller.innerHTML = '';
            writeMsg(item.q, true);
            writeMsg(item.a);
        }
    };

    document.querySelectorAll('.sq-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.p;
            input.focus();
        });
    });

    document.getElementById('mob-menu').addEventListener('click', () => sidebar.classList.toggle('open'));
    document.getElementById('new-chat-btn').addEventListener('click', () => location.reload());
    document.getElementById('logout').addEventListener('click', () => { sessionStorage.clear(); window.location.href = "../"; });

    let raw = await puter.kv.get('copilot_db');
    if (raw) {
        let db = JSON.parse(raw);
        if (db[session.name]) {
            chatHistory = db[session.name].history || [];
            updateHistoryUI();
        }
    }
});
