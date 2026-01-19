document.addEventListener('DOMContentLoaded', async () => {
    let session = JSON.parse(sessionStorage.getItem('copilot_session'));
    if (!session) { window.location.href = "../"; return; }

    const input = document.getElementById('ai-query');
    const genBtn = document.getElementById('gen-action');
    const hub = document.getElementById('hub');
    const hubCenter = document.getElementById('hub-center');
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

    let history = [];
    let state = { nickname: session.name, pfp: '', workMode: false, hideSidebar: false };

    const workOptions = [
        "solve this math question that im stuck on: ____",
        "who would win godzilla vs thor?",
        "fix this code for me: _____"
    ];

    const creativeOptions = [
        "create me a obby that ___",
        "make me a horror scene that does ___",
        "create me a map that looks like ___"
    ];

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
        
        if (state.pfp) {
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropContent.style.display = 'none';
        }

        if (state.workMode) {
            genBtn.innerText = "Ask";
            genBtn.classList.add('work-mode');
            updatePremadeUI(workOptions);
        } else {
            genBtn.innerText = "Generate";
            genBtn.classList.remove('work-mode');
            updatePremadeUI(creativeOptions);
        }
        
        document.getElementById('work-lever').classList.toggle('on', state.workMode);
        document.getElementById('side-lever').classList.toggle('on', state.hideSidebar);
    };

    const updatePremadeUI = (opts) => {
        premadeContainer.innerHTML = opts.map(o => `
            <button class="sq-opt" data-p="${o}">${o}</button>
        `).join('');
        document.querySelectorAll('.sq-opt').forEach(btn => {
            btn.onclick = () => { input.value = btn.dataset.p; input.focus(); hubCenter.classList.add('hidden'); };
        });
    };

    const randomizeLively = () => {
        if (!state.workMode) return;
        const vs = [
            "who would win godzilla vs thor?",
            "who would win batman vs ironman?",
            "who would win naruto vs luffy?",
            "who would win goku vs superman?"
        ];
        const btn = premadeContainer.children[1];
        if (btn) {
            btn.style.opacity = '0';
            setTimeout(() => {
                const text = vs[Math.floor(Math.random() * vs.length)];
                btn.innerText = text;
                btn.dataset.p = text;
                btn.style.opacity = '1';
            }, 300);
        }
    };

    setInterval(randomizeLively, 4000);

    const saveCloud = async () => {
        let data = await puter.kv.get('copilot_accounts');
        let db = data ? JSON.parse(data) : {};
        db[session.name] = db[session.name] || {};
        db[session.name].settings = state;
        db[session.name].history = history;
        await puter.kv.set('copilot_accounts', JSON.stringify(db));
    };

    const runAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        
        const user = await puter.auth.getUser();
        if (!user) {
            sendMsg("Please check your Puter account and refresh.", false, true);
            return;
        }

        sendMsg(val, true);
        input.value = '';
        input.style.height = '24px';

        const aiBox = document.createElement('div');
        aiBox.className = 'msg-ai';
        
        const reasonBox = document.createElement('div');
        reasonBox.className = 'reasoning-box';
        const reasonText = document.createElement('div');
        reasonText.className = 'reasoning-text';
        reasonBox.appendChild(reasonText);
        
        const statusText = document.createElement('div');
        statusText.style.color = '#3b82f6';
        statusText.style.fontWeight = '700';
        statusText.innerText = state.workMode ? 'Answering your question...' : 'Analyzing your imagination...';
        
        aiBox.appendChild(reasonBox);
        aiBox.appendChild(statusText);
        scroller.appendChild(aiBox);
        scroller.scrollTop = scroller.scrollHeight;

        let reasonInterval;
        if (state.workMode) {
            reasonBox.style.display = 'block';
            const thoughts = ["Parsing context...", "Initializing logic gates...", "Scanning database...", "Structuring response...", "Optimizing output...", "Refining thoughts...", "Calibrating neural net..."];
            reasonInterval = setInterval(() => {
                const p = document.createElement('p');
                p.innerText = thoughts[Math.floor(Math.random() * thoughts.length)];
                reasonText.prepend(p);
                if (reasonText.children.length > 5) reasonText.lastChild.remove();
            }, 600);
        }

        try {
            const res = await puter.ai.chat(val);
            if (reasonInterval) clearInterval(reasonInterval);
            aiBox.innerHTML = res.replace(/```lua([\s\S]*?)```/g, '<pre style="background:#000;padding:20px;border-radius:14px;color:#4ade80;overflow-x:auto;margin-top:15px;font-family:monospace;font-size:14px;">$1</pre>');
            history.push({ q: val, a: res });
            updateHistoryUI();
            await saveCloud();
        } catch (e) {
            if (reasonInterval) clearInterval(reasonInterval);
            statusText.style.color = '#ef4444';
            statusText.innerText = "Connection lost. Please check your Puter account and refresh.";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const sendMsg = (text, isUser = false, isError = false) => {
        hub.classList.add('active');
        hubCenter.classList.add('hidden');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'msg-u' : 'msg-ai';
        if (isError) { div.style.color = '#ef4444'; div.innerText = text; }
        else div.innerHTML = text;
        scroller.appendChild(div);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const updateHistoryUI = () => {
        document.getElementById('chat-history').innerHTML = history.slice().reverse().map((h, i) => `
            <div class="hist-item" onclick="loadChat(${history.length - 1 - i})">${h.q}</div>
        `).join('');
    };

    window.loadChat = (i) => {
        scroller.innerHTML = '';
        sendMsg(history[i].q, true);
        sendMsg(history[i].a);
    };

    input.oninput = () => { if (input.value.length > 0) hubCenter.classList.add('hidden'); else if (scroller.children.length === 0) hubCenter.classList.remove('hidden'); };

    document.getElementById('pfp-drop-zone').onclick = () => pfpInput.click();
    pfpInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            state.pfp = ev.target.result;
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropContent.style.display = 'none';
        };
        reader.readAsDataURL(file);
    };

    genBtn.onclick = runAI;
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); } };

    sidebar.ondblclick = () => { sidebar.classList.add('hidden'); restoreBtn.style.display = 'block'; };
    restoreBtn.onclick = () => { sidebar.classList.remove('hidden'); restoreBtn.style.display = 'none'; };

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

    document.getElementById('work-lever').onclick = function() { this.classList.toggle('on'); };
    document.getElementById('side-lever').onclick = function() { this.classList.toggle('on'); };

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
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchModal.style.display = (searchModal.style.display === 'flex' ? 'none' : 'flex'); document.getElementById('search-q').focus(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    };

    document.getElementById('search-q').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const matches = history.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-results').innerHTML = matches.map(m => `<div class="hist-item" onclick="loadMatch('${m.q.replace(/'/g, "\\'")}')">${m.q}</div>`).join('');
    };

    window.loadMatch = (q) => { const item = history.find(h => h.q === q); if (item) { searchModal.style.display = 'none'; scroller.innerHTML = ''; sendMsg(item.q, true); sendMsg(item.a); } };
    document.getElementById('mob-toggle').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('new-chat').onclick = () => location.reload();
    document.getElementById('logout-btn').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('conn-plugin').onclick = () => document.getElementById('plugin-modal').style.display = 'flex';
    document.getElementById('plug-yes').onclick = () => document.getElementById('plugin-modal').style.display = 'none';
    document.getElementById('plug-no').onclick = () => window.open('https://www.roblox.com/library/create', '_blank');

    await loadCloud();
});
