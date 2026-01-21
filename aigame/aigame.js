document.addEventListener('DOMContentLoaded', async () => {
    let session = JSON.parse(sessionStorage.getItem('copilot_session'));
    if (!session) { window.location.href = "../"; return; }

    const input = document.getElementById('ai-query');
    const genBtn = document.getElementById('gen-action');
    const hub = document.getElementById('hub');
    const scroller = document.getElementById('chat-scroller');
    const sidebar = document.getElementById('sidebar');
    const restoreBtn = document.getElementById('restore-tab');
    const avatar = document.getElementById('u-avatar');
    const dropdown = document.getElementById('u-dropdown');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pfpInput = document.getElementById('pfp-file');
    const pfpPreview = document.getElementById('pfp-preview');
    const dropContent = document.getElementById('drop-content');
    const premadeContainer = document.getElementById('premade-container');
    const notif = document.getElementById('ui-notifier');
    const notifText = document.getElementById('notif-text');
    const mediaInput = document.getElementById('media-input');
    const mediaBtn = document.getElementById('media-btn');
    const previewBar = document.getElementById('media-preview-bar');

    let history = [];
    let state = { nickname: session.name, pfp: '', workMode: false, hideSidebar: false };
    let attachedFiles = [];

    const detectUI = () => {
        const w = window.innerWidth;
        const isTouch = navigator.maxTouchPoints > 0;
        let mode = (w <= 600) ? "mobile" : (w <= 1024) ? "tablet" : (w <= 1440 && isTouch) ? "laptop" : "pc";
        document.documentElement.dataset.ui = mode;
        return mode;
    };

    const showNotif = async (steps) => {
        if (sessionStorage.getItem('notif_shown')) return;
        notif.classList.add('show');
        for (const step of steps) {
            notifText.innerText = step;
            await new Promise(r => setTimeout(r, 1100));
        }
        notif.classList.add('fade');
        setTimeout(() => {
            notif.classList.remove('show', 'fade');
            sessionStorage.setItem('notif_shown', 'true');
        }, 800);
    };

    const initUI = async () => {
        const mode = detectUI();
        await showNotif(["detecting the user device..", `user is on ${mode}`, `switching site to ${mode}`, `switch to ${mode}`]);
    };

    const loadCloud = async () => {
        try {
            let data = await puter.kv.get('copilot_accounts');
            let db = data ? JSON.parse(data) : {};
            if (db[session.name]) {
                state = db[session.name].settings || state;
                history = db[session.name].history || [];
                syncUI();
                updateHistoryUI();
            }
        } catch(e) {}
    };

    const syncUI = () => {
        if (avatar && state.pfp) avatar.style.backgroundImage = `url(${state.pfp})`;
        document.getElementById('set-name').value = state.nickname;
        document.getElementById('set-pfp').value = state.pfp;
        if (state.pfp) { pfpPreview.src = state.pfp; pfpPreview.style.display = 'block'; dropContent.style.display = 'none'; }
        
        if (state.workMode) {
            genBtn.innerText = "Ask";
            genBtn.classList.add('work-mode-btn');
            document.getElementById('work-lever').classList.add('on');
            updateWorkPrompts();
        } else {
            genBtn.innerText = "Generate";
            genBtn.classList.remove('work-mode-btn');
            document.getElementById('work-lever').classList.remove('on');
            updateImaginePrompts();
        }
        
        if (state.hideSidebar) {
            document.getElementById('side-lever').classList.add('on');
            sidebar.classList.add('hidden');
            restoreBtn.style.display = 'block';
        } else {
            document.getElementById('side-lever').classList.remove('on');
            sidebar.classList.remove('hidden');
            restoreBtn.style.display = 'none';
        }
    };

    const updateImaginePrompts = () => {
        premadeContainer.innerHTML = `<button class="sq-opt" data-p="create me a obby that ">create me a obby that ___</button><button class="sq-opt" data-p="make me a horror scene that does ">make me a horror scene that does ___</button><button class="sq-opt" data-p="create me a map that looks like ">create me a map that looks like ___</button>`;
        attachPromptEvents();
    };

    const updateWorkPrompts = () => {
        premadeContainer.innerHTML = `<button class="sq-opt" data-p="solve this math question: ">solve this math question: ___</button><button class="sq-opt" data-p="who would win godzilla vs thor?">who would win godzilla vs thor?</button><button class="sq-opt" data-p="fix this code: ">fix this code: ___</button>`;
        attachPromptEvents();
    };

    const attachPromptEvents = () => {
        document.querySelectorAll('.sq-opt').forEach(btn => {
            btn.onclick = () => { input.value = btn.dataset.p; input.focus(); hub.classList.add('typing'); };
        });
    };

    const saveCloud = async () => {
        try {
            let data = await puter.kv.get('copilot_accounts');
            let db = data ? JSON.parse(data) : {};
            db[session.name] = { password: db[session.name]?.password, settings: state, history: history };
            await puter.kv.set('copilot_accounts', JSON.stringify(db));
        } catch(e) {}
    };

    const handleFiles = (files) => {
        for (let file of files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                attachedFiles.push({ name: file.name, data: e.target.result, type: file.type });
                const el = file.type.startsWith('video') ? document.createElement('video') : document.createElement('img');
                el.src = e.target.result;
                previewBar.appendChild(el);
            };
            reader.readAsDataURL(file);
        }
    };

    mediaBtn.onclick = () => mediaInput.click();
    mediaInput.onchange = (e) => handleFiles(e.target.files);

    window.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) handleFiles([item.getAsFile()]);
        }
    });

    const runAI = async () => {
        const val = input.value.trim();
        if (!val && attachedFiles.length === 0) return;
        const isAuthed = await puter.auth.isSignedIn();
        if(!isAuthed) { await puter.auth.signIn(); return; }

        hub.classList.add('typing');
        scroller.style.display = 'block';
        const userDiv = document.createElement('div');
        userDiv.className = 'msg-u';
        userDiv.innerText = val;
        scroller.appendChild(userDiv);
        
        input.value = '';
        attachedFiles = [];
        previewBar.innerHTML = '';
        input.style.height = '24px';

        const aiBox = document.createElement('div');
        aiBox.className = 'msg-ai';
        const reasonBox = document.createElement('div');
        reasonBox.className = 'reasoning-box';
        reasonBox.style.display = 'block';
        const reasonPulse = document.createElement('div');
        reasonPulse.className = 'grammarly-pulse';
        reasonPulse.innerText = state.workMode ? 'Answering your question...' : 'Analyzing your imagination...';
        reasonBox.appendChild(reasonPulse);
        aiBox.appendChild(reasonBox);
        scroller.appendChild(aiBox);
        scroller.scrollTop = scroller.scrollHeight;

        try {
            const response = await puter.ai.chat(val);
            reasonBox.style.display = 'none';
            aiBox.innerText = response;
            history.push({ q: val, a: response });
            updateHistoryUI();
            await saveCloud();
        } catch (e) {
            reasonBox.style.display = 'none';
            aiBox.innerText = "Error: Model connection reset. Retrying Puter link...";
            aiBox.style.color = "#ef4444";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const updateHistoryUI = () => {
        document.getElementById('chat-history').innerHTML = history.slice().reverse().map((h, i) => `<div class="hist-item" onclick="loadChat(${history.length - 1 - i})">${h.q}</div>`).join('');
    };

    window.loadChat = (i) => {
        hub.classList.add('typing');
        scroller.style.display = 'block';
        scroller.innerHTML = '';
        const qDiv = document.createElement('div'); qDiv.className = 'msg-u'; qDiv.innerText = history[i].q; scroller.appendChild(qDiv);
        const aDiv = document.createElement('div'); aDiv.className = 'msg-ai'; aDiv.innerText = history[i].a; scroller.appendChild(aDiv);
    };

    genBtn.onclick = runAI;
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); }
        setTimeout(() => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; }, 0);
    };

    sidebar.ondblclick = () => { state.hideSidebar = true; syncUI(); saveCloud(); };
    restoreBtn.onclick = () => { state.hideSidebar = false; syncUI(); saveCloud(); };
    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.onclick = () => dropdown.classList.remove('active');
    document.getElementById('trigger-settings').onclick = () => settingsModal.style.display = 'flex';
    document.getElementById('open-search').onclick = () => searchModal.style.display = 'flex';
    document.querySelectorAll('.modal').forEach(m => { m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; }; });

    document.querySelectorAll('.s-link').forEach(link => {
        link.onclick = () => {
            document.querySelectorAll('.s-link, .tab').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        };
    });

    document.getElementById('save-all').onclick = async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp').value || state.pfp;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        await saveCloud();
        location.reload();
    };

    document.getElementById('clear-history').onclick = async () => { if (confirm("Clear history?")) { history = []; await saveCloud(); location.reload(); } };
    document.getElementById('puter-reauth').onclick = async () => { await puter.auth.signIn(); location.reload(); };

    window.onkeydown = (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchModal.style.display = 'flex'; document.getElementById('search-q').focus(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    };

    document.getElementById('search-q').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const matches = history.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-results').innerHTML = matches.map(m => `<div class="hist-item" onclick="loadMatch('${m.q.replace(/'/g, "\\'")}')">${m.q}</div>`).join('');
    };

    window.loadMatch = (q) => {
        const item = history.find(h => h.q === q);
        if (item) { searchModal.style.display = 'none'; hub.classList.add('typing'); scroller.style.display = 'block'; scroller.innerHTML = ''; loadChat(history.indexOf(item)); }
    };

    document.getElementById('mob-toggle').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('new-chat').onclick = () => location.reload();
    document.getElementById('logout-btn').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };

    window.onresize = detectUI;
    detectUI();
    await initUI();
    await loadCloud();
});
