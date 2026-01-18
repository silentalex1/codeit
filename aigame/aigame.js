document.addEventListener('DOMContentLoaded', async () => {
    const rawSession = sessionStorage.getItem('copilot_session');
    if (!rawSession) { window.location.href = "../"; return; }
    const session = JSON.parse(rawSession);

    const input = document.getElementById('ai-input');
    const genBtn = document.getElementById('submit-btn');
    const hub = document.getElementById('hub-ui');
    const scroller = document.getElementById('chat-viewport');
    const sidebar = document.getElementById('sidebar');
    const restore = document.getElementById('restore-sidebar');
    const avatar = document.getElementById('user-pfp');
    const dropdown = document.getElementById('user-menu');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');
    const pfpFile = document.getElementById('pfp-file');
    const pfpPreview = document.getElementById('pfp-preview-img');
    const pfpEmpty = document.getElementById('pfp-prompt');

    let history = [];
    let state = { nickname: session.username, pfp: '', workMode: false, hideSidebar: false };

    const loadData = async () => {
        const raw = await puter.kv.get('copilot_accounts');
        const db = JSON.parse(raw || '{}');
        if (db[session.username]) {
            state = db[session.username].settings || state;
            history = db[session.username].history || [];
            syncUI();
            refreshHistoryUI();
        }
    };

    const syncUI = () => {
        if (avatar && state.pfp) avatar.style.backgroundImage = 'url(' + state.pfp + ')';
        document.getElementById('display-name-val').value = state.nickname;
        document.getElementById('pfp-url-val').value = state.pfp;
        if (state.pfp) {
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            pfpEmpty.style.display = 'none';
        }
        if (state.workMode) {
            genBtn.innerText = "Ask";
            genBtn.classList.add('ask-mode');
            document.getElementById('work-lever').classList.add('on');
        } else {
            genBtn.innerText = "Generate";
            genBtn.classList.remove('ask-mode');
            document.getElementById('work-lever').classList.remove('on');
        }
        if (state.hideSidebar) document.getElementById('side-lever').classList.add('on');
    };

    const write = (txt, isU = false, isErr = false) => {
        hub.classList.add('active');
        scroller.style.display = 'block';
        const d = document.createElement('div');
        d.className = isU ? 'msg-u' : 'msg-ai';
        if (isErr) d.style.borderColor = '#ef4444';
        d.innerHTML = isU ? txt : txt.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        scroller.appendChild(d);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const handleAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        write(val, true);
        input.value = '';
        input.style.height = '26px';
        const aiT = document.createElement('div');
        aiT.className = 'msg-ai';
        aiT.innerText = 'Analyzing...';
        scroller.appendChild(aiT);
        try {
            const res = await puter.ai.chat(val);
            aiT.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            history.push({ q: val, a: res });
            refreshHistoryUI();
            const raw = await puter.kv.get('copilot_accounts');
            const db = JSON.parse(raw || '{}');
            db[session.username].settings = state;
            db[session.username].history = history;
            await puter.kv.set('copilot_accounts', JSON.stringify(db));
        } catch (e) { aiT.innerText = "Error: Check Puter login."; }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const refreshHistoryUI = () => {
        const container = document.getElementById('chat-history-list');
        container.innerHTML = '';
        history.forEach((h, i) => {
            const btn = document.createElement('button');
            btn.className = 'hist-item';
            btn.innerText = h.q;
            btn.onclick = () => {
                scroller.innerHTML = '';
                write(history[i].q, true);
                write(history[i].a);
            };
            container.appendChild(btn);
        });
    };

    genBtn.onclick = handleAI;
    input.onkeydown = (e) => { 
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAI(); }
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    };

    sidebar.ondblclick = () => { if (state.hideSidebar || window.innerWidth < 1024) { sidebar.classList.add('hidden'); restore.style.display = 'block'; } };
    restore.onclick = () => { sidebar.classList.remove('hidden'); restore.style.display = 'none'; };
    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.onclick = () => dropdown.classList.remove('active');
    document.getElementById('open-settings-ui').onclick = () => settingsModal.style.display = 'flex';
    document.querySelectorAll('.modal-overlay').forEach(m => m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; });
    document.querySelectorAll('.set-link').forEach(l => l.onclick = () => { document.querySelectorAll('.set-link, .set-tab').forEach(x => x.classList.remove('active')); l.classList.add('active'); document.getElementById(l.dataset.tab).classList.add('active'); });
    document.getElementById('side-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('work-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('pfp-drop').onclick = () => pfpFile.click();
    pfpFile.onchange = (e) => { const r = new FileReader(); r.onload = (x) => { state.pfp = x.target.result; syncUI(); }; r.readAsDataURL(e.target.files[0]); };
    document.getElementById('save-all').onclick = async () => {
        state.nickname = document.getElementById('display-name-val').value;
        state.pfp = document.getElementById('pfp-url-val').value || state.pfp;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        const raw = await puter.kv.get('copilot_accounts');
        const db = JSON.parse(raw || '{}');
        db[session.username].settings = state;
        await puter.kv.set('copilot_accounts', JSON.stringify(db));
        location.reload();
    };
    document.getElementById('clear-hist').onclick = async () => { if (confirm("Clear?")) { history = []; refreshHistoryUI(); scroller.innerHTML = ''; hub.classList.remove('active'); settingsModal.style.display = 'none'; const raw = await puter.kv.get('copilot_accounts'); const db = JSON.parse(raw || '{}'); db[session.username].history = []; await puter.kv.set('copilot_accounts', JSON.stringify(db)); } };
    
    const toggleS = () => { const show = searchModal.style.display === 'flex'; searchModal.style.display = show ? 'none' : 'flex'; if (!show) document.getElementById('search-q').focus(); };
    window.onkeydown = (e) => { if (e.ctrlKey && e.key === 'k') { e.preventDefault(); toggleS(); } if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); };
    
    document.getElementById('search-q').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const results = history.filter(h => h.q.toLowerCase().includes(q));
        const resBox = document.getElementById('search-results');
        resBox.innerHTML = '';
        results.forEach(r => {
            const d = document.createElement('div');
            d.className = 'hist-item';
            d.innerText = r.q;
            d.onclick = () => {
                searchModal.style.display = 'none';
                scroller.innerHTML = '';
                write(r.q, true);
                write(r.a);
            };
            resBox.appendChild(d);
        });
    };

    document.querySelectorAll('.sq-btn').forEach(b => b.onclick = () => { input.value = b.dataset.p; input.focus(); });
    document.getElementById('mob-toggle').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('reset-chat').onclick = () => location.reload();
    document.getElementById('logout-trigger').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('btn-puter-login').onclick = () => puter.auth.signIn().then(() => location.reload());
    document.getElementById('plugin-connect').onclick = () => pluginModal.style.display = 'flex';
    document.getElementById('plug-yes').onclick = () => window.open('https://example.com');
    document.getElementById('plug-no').onclick = () => { pluginModal.style.display = 'none'; write("you need to install the plugin for the website to connect and work.", false, true); };
    
    await loadData();
});
