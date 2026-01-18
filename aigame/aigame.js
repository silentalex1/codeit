document.addEventListener('DOMContentLoaded', async () => {
    const rawSession = sessionStorage.getItem('copilot_user');
    if (!rawSession) { window.location.href = "../"; return; }
    const session = JSON.parse(rawSession);

    const input = document.getElementById('ai-input');
    const submitBtn = document.getElementById('submit-btn');
    const hub = document.getElementById('hub-ui');
    const scroller = document.getElementById('chat-viewport');
    const sidebar = document.getElementById('sidebar');
    const restoreBtn = document.getElementById('restore-sidebar');
    const avatar = document.getElementById('user-pfp');
    const dropdown = document.getElementById('user-menu');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');

    let history = [];
    let state = { nickname: session.username, pfp: '', workMode: false, hideSidebar: false };

    const loadData = async () => {
        const raw = await puter.kv.get('copilot_accounts');
        const db = JSON.parse(raw || '{}');
        if (db[session.username]) {
            state = db[session.username].settings || state;
            history = db[session.username].history || [];
            syncUI();
            refreshHistory();
        }
    };

    const syncUI = () => {
        if (avatar && state.pfp) avatar.style.backgroundImage = 'url(' + state.pfp + ')';
        document.getElementById('display-name-val').value = state.nickname;
        document.getElementById('pfp-url-val').value = state.pfp;
        if (state.pfp) {
            document.getElementById('pfp-preview-img').src = state.pfp;
            document.getElementById('pfp-preview-img').style.display = 'block';
            document.getElementById('pfp-prompt').style.display = 'none';
        }
        if (state.workMode) {
            submitBtn.innerText = "Ask";
            submitBtn.classList.add('ask-mode');
            document.getElementById('work-lever').classList.add('on');
        }
        if (state.hideSidebar) document.getElementById('side-lever').classList.add('on');
    };

    const saveData = async () => {
        const raw = await puter.kv.get('copilot_accounts');
        const db = JSON.parse(raw || '{}');
        db[session.username].settings = state;
        db[session.username].history = history;
        await puter.kv.set('copilot_accounts', JSON.stringify(db));
    };

    const writeMsg = (txt, isU = false, isErr = false) => {
        hub.classList.add('minimized');
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
            refreshHistory();
            saveData();
        } catch (e) { aiT.innerText = "Connection lost. Please login via Puter."; }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const refreshHistory = () => {
        document.getElementById('chat-history-list').innerHTML = history.map((h, i) => '<div class="hist-item" onclick="loadHist(' + i + ')">' + h.q + '</div>').join('');
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
    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.onclick = () => dropdown.classList.remove('active');
    document.getElementById('open-settings-ui').onclick = () => settingsModal.style.display = 'flex';
    document.querySelectorAll('.modal-overlay').forEach(m => m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; });
    document.querySelectorAll('.set-link').forEach(l => l.onclick = () => { document.querySelectorAll('.set-link, .set-tab').forEach(x => x.classList.remove('active')); l.classList.add('active'); document.getElementById(l.dataset.tab).classList.add('active'); });
    document.getElementById('side-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('work-lever').onclick = function() { this.classList.toggle('on'); };

    document.getElementById('pfp-dropzone').onclick = () => document.getElementById('pfp-file').click();
    document.getElementById('pfp-file').onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (x) => {
            state.pfp = x.target.result;
            syncUI();
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    document.getElementById('save-all').onclick = async () => {
        state.nickname = document.getElementById('display-name-val').value;
        state.pfp = document.getElementById('pfp-url-val').value || state.pfp;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        await saveData();
        location.reload();
    };

    document.getElementById('clear-history').onclick = async () => {
        if (confirm("Clear history?")) {
            history = [];
            refreshHistory();
            scroller.innerHTML = '';
            hub.classList.remove('minimized');
            settingsModal.style.display = 'none';
            await saveData();
        }
    };

    window.onkeydown = (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            const show = searchModal.style.display === 'flex';
            searchModal.style.display = show ? 'none' : 'flex';
            if (!show) document.getElementById('search-q').focus();
        }
        if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    };

    document.getElementById('search-q').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const res = history.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-results').innerHTML = res.map(r => '<div class="hist-item" onclick="loadM(\'' + r.q.replace(/'/g, "\\'") + '\')">' + r.q + '</div>').join('');
    };

    window.loadM = (q) => {
        const item = history.find(h => h.q === q);
        if (item) { searchModal.style.display = 'none'; scroller.innerHTML = ''; writeMsg(item.q, true); writeMsg(item.a); }
    };

    document.querySelectorAll('.sq-btn').forEach(b => b.onclick = () => { input.value = b.dataset.p; input.focus(); });
    document.getElementById('mob-toggle').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('new-chat-trigger').onclick = () => location.reload();
    document.getElementById('logout-trigger').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('plugin-connect').onclick = () => pluginModal.style.display = 'flex';
    document.getElementById('plug-yes').onclick = () => window.open('https://example.com');
    document.getElementById('plug-no').onclick = () => { pluginModal.style.display = 'none'; writeMsg("you need to install the plugin for the website to connect and work.", false, true); };
    document.getElementById('btn-puter-login').onclick = () => puter.auth.signIn().then(() => location.reload());

    await loadData();
});
