document.addEventListener('DOMContentLoaded', async () => {
    const rawSession = sessionStorage.getItem('copilot_session');
    if (!rawSession) { window.location.href = "../"; return; }
    const session = JSON.parse(rawSession);

    const input = document.getElementById('ai-query');
    const submitBtn = document.getElementById('btn-submit');
    const hub = document.getElementById('hub-ui');
    const scroller = document.getElementById('chat-view');
    const sidebar = document.getElementById('sidebar-ui');
    const restoreBtn = document.getElementById('restore-sidebar');
    const avatar = document.getElementById('header-avatar');
    const dropMenu = document.getElementById('pfp-menu');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');

    let history = [];
    let state = { nickname: session.username, pfp: '', workMode: false, hideSidebar: false };

    const loadCloud = async () => {
        const raw = await puter.kv.get('codeit_copilot_users');
        const db = JSON.parse(raw || '{}');
        if (db[session.username]) {
            state = db[session.username].settings || state;
            history = db[session.username].history || [];
            syncUI();
            renderHist();
        }
    };

    const syncUI = () => {
        if (avatar && state.pfp) avatar.style.backgroundImage = 'url(' + state.pfp + ')';
        document.getElementById('nickname-val').value = state.nickname;
        document.getElementById('pfp-url-val').value = state.pfp;
        if (state.pfp) {
            const preview = document.getElementById('pfp-preview');
            preview.src = state.pfp;
            preview.style.display = 'block';
            document.getElementById('pfp-empty').style.display = 'none';
        }
        if (state.workMode) {
            submitBtn.innerText = "Ask";
            submitBtn.classList.add('ask');
            document.getElementById('work-toggle').classList.add('on');
        } else {
            submitBtn.innerText = "Generate";
            submitBtn.classList.remove('ask');
            document.getElementById('work-toggle').classList.remove('on');
        }
        if (state.hideSidebar) document.getElementById('side-toggle').classList.add('on');
    };

    const writeMsg = (txt, isU = false, isErr = false) => {
        hub.classList.add('active');
        scroller.style.display = 'block';
        const d = document.createElement('div');
        d.className = isU ? 'msg-u' : 'msg-ai';
        if (isErr) d.style.borderColor = '#ef4444';
        d.innerHTML = isU ? txt : txt.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        scroller.appendChild(d);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const runAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        writeMsg(val, true);
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
            renderHist();
            saveCloud();
        } catch (e) { aiT.innerText = "Connection lost. Please login via Puter."; }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const saveCloud = async () => {
        const raw = await puter.kv.get('codeit_copilot_users');
        const db = JSON.parse(raw || '{}');
        db[session.username].settings = state;
        db[session.username].history = history;
        await puter.kv.set('codeit_copilot_users', JSON.stringify(db));
    };

    const renderHist = () => {
        document.getElementById('history-box').innerHTML = history.map((h, i) => '<div class="hist-item" onclick="loadHist(' + i + ')">' + h.q + '</div>').join('');
    };

    window.loadHist = (i) => {
        scroller.innerHTML = '';
        writeMsg(history[i].q, true);
        writeMsg(history[i].a);
    };

    submitBtn.onclick = runAI;
    input.onkeydown = (e) => { 
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); }
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    };

    sidebar.ondblclick = () => { if (state.hideSidebar || window.innerWidth < 1024) { sidebar.classList.add('hidden'); restoreBtn.style.display = 'block'; } };
    restoreBtn.onclick = () => { sidebar.classList.remove('hidden'); restoreBtn.style.display = 'none'; };
    avatar.onclick = (e) => { e.stopPropagation(); dropMenu.classList.toggle('active'); };
    document.onclick = () => dropMenu.classList.remove('active');
    document.getElementById('trigger-settings').onclick = () => settingsModal.style.display = 'flex';
    document.querySelectorAll('.modal-fixed').forEach(m => m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; });
    document.querySelectorAll('.set-nav').forEach(l => l.onclick = () => { document.querySelectorAll('.set-nav, .tab').forEach(x => x.classList.remove('active')); l.classList.add('active'); document.getElementById(l.dataset.tab).classList.add('active'); });
    document.getElementById('side-toggle').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('work-toggle').onclick = function() { this.classList.toggle('on'); };

    document.getElementById('pfp-zone').onclick = () => document.getElementById('file-pfp').click();
    document.getElementById('file-pfp').onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (x) => {
            state.pfp = x.target.result;
            syncUI();
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    document.getElementById('save-all').onclick = async () => {
        state.nickname = document.getElementById('nickname-val').value;
        state.pfp = document.getElementById('pfp-url-val').value || state.pfp;
        state.workMode = document.getElementById('work-toggle').classList.contains('on');
        state.hideSidebar = document.getElementById('side-toggle').classList.contains('on');
        await saveCloud();
        location.reload();
    };

    document.getElementById('clear-hist').onclick = async () => {
        if (confirm("Clear history?")) {
            history = [];
            renderHist();
            scroller.innerHTML = '';
            hub.classList.remove('active');
            settingsModal.style.display = 'none';
            await saveCloud();
        }
    };

    window.onkeydown = (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            const show = searchModal.style.display === 'flex';
            searchModal.style.display = show ? 'none' : 'flex';
            if (!show) document.getElementById('search-q').focus();
        }
    };

    document.getElementById('search-q').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const res = history.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-res-list').innerHTML = res.map(r => '<div class="hist-item" onclick="loadM(\'' + r.q.replace(/'/g, "\\'") + '\')">' + r.q + '</div>').join('');
    };

    window.loadM = (q) => {
        const item = history.find(h => h.q === q);
        if (item) { searchModal.style.display = 'none'; scroller.innerHTML = ''; writeMsg(item.q, true); writeMsg(item.a); }
    };

    document.querySelectorAll('.sq-btn').forEach(b => b.onclick = () => { input.value = b.dataset.p; input.focus(); });
    document.getElementById('mob-burger').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('logout-trigger').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('conn-btn').onclick = () => pluginModal.style.display = 'flex';
    document.getElementById('plug-yes').onclick = () => window.open('https://example.com');
    document.getElementById('plug-no').onclick = () => { pluginModal.style.display = 'none'; writeMsg("you need to install the plugin for the website to connect and work.", false, true); };
    document.getElementById('puter-login-btn').onclick = () => puter.auth.signIn().then(() => location.reload());

    await loadCloud();
});
