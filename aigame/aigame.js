document.addEventListener('DOMContentLoaded', async () => {
    const rawSession = sessionStorage.getItem('copilot_session');
    if (!rawSession) { window.location.href = "../"; return; }
    const session = JSON.parse(rawSession);

    const input = document.getElementById('ai-input');
    const submitBtn = document.getElementById('btn-submit');
    const hub = document.getElementById('hub-ui');
    const scroller = document.getElementById('chat-scroller');
    const sidebar = document.getElementById('sidebar');
    const restore = document.getElementById('sidebar-restore');
    const avatar = document.getElementById('user-avatar');
    const dropdown = document.getElementById('pfp-dropdown');
    const setModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const plugModal = document.getElementById('plugin-modal');
    const pfpFile = document.getElementById('pfp-file-input');

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
        const nameInp = document.getElementById('set-nickname');
        const pfpInp = document.getElementById('set-pfp-url');
        const prev = document.getElementById('pfp-preview');
        const hint = document.getElementById('pfp-prompt');
        if (nameInp) nameInp.value = state.nickname;
        if (pfpInp) pfpInp.value = state.pfp;
        if (state.pfp && prev && hint) { prev.src = state.pfp; prev.style.display = 'block'; hint.style.display = 'none'; }
        if (state.workMode) { submitBtn.innerText = "Ask"; submitBtn.style.background = '#10b981'; document.getElementById('work-mode-lever').classList.add('on'); }
        if (state.hideSidebar) document.getElementById('side-toggle-lever').classList.add('on');
    };

    const saveCloud = async () => {
        const raw = await puter.kv.get('codeit_copilot_users');
        const db = JSON.parse(raw || '{}');
        db[session.username].settings = state;
        db[session.username].history = history;
        await puter.kv.set('codeit_copilot_users', JSON.stringify(db));
    };

    const write = (txt, isU = false) => {
        hub.classList.add('minimized');
        scroller.style.display = 'block';
        const d = document.createElement('div');
        d.className = isU ? 'msg-u' : 'msg-ai';
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
        } catch (e) { aiT.innerText = "Error: Puter session connection failure."; }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const renderHist = () => {
        const box = document.getElementById('history-list');
        box.innerHTML = '';
        history.forEach((h, i) => {
            const item = document.createElement('div');
            item.className = 'hist-item';
            item.innerText = h.q;
            item.onclick = () => { scroller.innerHTML = ''; write(h.q, true); write(h.a); };
            box.appendChild(item);
        });
    };

    submitBtn.onclick = runAI;
    input.onkeydown = (e) => { 
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); }
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    };

    sidebar.ondblclick = () => { if (state.hideSidebar || window.innerWidth < 1024) { sidebar.classList.add('hidden'); restore.style.display = 'block'; } };
    restore.onclick = () => { sidebar.classList.remove('hidden'); restore.style.display = 'none'; };
    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.onclick = () => dropdown.classList.remove('active');
    document.getElementById('btn-open-settings').onclick = () => setModal.style.display = 'flex';
    document.querySelectorAll('.modal').forEach(m => m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; });
    
    document.querySelectorAll('.s-nav').forEach(nav => {
        nav.onclick = () => {
            document.querySelectorAll('.s-nav, .tab').forEach(el => el.classList.remove('active'));
            nav.classList.add('active');
            document.getElementById(nav.dataset.tab).classList.add('active');
        };
    });

    const workL = document.getElementById('work-mode-lever');
    const sideL = document.getElementById('side-toggle-lever');
    if(workL) workL.onclick = function() { this.classList.toggle('on'); };
    if(sideL) sideL.onclick = function() { this.classList.toggle('on'); };

    const zone = document.getElementById('pfp-zone');
    if(zone){
        zone.onclick = () => pfpFile.click();
        pfpFile.onchange = (e) => {
            const r = new FileReader();
            r.onload = (x) => { state.pfp = x.target.result; syncUI(); };
            r.readAsDataURL(e.target.files[0]);
        };
    }

    document.getElementById('save-settings').onclick = async () => {
        state.nickname = document.getElementById('set-nickname').value;
        state.pfp = document.getElementById('set-pfp-url').value || state.pfp;
        state.workMode = document.getElementById('work-mode-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-toggle-lever').classList.contains('on');
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
            const div = document.createElement('div');
            div.className = 'hist-item';
            div.innerText = m.q;
            div.onclick = () => { searchModal.style.display = 'none'; scroller.innerHTML = ''; write(m.q, true); write(m.a); };
            res.appendChild(div);
        });
    };

    document.querySelectorAll('.sq-opt').forEach(b => b.onclick = () => { input.value = b.dataset.p; input.focus(); });
    document.getElementById('mob-menu').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('new-chat-btn').onclick = () => location.reload();
    document.getElementById('btn-logout').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('btn-plugin').onclick = () => plugModal.style.display = 'flex';
    document.getElementById('plug-yes').onclick = () => window.open('https://example.com');
    document.getElementById('plug-no').onclick = () => { plugModal.style.display = 'none'; write("Connect the plugin for full functionality.", false); };
    document.getElementById('puter-reauth').onclick = () => puter.auth.signIn().then(() => location.reload());

    await loadCloud();
});
