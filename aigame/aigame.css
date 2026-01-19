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
    const pfpFile = document.getElementById('pfp-file');
    const pfpPreview = document.getElementById('pfp-preview');
    const dropContent = document.getElementById('drop-content');

    let history = [];
    let state = { nickname: session.username, pfp: '', workMode: false, hideSidebar: false };

    const loadCloudData = async () => {
        let db = JSON.parse(await puter.kv.get('copilot_db') || '{}');
        if (db[session.username]) {
            state = db[session.username].settings || state;
            history = db[session.username].history || [];
            syncState();
            renderHistory();
        }
    };

    const syncState = () => {
        if (avatar && state.pfp) avatar.style.backgroundImage = 'url(' + state.pfp + ')';
        const setNickname = document.getElementById('set-name');
        const setPfp = document.getElementById('set-pfp-url');
        
        if (setNickname) setNickname.value = state.nickname;
        if (setPfp) setPfp.value = state.pfp;
        
        if (state.pfp && pfpPreview && dropContent) {
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropContent.style.display = 'none';
        }

        if (state.workMode) {
            genBtn.innerText = "Ask";
            genBtn.style.background = "#10b981";
            const workLev = document.getElementById('work-lever');
            if (workLev) workLev.classList.add('on');
        } else {
            genBtn.innerText = "Generate";
            genBtn.style.background = "#3b82f6";
            const workLev = document.getElementById('work-lever');
            if (workLev) workLev.classList.remove('on');
        }

        const sideLev = document.getElementById('side-lever');
        if (state.hideSidebar && sideLev) sideLev.classList.add('on');
    };

    const saveCloud = async () => {
        let db = JSON.parse(await puter.kv.get('copilot_db') || '{}');
        db[session.username] = {
            password: db[session.username]?.password || '',
            settings: state,
            history: history
        };
        await puter.kv.set('copilot_db', JSON.stringify(db));
    };

    const addMessage = (text, isUser = false, isError = false) => {
        hub.classList.add('active');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'msg-u' : 'msg-ai';
        if (isError) div.style.borderColor = '#ef4444';
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
            aiThinking.innerText = "Error: Puter session connection failure.";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const renderHistory = () => {
        const container = document.getElementById('chat-history');
        if (!container) return;
        container.innerHTML = history.map((h, i) => `
            <div class="hist-item" onclick="viewChat(${i})">${h.q}</div>
        `).join('');
    };

    window.viewChat = (i) => {
        scroller.innerHTML = '';
        addMessage(history[i].q, true);
        addMessage(history[i].a);
    };

    genBtn.onclick = runAction;
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAction(); }
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    };

    sidebar.ondblclick = () => {
        if (state.hideSidebar || window.innerWidth < 1024) {
            sidebar.classList.add('hidden');
            restoreBtn.style.display = 'block';
        }
    };

    restoreBtn.onclick = () => {
        sidebar.classList.remove('hidden');
        restoreBtn.style.display = 'none';
    };

    avatar.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    };

    document.onclick = () => dropdown.classList.remove('active');

    document.getElementById('open-settings').onclick = () => settingsModal.style.display = 'flex';
    
    document.querySelectorAll('.modal').forEach(m => {
        m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; };
    });

    document.querySelectorAll('.s-link').forEach(link => {
        link.onclick = () => {
            document.querySelectorAll('.s-link, .tab').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        };
    });

    document.getElementById('work-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('side-lever').onclick = function() { this.classList.toggle('on'); };

    document.getElementById('pfp-drop-zone').onclick = () => pfpFile.click();
    pfpFile.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (x) => { state.pfp = x.target.result; syncState(); };
        reader.readAsDataURL(e.target.files[0]);
    };

    document.getElementById('save-all-btn').onclick = async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp-url').value || state.pfp;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        await saveCloud();
        location.reload();
    };

    document.getElementById('clear-hist-btn').onclick = async () => {
        if (confirm("Clear history?")) {
            history = [];
            renderHistory();
            scroller.innerHTML = '';
            hub.classList.remove('active');
            settingsModal.style.display = 'none';
            await saveCloud();
        }
    };

    const toggleSearch = () => {
        const isFlex = searchModal.style.display === 'flex';
        searchModal.style.display = isFlex ? 'none' : 'flex';
        if (!isFlex) document.getElementById('search-q').focus();
    };

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); toggleSearch(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    document.getElementById('search-q').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const matches = history.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-results').innerHTML = matches.map(m => `
            <div class="hist-item" onclick="pickMatch('${m.q.replace(/'/g, "\\'")}')">${m.q}</div>
        `).join('');
    };

    window.pickMatch = (q) => {
        const item = history.find(h => h.q === q);
        if (item) {
            searchModal.style.display = 'none';
            scroller.innerHTML = '';
            addMessage(item.q, true);
            addMessage(item.a);
        }
    };

    document.querySelectorAll('.sq-opt').forEach(btn => {
        btn.onclick = () => { input.value = btn.dataset.p; input.focus(); };
    });

    document.getElementById('mob-toggle').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('new-chat-btn').onclick = () => location.reload();
    document.getElementById('logout-btn').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('connect-plugin').onclick = () => pluginModal.style.display = 'flex';
    document.getElementById('plug-yes').onclick = () => window.open('https://example.com');
    document.getElementById('plug-no').onclick = () => {
        pluginModal.style.display = 'none';
        addMessage("you need to install the plugin for the website to connect and work.", false, true);
    };
    document.getElementById('puter-reauth-btn').onclick = () => puter.auth.signIn().then(() => location.reload());

    await loadCloudData();
});
