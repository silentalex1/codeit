document.addEventListener('DOMContentLoaded', async () => {
    const raw = sessionStorage.getItem('copilot_user');
    if (!raw) { window.location.href = "../"; return; }
    const session = JSON.parse(raw);

    const input = document.getElementById('ai-input');
    const genBtn = document.getElementById('btn-submit');
    const scroller = document.getElementById('chat-viewport');
    const hub = document.getElementById('hub-ui');
    const sidebar = document.getElementById('sidebar-ui');
    const restore = document.getElementById('restore-sidebar');
    const avatar = document.getElementById('u-avatar');
    const dropdown = document.getElementById('u-drop');
    const searchModal = document.getElementById('search-modal');
    const setModal = document.getElementById('settings-modal');
    const plugModal = document.getElementById('plugin-modal');

    let history = [];
    let state = { nickname: session.username, pfp: '', workMode: false, hideSidebar: false };

    const loadCloud = async () => {
        const data = JSON.parse(await puter.kv.get('copilot_accounts') || '{}');
        if (data[session.username]) {
            state = data[session.username].settings || state;
            history = data[session.username].history || [];
            syncUI();
            renderHist();
        }
    };

    const syncUI = () => {
        if (avatar && state.pfp) avatar.style.backgroundImage = 'url(' + state.pfp + ')';
        document.getElementById('set-name').value = state.nickname;
        document.getElementById('set-pfp-url').value = state.pfp;
        if (state.pfp) {
            document.getElementById('pfp-preview').src = state.pfp;
            document.getElementById('pfp-preview').style.display = 'block';
            document.getElementById('pfp-hint').style.display = 'none';
        }
        if (state.workMode) {
            genBtn.innerText = "Ask";
            genBtn.style.background = '#10b981';
            document.getElementById('work-lever').classList.add('on');
        }
        if (state.hideSidebar) document.getElementById('side-lever').classList.add('on');
    };

    const saveCloud = async () => {
        const data = JSON.parse(await puter.kv.get('copilot_accounts') || '{}');
        data[session.username].settings = state;
        data[session.username].history = history;
        await puter.kv.set('copilot_accounts', JSON.stringify(data));
    };

    const write = (txt, isU = false) => {
        hub.classList.add('active');
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
        const aiBox = document.createElement('div');
        aiBox.className = 'msg-ai';
        aiBox.innerText = 'Analyzing...';
        scroller.appendChild(aiBox);
        try {
            const res = await puter.ai.chat(val);
            aiBox.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            history.push({ q: val, a: res });
            renderHist();
            saveCloud();
        } catch (e) { aiBox.innerText = "Error connecting to AI."; }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const renderHist = () => {
        const box = document.getElementById('hist-list');
        box.innerHTML = '';
        history.forEach((h, i) => {
            const d = document.createElement('div');
            d.className = 'hist-item';
            d.innerText = h.q;
            d.onclick = () => {
                scroller.innerHTML = '';
                write(h.q, true);
                write(h.a);
            };
            box.appendChild(d);
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
    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.onclick = () => dropdown.classList.remove('active');
    document.getElementById('open-settings').onclick = () => setModal.style.display = 'flex';
    document.querySelectorAll('.modal').forEach(m => m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; });
    document.querySelectorAll('.set-tab').forEach(l => l.onclick = () => { document.querySelectorAll('.set-tab, .tab-pane').forEach(x => x.classList.remove('active')); l.classList.add('active'); document.getElementById(l.dataset.tab).classList.add('active'); });
    document.getElementById('side-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('work-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('pfp-zone').onclick = () => document.getElementById('pfp-file').click();
    document.getElementById('pfp-file').onchange = (e) => {
        const r = new FileReader();
        r.onload = (x) => { state.pfp = x.target.result; syncUI(); };
        r.readAsDataURL(e.target.files[0]);
    };

    document.getElementById('save-all').onclick = async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp-url').value || state.pfp;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        await saveCloud();
        location.reload();
    };

    document.getElementById('clear-hist').onclick = async () => {
        if (confirm("Clear history?")) {
            history = [];
            renderHist();
            scroller.innerHTML = '';
            hub.classList.remove('active');
            setModal.style.display = 'none';
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
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    };

    document.getElementById('search-q').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const res = history.filter(h => h.q.toLowerCase().includes(q));
        const list = document.getElementById('search-results');
        list.innerHTML = '';
        res.forEach(r => {
            const d = document.createElement('div');
            d.className = 'hist-item';
            d.innerText = r.q;
            d.onclick = () => { searchModal.style.display = 'none'; scroller.innerHTML = ''; write(r.q, true); write(r.a); };
            list.appendChild(d);
        });
    };

    document.querySelectorAll('.sq-opt').forEach(b => b.onclick = () => { input.value = b.dataset.p; input.focus(); });
    document.getElementById('mob-menu').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('new-chat').onclick = () => location.reload();
    document.getElementById('logout').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('plug-btn').onclick = () => plugModal.style.display = 'flex';
    document.getElementById('p-yes').onclick = () => window.open('https://example.com');
    document.getElementById('p-no').onclick = () => { plugModal.style.display = 'none'; write("install the plugin for connection.", false); };
    document.getElementById('btn-puter-login').onclick = () => puter.auth.signIn().then(() => location.reload());

    await loadCloud();
});
