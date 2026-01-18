document.addEventListener('DOMContentLoaded', async () => {
    const sData = sessionStorage.getItem('copilot_user');
    if (!sData) { window.location.href = "../"; return; }
    const session = JSON.parse(sData);

    const input = document.getElementById('ai-input');
    const genBtn = document.getElementById('action-gen');
    const hub = document.getElementById('hub-ui');
    const scroller = document.getElementById('chat-view');
    const side = document.getElementById('side-ui');
    const restore = document.getElementById('side-restore');
    const avatar = document.getElementById('header-avatar');
    const dropdown = document.getElementById('avatar-drop');
    const setModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const plugModal = document.getElementById('plugin-modal');
    const fileInp = document.getElementById('file-pfp');
    const pPrev = document.getElementById('pfp-prev-img');
    const pIdle = document.getElementById('pfp-empty');

    let history = [];
    let state = { nickname: session.username, pfp: '', workMode: false, hideSidebar: false };

    const loadCloud = async () => {
        const raw = await puter.kv.get('copilot_accounts');
        const db = JSON.parse(raw || '{}');
        if (db[session.username]) {
            state = db[session.username].settings || state;
            history = db[session.username].history || [];
            syncUI();
            updateHistUI();
        }
    };

    const syncUI = () => {
        if (avatar && state.pfp) avatar.style.backgroundImage = 'url(' + state.pfp + ')';
        document.getElementById('nick-val').value = state.nickname;
        document.getElementById('pfp-val').value = state.pfp;
        if (state.pfp && pPrev) { pPrev.src = state.pfp; pPrev.style.display = 'block'; if (pIdle) pIdle.style.display = 'none'; }
        if (state.workMode) { genBtn.innerText = "Ask"; genBtn.classList.add('ask'); document.getElementById('work-lever').classList.add('on'); }
        if (state.hideSidebar) document.getElementById('side-lever').classList.add('on');
    };

    const saveCloud = async () => {
        const raw = await puter.kv.get('copilot_accounts');
        const db = JSON.parse(raw || '{}');
        db[session.username].settings = state;
        db[session.username].history = history;
        await puter.kv.set('copilot_accounts', JSON.stringify(db));
    };

    const pushMsg = (txt, isU = false, isErr = false) => {
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
        pushMsg(val, true);
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
            updateHistUI();
            saveCloud();
        } catch (e) { aiT.innerText = "Connection lost. Please login via Puter."; }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const updateHistUI = () => {
        const list = document.getElementById('hist-list');
        list.innerHTML = '';
        history.forEach((h, i) => {
            const item = document.createElement('div');
            item.className = 'hist-item';
            item.innerText = h.q;
            item.onclick = () => {
                scroller.innerHTML = '';
                pushMsg(h.q, true);
                pushMsg(h.a);
            };
            list.appendChild(item);
        });
    };

    genBtn.onclick = runAI;
    input.onkeydown = (e) => { 
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); }
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    };

    side.ondblclick = () => { if (state.hideSidebar || window.innerWidth < 1024) { side.classList.add('hidden'); restore.style.display = 'block'; } };
    restore.onclick = () => { side.classList.remove('hidden'); restore.style.display = 'none'; };
    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.onclick = () => dropdown.classList.remove('active');
    document.getElementById('open-settings').onclick = () => setModal.style.display = 'flex';
    document.querySelectorAll('.modal-overlay').forEach(m => m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; });
    document.querySelectorAll('.set-link').forEach(l => l.onclick = () => { document.querySelectorAll('.set-link, .pane').forEach(x => x.classList.remove('active')); l.classList.add('active'); document.getElementById(l.dataset.tab).classList.add('active'); });
    document.getElementById('side-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('work-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('pfp-drop').onclick = () => fileInp.click();
    fileInp.onchange = (e) => { const r = new FileReader(); r.onload = (x) => { state.pfp = x.target.result; syncUI(); }; r.readAsDataURL(e.target.files[0]); };
    document.getElementById('save-all').onclick = async () => { state.nickname = document.getElementById('nick-val').value; state.pfp = document.getElementById('pfp-val').value || state.pfp; state.workMode = document.getElementById('work-lever').classList.contains('on'); state.hideSidebar = document.getElementById('side-lever').classList.contains('on'); await saveCloud(); location.reload(); };
    document.getElementById('clear-hist').onclick = async () => { if (confirm("Clear history?")) { history = []; updateHistUI(); scroller.innerHTML = ''; hub.classList.remove('active'); setModal.style.display = 'none'; await saveCloud(); } };
    window.onkeydown = (e) => { if (e.ctrlKey && e.key === 'k') { e.preventDefault(); const show = (searchModal.style.display === 'flex'); searchModal.style.display = show ? 'none' : 'flex'; if (!show) document.getElementById('search-q').focus(); } if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); };
    document.getElementById('search-q').oninput = (e) => { const q = e.target.value.toLowerCase(); const matches = history.filter(h => h.q.toLowerCase().includes(q)); const resList = document.getElementById('search-results'); resList.innerHTML = ''; matches.forEach(m => { const d = document.createElement('div'); d.className = 'hist-item'; d.innerText = m.q; d.onclick = () => { searchModal.style.display = 'none'; scroller.innerHTML = ''; pushMsg(m.q, true); pushMsg(m.a); }; resList.appendChild(d); }); };
    document.querySelectorAll('.sq-opt').forEach(b => b.onclick = () => { input.value = b.dataset.p; input.focus(); });
    document.getElementById('mob-menu').onclick = () => side.classList.toggle('open');
    document.getElementById('new-chat-trigger').onclick = () => location.reload();
    document.getElementById('logout-trigger').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('connect-trigger').onclick = () => plugModal.style.display = 'flex';
    document.getElementById('plug-yes').onclick = () => window.open('https://example.com');
    document.getElementById('plug-no').onclick = () => { plugModal.style.display = 'none'; pushMsg("you need to install the plugin for the website to connect and work.", false, true); };
    document.getElementById('btn-puter-login').onclick = () => puter.auth.signIn().then(() => location.reload());
    await loadCloud();
});
