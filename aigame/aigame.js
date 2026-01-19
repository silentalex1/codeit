document.addEventListener('DOMContentLoaded', async () => {
    let session = JSON.parse(sessionStorage.getItem('copilot_session'));
    if (!session) { window.location.href = "../"; return; }

    const input = document.getElementById('ai-query');
    const genBtn = document.getElementById('gen-action');
    const hub = document.getElementById('hub');
    const scroller = document.getElementById('chat-scroller');
    const sidebar = document.getElementById('sidebar');
    const restoreBtn = document.getElementById('restore-tab');
    const avatar = document.getElementById('u-avatar');
    const dropdown = document.getElementById('u-dropdown');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');
    const pfpInput = document.getElementById('pfp-file');
    const pfpPreview = document.getElementById('pfp-preview');
    const dropContent = document.getElementById('drop-content');

    let history = [];
    let state = { nickname: session.name, pfp: '', workMode: false, hideSidebar: false };

    const loadCloud = async () => {
        let db = JSON.parse(await puter.kv.get('copilot_db') || '{}');
        if (db[session.name]) {
            state = db[session.name].settings || state;
            history = db[session.name].history || [];
            syncUI();
            updateHistoryUI();
        }
    };

    const syncUI = () => {
        if (avatar) avatar.style.backgroundImage = state.pfp ? `url(${state.pfp})` : '';
        document.getElementById('set-name').value = state.nickname;
        document.getElementById('set-pfp').value = state.pfp;
        
        if (state.pfp) {
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropContent.style.display = 'none';
        }

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

    const sendMsg = (text, isUser = false, isError = false) => {
        hub.classList.add('active');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'msg-u' : 'msg-ai';
        if (isError) div.style.color = '#ef4444';
        div.innerHTML = isUser ? text : text.replace(/```lua([\s\S]*?)```/g, '<pre style="background:#000;padding:20px;border-radius:14px;color:#4ade80;overflow-x:auto;margin-top:15px;">$1</pre>');
        scroller.appendChild(div);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const runAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        sendMsg(val, true);
        input.value = '';
        input.style.height = '26px';

        const aiThinking = document.createElement('div');
        aiThinking.className = 'msg-ai';
        aiThinking.innerText = 'Analyzing...';
        scroller.appendChild(aiThinking);

        try {
            const res = await puter.ai.chat(val);
            aiThinking.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre style="background:#000;padding:20px;border-radius:14px;color:#4ade80;overflow-x:auto;margin-top:15px;">$1</pre>');
            history.push({ q: val, a: res });
            updateHistoryUI();
            saveCloud();
        } catch (e) {
            aiThinking.innerText = "Error: Please check your Puter session.";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const updateHistoryUI = () => {
        document.getElementById('chat-history').innerHTML = history.map((h, i) => `
            <div class="hist-item" onclick="loadChat(${i})">${h.q}</div>
        `).join('');
    };

    window.loadChat = (i) => {
        scroller.innerHTML = '';
        sendMsg(history[i].q, true);
        sendMsg(history[i].a);
    };

    const handleFile = (file) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            state.pfp = e.target.result;
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropContent.style.display = 'none';
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('pfp-drop-zone').onclick = () => pfpInput.click();
    pfpInput.onchange = (e) => handleFile(e.target.files[0]);

    document.getElementById('pfp-drop-zone').ondragover = (e) => { e.preventDefault(); };
    document.getElementById('pfp-drop-zone').ondrop = (e) => {
        e.preventDefault();
        handleFile(e.dataTransfer.files[0]);
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

    document.querySelectorAll('.s-link').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.s-link, .tab').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        });
    });

    document.getElementById('work-lever').addEventListener('click', function() { this.classList.toggle('on'); });
    document.getElementById('side-lever').addEventListener('click', function() { this.classList.toggle('on'); });

    document.getElementById('save-all').addEventListener('click', async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp').value || state.pfp;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        session.settings = state;
        sessionStorage.setItem('copilot_session', JSON.stringify(session));
        await saveCloud();
        location.reload();
    });

    document.getElementById('clear-history').addEventListener('click', async () => {
        if (confirm("Clear history?")) {
            history = [];
            await saveCloud();
            location.reload();
        }
    });

    document.getElementById('puter-reauth').onclick = () => puter.auth.signIn().then(() => location.reload());

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
            <div class="hist-item" onclick="loadMatch('${m.q}')">${m.q}</div>
        `).join('');
    });

    window.loadMatch = (q) => {
        const item = history.find(h => h.q === q);
        if (item) {
            searchModal.style.display = 'none';
            scroller.innerHTML = '';
            sendMsg(item.q, true);
            sendMsg(item.a);
        }
    };

    document.querySelectorAll('.sq-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.p;
            input.focus();
        });
    });

    document.getElementById('mob-toggle').addEventListener('click', () => sidebar.classList.toggle('open'));
    document.getElementById('new-chat').addEventListener('click', () => location.reload());
    document.getElementById('logout-btn').addEventListener('click', () => { sessionStorage.clear(); window.location.href = "../"; });

    await loadCloud();
});
