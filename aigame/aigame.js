document.addEventListener('DOMContentLoaded', async () => {
    const rawS = sessionStorage.getItem('copilot_session');
    if (!rawS) { window.location.href = "../"; return; }
    const session = JSON.parse(rawS);

    const input = document.getElementById('ai-query');
    const genBtn = document.getElementById('gen-action');
    const hub = document.getElementById('hub');
    const scroller = document.getElementById('chat-viewport');
    const sidebar = document.getElementById('sidebar');
    const restore = document.getElementById('restore-sidebar');
    const avatar = document.getElementById('u-pfp');
    const drop = document.getElementById('u-drop');
    const setModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const plugModal = document.getElementById('plugin-modal');
    const pfpFile = document.getElementById('pfp-file');

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
        document.getElementById('set-name').value = state.nickname;
        document.getElementById('set-pfp').value = state.pfp;
        const prev = document.getElementById('pfp-prev');
        const hint = document.getElementById('pfp-prompt');
        if (state.pfp && prev && hint) { prev.src = state.pfp; prev.style.display = 'block'; hint.style.display = 'none'; }
        if (state.workMode) { genBtn.innerText = "Ask"; genBtn.style.background = "#10b981"; document.getElementById('work-lever').classList.add('on'); }
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

    const runAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        write(val, true);
        input.value = '';
        input.style.height = '26px';
        const t = document.createElement('div');
        t.className = 'msg-ai';
        t.innerText = 'Analyzing...';
        scroller.appendChild(t);
        try {
            const res = await puter.ai.chat(val);
            t.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            history.push({ q: val, a: res });
            renderHist();
            saveCloud();
        } catch (e) { t.innerText = "Error connecting to Puter session."; }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const renderHist = () => {
        const list = document.getElementById('history-box');
        list.innerHTML = '';
        history.forEach((h, i) => {
            const d = document.createElement('div');
            d.className = 'hist-item';
            d.innerText = h.q;
            d.onclick = () => { scroller.innerHTML = ''; write(h.q, true); write(h.a); };
            list.appendChild(d);
        });
    };

    genBtn.onclick = runAI;
    input.onkeydown = (e) => { 
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); }
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    };

    sidebar.ondblclick = () => { if (state.hideSidebar || window.innerWidth < 1024) { sidebar.classList.add('hidden'); restore.style.display = 'block'; } };
    restore.onclick = () => { sidebar.classList.remove('hidden'); restore.style.display = 'none'; };
    avatar.onclick = (e) => { e.stopPropagation(); drop.classList.toggle('active'); };
    document.onclick = () => drop.classList.remove('active');
    document.getElementById('trigger-settings').onclick = () => setModal.style.display = 'flex';
    document.querySelectorAll('.modal').forEach(m => m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; });
    document.querySelectorAll('.s-tab').forEach(l => l.onclick = () => { document.querySelectorAll('.s-tab, .tab-pane').forEach(x => x.classList.remove('active')); l.classList.add('active'); document.getElementById(l.dataset.tab).classList.add('active'); });
    document.getElementById('side-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('work-lever').onclick = function() { this.classList.toggle('on'); };

    document.getElementById('pfp-zone').onclick = () => pfpFile.click();
    pfpFile.onchange = (e) => {
        const r = new FileReader();
        r.onload = (x) => { state.pfp = x.target.result; syncUI(); };
        r.readAsDataURL(e.target.files[0]);
    };

    document.getElementById('save-settings').onclick = async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp').value || state.pfp;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        await saveCloud();
        location.reload();
    };

    document.getElementById('clear-history').onclick = async () => {
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
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    };

    document.getElementById('search-q').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const matches = history.filter(h => h.q.toLowerCase().includes(q));
        const res = document.getElementById('search-results');
        res.innerHTML = '';
        matches.forEach(m => {
            const d = document.createElement('div');
            d.className = 'hist-item';
            d.innerText = m.q;
            d.onclick = () => { searchModal.style.display = 'none'; scroller.innerHTML = ''; write(m.q, true); write(m.a); };
            res.appendChild(d);
        });
    };

    document.querySelectorAll('.sq-btn').forEach(b => b.onclick = () => { input.value = b.dataset.p; input.focus(); });
    document.getElementById('mob-menu').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('new-chat-btn').onclick = () => location.reload();
    document.getElementById('trigger-logout').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('btn-plugin').onclick = () => plugModal.style.display = 'flex';
    document.getElementById('plug-yes').onclick = () => window.open('https://example.com');
    document.getElementById('plug-no').onclick = () => { plugModal.style.display = 'none'; write("install the plugin for connection.", false, true); };
    document.getElementById('btn-puter-login').onclick = () => puter.auth.signIn().then(() => location.reload());

    await loadCloud();
});
