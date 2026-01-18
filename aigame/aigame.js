document.addEventListener('DOMContentLoaded', async () => {
    const rawSession = sessionStorage.getItem('copilot_session');
    if (!rawSession) {
        window.location.href = "../";
        return;
    }
    const session = JSON.parse(rawSession);

    const input = document.getElementById('ai-input');
    const genBtn = document.getElementById('btn-gen');
    const hub = document.getElementById('hub-ui');
    const scroller = document.getElementById('chat-scroller');
    const sidebar = document.getElementById('sidebar');
    const restoreBtn = document.getElementById('sidebar-restore');
    const avatar = document.getElementById('user-avatar');
    const dropMenu = document.getElementById('avatar-drop');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');
    const pfpFile = document.getElementById('pfp-file');
    const pfpPreview = document.getElementById('pfp-preview');
    const dropHint = document.getElementById('drop-hint');

    let history = [];
    let state = {
        nickname: session.username,
        pfp: '',
        workMode: false,
        hideSidebar: false
    };

    const loadCloud = async () => {
        const raw = await puter.kv.get('codeit_copilot_users');
        const db = JSON.parse(raw || '{}');
        if (db[session.username]) {
            state = db[session.username].settings || state;
            history = db[session.username].history || [];
            syncUI();
            renderHistory();
        }
    };

    const syncUI = () => {
        if (avatar) avatar.style.backgroundImage = state.pfp ? 'url(' + state.pfp + ')' : '';
        const nameInp = document.getElementById('set-name');
        const pfpInp = document.getElementById('set-pfp');
        if (nameInp) nameInp.value = state.nickname;
        if (pfpInp) pfpInp.value = state.pfp;
        
        if (state.pfp) {
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropHint.style.display = 'none';
        }

        if (state.workMode) {
            genBtn.innerText = 'Ask';
            genBtn.classList.add('mode-work');
            document.getElementById('work-lever').classList.add('on');
        } else {
            genBtn.innerText = 'Generate';
            genBtn.classList.remove('mode-work');
            document.getElementById('work-lever').classList.remove('on');
        }

        if (state.hideSidebar) {
            document.getElementById('side-lever').classList.add('on');
        }
    };

    const saveCloud = async () => {
        const raw = await puter.kv.get('codeit_copilot_users');
        const db = JSON.parse(raw || '{}');
        db[session.username] = {
            password: db[session.username]?.password || '',
            settings: state,
            history: history
        };
        await puter.kv.set('codeit_copilot_users', JSON.stringify(db));
    };

    const pushMessage = (text, isUser = false, isError = false) => {
        hub.classList.add('active');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'msg-u' : 'msg-ai';
        if (isError) div.style.borderColor = '#ef4444';
        
        if (isUser) {
            div.innerText = text;
        } else {
            div.innerHTML = text.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        }
        scroller.appendChild(div);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const startAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        pushMessage(val, true);
        input.value = '';
        input.style.height = '26px';

        const thinking = document.createElement('div');
        thinking.className = 'msg-ai';
        thinking.innerText = 'Analyzing...';
        scroller.appendChild(thinking);

        try {
            const res = await puter.ai.chat(val);
            thinking.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            history.push({ q: val, a: res });
            renderHistory();
            saveCloud();
        } catch (e) {
            thinking.innerText = 'Connection Error: Puter session timeout.';
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const renderHistory = () => {
        const box = document.getElementById('history-box');
        box.innerHTML = history.map((h, i) => '<div class="hist-item" onclick="loadHistory(' + i + ')">' + h.q + '</div>').join('');
    };

    window.loadHistory = (i) => {
        scroller.innerHTML = '';
        pushMessage(history[i].q, true);
        pushMessage(history[i].a);
    };

    const handleFile = (file) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            state.pfp = e.target.result;
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropHint.style.display = 'none';
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('pfp-zone').onclick = () => pfpFile.click();
    pfpFile.onchange = (e) => handleFile(e.target.files[0]);
    document.getElementById('pfp-zone').ondragover = (e) => e.preventDefault();
    document.getElementById('pfp-zone').ondrop = (e) => {
        e.preventDefault();
        handleFile(e.dataTransfer.files[0]);
    };

    genBtn.addEventListener('click', startAI);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            startAI();
        }
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
        dropMenu.classList.toggle('active');
    });

    document.addEventListener('click', () => dropMenu.classList.remove('active'));

    document.getElementById('settings-trigger').onclick = () => settingsModal.style.display = 'flex';

    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => { if (e.target === m) m.style.display = 'none'; });
    });

    document.querySelectorAll('.s-nav').forEach(nav => {
        nav.onclick = () => {
            document.querySelectorAll('.s-nav, .tab-pane').forEach(el => el.classList.remove('active'));
            nav.classList.add('active');
            document.getElementById(nav.dataset.tab).classList.add('active');
        };
    });

    document.getElementById('work-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('side-lever').onclick = function() { this.classList.toggle('on'); };

    document.getElementById('save-settings').onclick = async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp').value || state.pfp;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        await saveCloud();
        location.reload();
    };

    document.getElementById('clear-history').onclick = async () => {
        if (confirm('Clear all chat history?')) {
            history = [];
            renderHistory();
            scroller.innerHTML = '';
            hub.classList.remove('active');
            settingsModal.style.display = 'none';
            await saveCloud();
        }
    };

    document.getElementById('connect-btn').onclick = () => pluginModal.style.display = 'flex';
    document.getElementById('plug-yes').onclick = () => window.open('https://example.com');
    document.getElementById('plug-no').onclick = () => {
        pluginModal.style.display = 'none';
        pushMessage('you need to install the plugin for the website to connect and work.', false, true);
    };

    const toggleSearch = () => {
        const isOn = searchModal.style.display === 'flex';
        searchModal.style.display = isOn ? 'none' : 'flex';
        if (!isOn) document.getElementById('search-q').focus();
    };

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); toggleSearch(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    document.getElementById('search-q').oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const results = history.filter(h => h.q.toLowerCase().includes(query));
        document.getElementById('search-results').innerHTML = results.map(r => '<div class="hist-item" onclick="loadMatch(\'' + r.q.replace(/'/g, "\\'") + '\')">' + r.q + '</div>').join('');
    };

    window.loadMatch = (q) => {
        const item = history.find(h => h.q === q);
        if (item) {
            searchModal.style.display = 'none';
            scroller.innerHTML = '';
            pushMessage(item.q, true);
            pushMessage(item.a);
        }
    };

    document.querySelectorAll('.sq-option').forEach(btn => {
        btn.onclick = () => { input.value = btn.dataset.p; input.focus(); };
    });

    document.getElementById('mob-menu').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('new-chat-btn').onclick = () => location.reload();
    document.getElementById('logout-trigger').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('puter-reauth').onclick = () => puter.auth.signIn().then(() => location.reload());

    await loadCloud();
});
