document.addEventListener('DOMContentLoaded', async () => {
    let session = JSON.parse(sessionStorage.getItem('active_session'));
    if (!session) { window.location.href = "../"; return; }

    const input = document.getElementById('ai-query');
    const genBtn = document.getElementById('gen-action');
    const hub = document.getElementById('hub');
    const scroller = document.getElementById('chat-view');
    const sidebar = document.getElementById('sidebar');
    const restoreBtn = document.getElementById('restore-sidebar');
    const pfpTrigger = document.getElementById('user-avatar');
    const pfpMenu = document.getElementById('user-drop');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');

    let history = [];
    let state = session.settings || { nickname: session.name, pfp: '', workMode: false, hideSidebar: false };

    const syncUI = () => {
        document.getElementById('user-avatar').style.backgroundImage = state.pfp ? `url(${state.pfp})` : '';
        document.getElementById('set-name').value = state.nickname;
        document.getElementById('set-pfp').value = state.pfp;
        
        if (state.workMode) {
            genBtn.innerText = "Ask";
            genBtn.classList.add('work-mode');
            document.getElementById('work-lever').classList.add('on');
        } else {
            genBtn.innerText = "Generate";
            genBtn.classList.remove('work-mode');
            document.getElementById('work-lever').classList.remove('on');
        }

        if (state.hideSidebar) {
            document.getElementById('side-lever').classList.add('on');
        } else {
            document.getElementById('side-lever').classList.remove('on');
        }
    };
    syncUI();

    const renderMessage = (text, isUser = false, isError = false) => {
        hub.classList.add('up');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'msg-u' : 'msg-ai';
        if (isError) div.classList.add('red-error');
        
        if (isUser) {
            div.innerText = text;
        } else {
            div.innerHTML = text.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        }
        
        scroller.appendChild(div);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const processAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        renderMessage(val, true);
        input.value = '';
        input.style.height = '26px';

        const aiPlaceholder = document.createElement('div');
        aiPlaceholder.className = 'msg-ai';
        aiPlaceholder.innerText = 'Analyzing...';
        scroller.appendChild(aiPlaceholder);

        try {
            const res = await puter.ai.chat(val);
            aiPlaceholder.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            history.push({ q: val, a: res });
            updateHistory();
        } catch (e) {
            aiPlaceholder.innerText = "Error: Please check your Puter session.";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const updateHistory = () => {
        const list = document.getElementById('chat-list');
        list.innerHTML = history.map((h, i) => `
            <div class="hist-item" onclick="viewHistory(${i})">${h.q}</div>
        `).join('');
    };

    window.viewHistory = (i) => {
        hub.classList.add('up');
        scroller.style.display = 'block';
        scroller.innerHTML = '';
        renderMessage(history[i].q, true);
        renderMessage(history[i].a);
    };

    genBtn.addEventListener('click', processAI);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); processAI(); }
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

    pfpTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        pfpMenu.classList.toggle('active');
    });

    document.addEventListener('click', () => pfpMenu.classList.remove('active'));

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

        let db = JSON.parse(await puter.kv.get('copilot_db'));
        db[session.name].settings = state;
        await puter.kv.set('copilot_db', JSON.stringify(db));
        
        session.settings = state;
        sessionStorage.setItem('active_session', JSON.stringify(session));
        location.reload();
    });

    document.getElementById('clear-history').addEventListener('click', async () => {
        if (confirm("are you sure you want to clear your chat history?")) {
            history = [];
            updateHistory();
            scroller.innerHTML = '';
            hub.classList.remove('up');
            settingsModal.style.display = 'none';
        }
    });

    document.getElementById('conn-btn').addEventListener('click', () => pluginModal.style.display = 'flex');
    document.getElementById('plug-yes').addEventListener('click', () => { 
        window.open('https://example.com');
        pluginModal.style.display = 'none';
    });
    document.getElementById('plug-no').addEventListener('click', () => {
        pluginModal.style.display = 'none';
        renderMessage("you need to install the plugin for the website to connect and work.", false, true);
    });

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchModal.style.display = 'flex'; document.getElementById('search-q').focus(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    document.getElementById('search-q').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const matches = history.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-results').innerHTML = matches.map(m => `
            <div class="hist-item" onclick="viewHistoryItem('${m.q}')">${m.q}</div>
        `).join('');
    });

    window.viewHistoryItem = (query) => {
        const item = history.find(h => h.q === query);
        if (item) {
            searchModal.style.display = 'none';
            scroller.innerHTML = '';
            renderMessage(item.q, true);
            renderMessage(item.a);
        }
    };

    document.querySelectorAll('.sq-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.p;
            input.focus();
        });
    });

    document.getElementById('mob-menu').addEventListener('click', () => sidebar.classList.toggle('open'));
    document.getElementById('logout').addEventListener('click', () => { sessionStorage.clear(); window.location.href = "../"; });

    let db = await puter.kv.get('copilot_db');
    if (db) {
        let accounts = JSON.parse(db);
        history = accounts[session.name].history || [];
        updateHistory();
    }
});
