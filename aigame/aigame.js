document.addEventListener('DOMContentLoaded', async () => {
    let sessionRaw = sessionStorage.getItem('copilot_session');
    if (!sessionRaw) { window.location.href = "../"; return; }
    let session = JSON.parse(sessionRaw);

    const input = document.getElementById('ai-query');
    const submitBtn = document.getElementById('submit-gen');
    const hub = document.getElementById('hub-ui');
    const scroller = document.getElementById('chat-scroller');
    const sidebar = document.getElementById('side-panel');
    const restoreBtn = document.getElementById('restore-sidebar');
    const avatar = document.getElementById('u-avatar');
    const dropdown = document.getElementById('u-drop');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');
    const pfpFile = document.getElementById('pfp-file-hidden');
    const pfpPreview = document.getElementById('pfp-pre');
    const dropContent = document.getElementById('drop-ui-content');

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
        if (avatar) avatar.style.backgroundImage = state.pfp ? 'url(' + state.pfp + ')' : '';
        document.getElementById('set-name').value = state.nickname;
        document.getElementById('set-pfp-url').value = state.pfp;
        
        if (state.pfp) {
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropContent.style.display = 'none';
        }

        if (state.workMode) {
            submitBtn.innerText = "Ask";
            document.getElementById('work-toggle').classList.add('on');
        } else {
            submitBtn.innerText = "Generate";
            document.getElementById('work-toggle').classList.remove('on');
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

    const writeMessage = (text, isUser = false, isError = false) => {
        hub.classList.add('active');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'msg-u' : 'msg-ai';
        if (isError) div.style.color = '#ef4444';
        div.innerHTML = isUser ? text : text.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        scroller.appendChild(div);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const handleAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        writeMessage(val, true);
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
            updateHistoryUI();
            saveCloud();
        } catch (e) {
            thinking.innerText = "Error: Check Puter session.";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const updateHistoryUI = () => {
        document.getElementById('history-box').innerHTML = history.map((h, i) => `
            <div class="hist-item" onclick="loadHist(${i})">${h.q}</div>
        `).join('');
    };

    window.loadHist = (i) => {
        scroller.innerHTML = '';
        writeMessage(history[i].q, true);
        writeMessage(history[i].a);
    };

    const fileHandler = (file) => {
        if (!file.type.startsWith('image/')) return;
        const r = new FileReader();
        r.onload = (e) => {
            state.pfp = e.target.result;
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropContent.style.display = 'none';
        };
        r.readAsDataURL(file);
    };

    document.getElementById('pfp-zone').onclick = () => pfpFile.click();
    pfpFile.onchange = (e) => fileHandler(e.target.files[0]);
    document.getElementById('pfp-zone').ondragover = (e) => e.preventDefault();
    document.getElementById('pfp-zone').ondrop = (e) => { e.preventDefault(); fileHandler(e.dataTransfer.files[0]); };

    submitBtn.addEventListener('click', handleAI);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAI(); }
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

    avatar.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); });
    document.addEventListener('click', () => dropdown.classList.remove('active'));
    document.getElementById('trigger-settings').onclick = () => settingsModal.style.display = 'flex';
    
    document.querySelectorAll('.modal').forEach(m => {
        m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; };
    });

    document.querySelectorAll('.s-nav').forEach(nav => {
        nav.onclick = () => {
            document.querySelectorAll('.s-nav, .tab-pane').forEach(el => el.classList.remove('active'));
            nav.classList.add('active');
            document.getElementById(nav.dataset.tab).classList.add('active');
        };
    });

    document.getElementById('work-toggle').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('side-lever').onclick = function() { this.classList.toggle('on'); };

    document.getElementById('save-all').onclick = async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp-url').value || state.pfp;
        state.workMode = document.getElementById('work-toggle').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        await saveCloud();
        location.reload();
    };

    document.getElementById('clear-hist').onclick = async () => {
        if (confirm("Clear history?")) {
            history = [];
            await saveCloud();
            location.reload();
        }
    };

    const toggleS = () => {
        const on = searchModal.style.display === 'flex';
        searchModal.style.display = on ? 'none' : 'flex';
        if (!on) document.getElementById('search-q').focus();
    };

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); toggleS(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    document.getElementById('search-q').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const m = history.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-results').innerHTML = m.map(r => `<div class="hist-item" onclick="pick('${r.q}')">${r.q}</div>`).join('');
    };

    window.pick = (q) => {
        const i = history.find(h => h.q === q);
        if (i) {
            searchModal.style.display = 'none';
            scroller.innerHTML = '';
            writeMessage(i.q, true);
            writeMessage(i.a);
        }
    };

    document.querySelectorAll('.sq-option').forEach(btn => {
        btn.onclick = () => { input.value = btn.dataset.p; input.focus(); };
    });

    document.getElementById('mob-menu').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('new-chat-btn').onclick = () => location.reload();
    document.getElementById('trigger-logout').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    
    const pr = document.getElementById('p-reauth');
    if(pr) pr.onclick = () => puter.auth.signIn().then(() => location.reload());

    document.getElementById('conn-btn').onclick = () => pluginModal.style.display = 'flex';
    document.getElementById('p-yes').onclick = () => { window.open('https://example.com'); pluginModal.style.display = 'none'; };
    document.getElementById('p-no').onclick = () => { pluginModal.style.display = 'none'; writeMessage('Install plugin for website to work.', false, true); };

    await loadCloud();
});
