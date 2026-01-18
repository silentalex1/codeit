document.addEventListener('DOMContentLoaded', async () => {
    let session = JSON.parse(sessionStorage.getItem('copilot_session'));
    if (!session) { window.location.href = "../"; return; }
    const input = document.getElementById('ai-input');
    const submitBtn = document.getElementById('btn-submit');
    const hub = document.getElementById('hub-ui');
    const scroller = document.getElementById('chat-scroller');
    const sidebar = document.getElementById('sidebar');
    const restoreBtn = document.getElementById('sidebar-restore');
    const avatar = document.getElementById('user-avatar');
    const dropdown = document.getElementById('pfp-dropdown');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');
    const pfpFile = document.getElementById('pfp-file');
    const pfpPreview = document.getElementById('pfp-preview');
    const dropHint = document.getElementById('drop-hint');
    let chatHistory = [];
    let state = session.settings || { nickname: session.username, pfp: '', workMode: false, hideSidebar: false };
    const syncStateUI = () => {
        if (avatar) avatar.style.backgroundImage = state.pfp ? `url(${state.pfp})` : '';
        const nameInp = document.getElementById('set-name');
        const pfpInp = document.getElementById('set-pfp');
        if (nameInp) nameInp.value = state.nickname;
        if (pfpInp) pfpInp.value = state.pfp;
        if (state.pfp && pfpPreview) { pfpPreview.src = state.pfp; pfpPreview.style.display = 'block'; if (dropHint) dropHint.style.display = 'none'; }
        if (state.workMode) { submitBtn.innerText = "Ask"; submitBtn.classList.add('mode-work'); document.getElementById('work-mode-lever').classList.add('on'); }
        else { submitBtn.innerText = "Generate"; submitBtn.classList.remove('mode-work'); document.getElementById('work-mode-lever').classList.remove('on'); }
        if (state.hideSidebar) document.getElementById('side-toggle-lever').classList.add('on');
    };
    const saveCloud = async () => {
        let db = JSON.parse(await puter.kv.get('codeit_copilot_users') || '{}');
        if (db[session.username]) { db[session.username].settings = state; db[session.username].history = chatHistory; await puter.kv.set('codeit_copilot_users', JSON.stringify(db)); }
    };
    const pushMsg = (txt, isU = false, isErr = false) => {
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
            chatHistory.push({ q: val, a: res });
            renderHist();
            saveCloud();
        } catch (e) { aiT.innerText = "Error: Please check Puter session."; }
        scroller.scrollTop = scroller.scrollHeight;
    };
    const renderHist = () => {
        document.getElementById('history-container').innerHTML = chatHistory.map((h, i) => `<div class="hist-item" onclick="loadHist(${i})">${h.q}</div>`).join('');
    };
    window.loadHist = (i) => { scroller.innerHTML = ''; writeMessage(chatHistory[i].q, true); writeMessage(chatHistory[i].a); };
    submitBtn.onclick = runAI;
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); } input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };
    sidebar.ondblclick = () => { if (state.hideSidebar || window.innerWidth < 1024) { sidebar.classList.add('hidden'); restoreBtn.style.display = 'block'; } };
    restoreBtn.onclick = () => { sidebar.classList.remove('hidden'); restoreBtn.style.display = 'none'; };
    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.onclick = () => dropdown.classList.remove('active');
    document.getElementById('btn-settings').onclick = () => settingsModal.style.display = 'flex';
    document.querySelectorAll('.modal').forEach(m => m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; });
    document.querySelectorAll('.s-nav').forEach(nav => nav.onclick = () => { document.querySelectorAll('.s-nav, .tab-content').forEach(el => el.classList.remove('active')); nav.classList.add('active'); document.getElementById(nav.dataset.tab).classList.add('active'); });
    document.getElementById('side-toggle-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('work-mode-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('save-settings').onclick = async () => { state.nickname = document.getElementById('set-name').value; state.pfp = document.getElementById('set-pfp').value || state.pfp; state.workMode = document.getElementById('work-mode-lever').classList.contains('on'); state.hideSidebar = document.getElementById('side-toggle-lever').classList.contains('on'); sessionStorage.setItem('copilot_session', JSON.stringify({ ...session, settings: state })); await saveCloud(); location.reload(); };
    document.getElementById('clear-history').onclick = async () => { if (confirm("Clear history?")) { chatHistory = []; renderHist(); scroller.innerHTML = ''; hub.classList.remove('minimized'); settingsModal.style.display = 'none'; await saveCloud(); } };
    const pfpZ = document.getElementById('pfp-zone');
    const handleFile = (f) => { if (!f.type.startsWith('image/')) return; const r = new FileReader(); r.onload = (e) => { state.pfp = e.target.result; pfpPreview.src = state.pfp; pfpPreview.style.display = 'block'; if (dropHint) dropHint.style.display = 'none'; }; r.readAsDataURL(f); };
    if (pfpZ) { pfpZ.onclick = () => pfpFile.click(); pfpFile.onchange = (e) => handleFile(e.target.files[0]); pfpZ.ondragover = (e) => e.preventDefault(); pfpZ.ondrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }; }
    window.onkeydown = (e) => { if (e.ctrlKey && e.key === 'k') { e.preventDefault(); const show = searchModal.style.display === 'flex'; searchModal.style.display = show ? 'none' : 'flex'; if (!show) document.getElementById('search-q').focus(); } if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); };
    document.getElementById('search-q').oninput = (e) => { const q = e.target.value.toLowerCase(); const res = chatHistory.filter(h => h.q.toLowerCase().includes(q)); document.getElementById('search-results').innerHTML = res.map(r => `<div class="hist-item" onclick="loadM('${r.q.replace(/'/g, "\\'")}')">${r.q}</div>`).join(''); };
    window.loadM = (q) => { const item = chatHistory.find(h => h.q === q); if (item) { searchModal.style.display = 'none'; scroller.innerHTML = ''; pushMsg(item.q, true); pushMsg(item.a); } };
    document.querySelectorAll('.sq-opt').forEach(b => b.onclick = () => { input.value = b.dataset.p; input.focus(); });
    document.getElementById('mob-burger').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('btn-new-chat').onclick = () => location.reload();
    document.getElementById('btn-logout').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('puter-reauth').onclick = () => puter.auth.signIn().then(() => location.reload());
    document.getElementById('btn-plugin').onclick = () => pluginModal.style.display = 'flex';
    document.getElementById('plugin-yes').onclick = () => window.open('https://example.com');
    document.getElementById('plugin-no').onclick = () => { pluginModal.style.display = 'none'; pushMsg("you need to install the plugin for the website to connect and work.", false, true); };
    const raw = await puter.kv.get('codeit_copilot_users');
    if (raw) { let db = JSON.parse(raw); if (db[session.username]) { chatHistory = db[session.username].history || []; state = db[session.username].settings || state; syncStateUI(); renderHist(); } }
});
