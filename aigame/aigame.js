document.addEventListener('DOMContentLoaded', async () => {
    const rawSession = sessionStorage.getItem('copilot_session');
    if (!rawSession) { window.location.href = "../"; return; }
    const session = JSON.parse(rawSession);

    const input = document.getElementById('ai-input');
    const submitBtn = document.getElementById('submit-btn');
    const hub = document.getElementById('hub-ui');
    const scroller = document.getElementById('chat-viewport');
    const sidebar = document.getElementById('sidebar');
    const restore = document.getElementById('restore-sidebar');
    const avatar = document.getElementById('user-pfp');
    const drop = document.getElementById('user-menu');
    const setModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const plugModal = document.getElementById('plugin-modal');
    const fileInp = document.getElementById('pfp-file');
    const preview = document.getElementById('pfp-preview-img');
    const pfpPrompt = document.getElementById('pfp-prompt');

    let history = [];
    let state = { nickname: session.username, pfp: '', workMode: false, hideSidebar: false };

    const loadCloud = async () => {
        const raw = await puter.kv.get('copilot_accounts');
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
        document.getElementById('display-name-val').value = state.nickname;
        document.getElementById('pfp-url-val').value = state.pfp;
        if (state.pfp) { preview.src = state.pfp; preview.style.display = 'block'; pfpPrompt.style.display = 'none'; }
        if (state.workMode) { submitBtn.innerText = "Ask"; submitBtn.classList.add('ask-mode'); document.getElementById('work-lever').classList.add('on'); }
        if (state.hideSidebar) document.getElementById('side-lever').classList.add('on');
    };

    const saveCloud = async () => {
        const raw = await puter.kv.get('copilot_accounts');
        const db = JSON.parse(raw || '{}');
        db[session.username].settings = state;
        db[session.username].history = history;
        await puter.kv.set('copilot_accounts', JSON.stringify(db));
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

    const callAI = async () => {
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
            renderHist();
            saveCloud();
        } catch (e) { aiT.innerText = "Connection lost. Try again."; }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const renderHist = () => {
        const list = document.getElementById('chat-history-list');
        list.innerHTML = '';
        history.forEach((h, i) => {
            const item = document.createElement('div');
            item.className = 'hist-item';
            item.innerText = h.q;
            item.addEventListener('click', () => {
                scroller.innerHTML = '';
                write(history[i].q, true);
                write(history[i].a);
            });
            list.appendChild(item);
        });
    };

    submitBtn.onclick = callAI;
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); callAI(); } input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };
    
    sidebar.ondblclick = () => { if (state.hideSidebar || window.innerWidth < 1024) { sidebar.classList.add('hidden'); restore.style.display = 'block'; } };
    restore.onclick = () => { sidebar.classList.remove('hidden'); restore.style.display = 'none'; };
    
    avatar.onclick = (e) => { e.stopPropagation(); drop.classList.toggle('active'); };
    document.onclick = () => drop.classList.remove('active');
    
    document.getElementById('open-settings-ui').onclick = () => setModal.style.display = 'flex';
    document.querySelectorAll('.modal-overlay').forEach(m => m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; });
    
    document.querySelectorAll('.set-link').forEach(l => l.onclick = () => {
        document.querySelectorAll('.set-link, .set-tab').forEach(x => x.classList.remove('active'));
        l.classList.add('active');
        document.getElementById(l.dataset.tab).classList.add('active');
    });

    document.getElementById('side-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('work-lever').onclick = function() { this.classList.toggle('on'); };

    document.getElementById('pfp-dropzone').onclick = () => fileInp.click();
    fileInp.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (x) => { state.pfp = x.target.result; syncUI(); };
        reader.readAsDataURL(e.target.files[0]);
    };

    document.getElementById('btn-save-set').onclick = async () => {
        state.nickname = document.getElementById('display-name-val').value;
        state.pfp = document.getElementById('pfp-url-val').value || state.pfp;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        await saveCloud();
        location.reload();
    };

    document.getElementById('btn-clear-hist').onclick = async () => {
        if (confirm("Clear history?")) {
            history = [];
            renderHist();
            scroller.innerHTML = '';
            hub.classList.remove('active');
            setModal.style.display = 'none';
            await saveCloud();
        }
    };

    const toggleS = () => {
        const show = searchModal.style.display === 'flex';
        searchModal.style.display = show ? 'none' : 'flex';
        if (!show) document.getElementById('search-q').focus();
    };

    window.onkeydown = (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); toggleS(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    };

    document.getElementById('search-q').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const res = history.filter(h => h.q.toLowerCase().includes(q));
        const resultsBox = document.getElementById('search-results');
        resultsBox.innerHTML = '';
        res.forEach(r => {
            const item = document.createElement('div');
            item.className = 'hist-item';
            item.innerText = r.q;
            item.onclick = () => {
                searchModal.style.display = 'none';
                scroller.innerHTML = '';
                write(r.q, true);
                write(r.a);
            };
            resultsBox.appendChild(item);
        });
    };

    document.querySelectorAll('.sq-btn').forEach(b => b.onclick = () => { input.value = b.dataset.p; input.focus(); });
    document.getElementById('mob-toggle').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('reset-chat').onclick = () => location.reload();
    document.getElementById('logout-trigger').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('plugin-connect').onclick = () => plugModal.style.display = 'flex';
    document.getElementById('plug-yes').onclick = () => window.open('https://example.com');
    document.getElementById('plug-no').onclick = () => { plugModal.style.display = 'none'; write("you need to install the plugin for the website to connect and work.", false, true); };
    document.getElementById('btn-puter-login').onclick = () => puter.auth.signIn().then(() => location.reload());

    await loadCloud();
});
