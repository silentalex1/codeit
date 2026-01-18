document.addEventListener('DOMContentLoaded', async () => {
    let sessionRaw = sessionStorage.getItem('copilot_session');
    if (!sessionRaw) { window.location.href = "../"; return; }
    let session = JSON.parse(sessionRaw);

    const input = document.getElementById('ai-query');
    const genBtn = document.getElementById('gen-action');
    const hub = document.getElementById('hub');
    const scroller = document.getElementById('chat-scroller');
    const sidebar = document.getElementById('sidebar');
    const restoreBtn = document.getElementById('restore-btn');
    const avatar = document.getElementById('u-avatar');
    const dropdown = document.getElementById('u-dropdown');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');

    let history = [];
    let state = { nickname: session.name, pfp: '', workMode: false, hideSidebar: false };

    const loadCloudData = async () => {
        let db = JSON.parse(await puter.kv.get('copilot_db') || '{}');
        if (db[session.name]) {
            state = db[session.name].settings || state;
            history = db[session.name].history || [];
            syncState();
            renderHistory();
        }
    };

    const syncState = () => {
        if (avatar) avatar.style.backgroundImage = state.pfp ? `url(${state.pfp})` : '';
        const setNickname = document.getElementById('set-name');
        const setPfp = document.getElementById('set-pfp');
        
        if (setNickname) setNickname.value = state.nickname;
        if (setPfp) setPfp.value = state.pfp;
        
        if (state.workMode) {
            genBtn.innerText = "Ask";
            document.getElementById('work-lever').classList.add('on');
        }
        if (state.hideSidebar) document.getElementById('side-lever').classList.add('on');
    };

    const saveCloud = async () => {
        let db = JSON.parse(await puter.kv.get('copilot_db') || '{}');
        if (db[session.name]) {
            db[session.name].settings = state;
            db[session.name].history = history;
            await puter.kv.set('copilot_db', JSON.stringify(db));
        }
    };

    const addMessage = (text, isUser = false, isError = false) => {
        hub.classList.add('active');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'msg-user' : 'msg-ai';
        if (isError) div.classList.add('error');
        div.innerHTML = isUser ? text : text.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        scroller.appendChild(div);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const runAction = async () => {
        const val = input.value.trim();
        if (!val) return;
        addMessage(val, true);
        input.value = '';
        input.style.height = '26px';

        const aiThinking = document.createElement('div');
        aiThinking.className = 'msg-ai';
        aiThinking.innerText = 'Analyzing...';
        scroller.appendChild(aiThinking);

        try {
            const res = await puter.ai.chat(val);
            aiThinking.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            history.push({ q: val, a: res });
            renderHistory();
            saveCloud();
        } catch (e) {
            aiThinking.innerText = "Error: Please check your Puter session.";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const renderHistory = () => {
        document.getElementById('history-box').innerHTML = history.map((h, i) => `
            <div class="hist-item" onclick="viewChat(${i})">${h.q}</div>
        `).join('');
    };

    window.viewChat = (i) => {
        scroller.innerHTML = '';
        addMessage(history[i].q, true);
        addMessage(history[i].a);
    };

    genBtn.addEventListener('click', runAction);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAction(); }
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

    document.querySelectorAll('.s-link').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.s-link, .tab').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        });
    });

    document.getElementById('work-lever').addEventListener('click', function() { this.classList.toggle('on'); });
    document.getElementById('side-lever').addEventListener('click', function() { this.classList.toggle('on'); });

    document.getElementById('save-all-btn').addEventListener('click', async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp').value;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        await saveCloud();
        location.reload();
    });

    document.getElementById('clear-hist-btn').addEventListener('click', async () => {
        if (confirm("Clear history?")) {
            history = [];
            await saveCloud();
            location.reload();
        }
    });

    document.getElementById('connect-plugin').addEventListener('click', () => pluginModal.style.display = 'flex');
    document.getElementById('plug-yes').addEventListener('click', () => { window.open('https://example.com'); pluginModal.style.display = 'none'; });
    document.getElementById('plug-no').addEventListener('click', () => {
        pluginModal.style.display = 'none';
        addMessage("you need to install the plugin for the website to connect and work.", false, true);
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
        const matches = history.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-results').innerHTML = matches.map(m => `
            <div class="hist-item" onclick="loadHistMatch('${m.q}')">${m.q}</div>
        `).join('');
    });

    window.loadHistMatch = (q) => {
        const item = history.find(h => h.q === q);
        if (item) {
            searchModal.style.display = 'none';
            scroller.innerHTML = '';
            addMessage(item.q, true);
            addMessage(item.a);
        }
    };

    document.querySelectorAll('.sq-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.p;
            input.focus();
        });
    });

    document.getElementById('mob-toggle').addEventListener('click', () => sidebar.classList.toggle('open'));
    document.getElementById('new-chat-btn').addEventListener('click', () => location.reload());
    document.getElementById('logout-btn').addEventListener('click', () => { sessionStorage.clear(); window.location.href = "../"; });

    await loadCloudData();
});
