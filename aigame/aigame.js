document.addEventListener('DOMContentLoaded', async () => {
    let session = JSON.parse(sessionStorage.getItem('copilot_session'));
    if (!session) { window.location.href = "../"; return; }

    const input = document.getElementById('ai-query');
    const genBtn = document.getElementById('gen-action');
    const hub = document.getElementById('hub');
    const scroller = document.getElementById('chat-scroller');
    const sidebar = document.getElementById('sidebar');
    const avatar = document.getElementById('u-avatar');
    const dropdown = document.getElementById('u-dropdown');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const modelSelect = document.getElementById('ai-model-select');
    const premadeContainer = document.getElementById('premade-container');
    const notif = document.getElementById('ui-notifier');
    const notifText = document.getElementById('notif-text');
    const historyList = document.getElementById('chat-history');

    let history = [];
    let state = { 
        nickname: session.name, 
        pfp: '', 
        workMode: false, 
        hideSidebar: false,
        model: 'gemini-1.5-pro' 
    };

    const showNotif = (text) => {
        notifText.innerText = text;
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), 3000);
    };

    const loadCloud = async () => {
        try {
            if (await puter.auth.isSignedIn()) {
                let data = await puter.kv.get('copilot_accounts');
                let db = data ? JSON.parse(data) : {};
                if (db[session.name]) {
                    state = { ...state, ...db[session.name].settings };
                    history = db[session.name].history || [];
                    syncUI();
                    updateHistoryUI();
                }
            }
        } catch(e) {}
    };

    const syncUI = () => {
        if (avatar && state.pfp) avatar.style.backgroundImage = `url(${state.pfp})`;
        document.getElementById('set-name').value = state.nickname;
        document.getElementById('set-pfp').value = state.pfp;
        modelSelect.value = state.model || 'gemini-1.5-pro';
        document.getElementById('work-lever').classList.toggle('on', state.workMode);
        document.getElementById('side-lever').classList.toggle('on', state.hideSidebar);
        if (state.workMode) updateWorkPrompts(); else updateImaginePrompts();
        if (state.hideSidebar) sidebar.classList.add('hidden'); else sidebar.classList.remove('hidden');
    };

    const updateImaginePrompts = () => {
        premadeContainer.innerHTML = `<button class="sq-opt" data-p="create me a obby that ">create me a obby that ___</button><button class="sq-opt" data-p="make me a horror scene that does ">horror scene that does ___</button><button class="sq-opt" data-p="create me a map that looks like ">map that looks like ___</button>`;
        attachPromptEvents();
    };

    const updateWorkPrompts = () => {
        premadeContainer.innerHTML = `<button class="sq-opt" data-p="solve this math question: ">solve math question: ___</button><button class="sq-opt" data-p="who would win godzilla vs thor?">godzilla vs thor?</button><button class="sq-opt" data-p="fix this code: ">fix this code: ___</button>`;
        attachPromptEvents();
    };

    const attachPromptEvents = () => {
        document.querySelectorAll('.sq-opt').forEach(btn => {
            btn.onclick = () => { input.value = btn.dataset.p; input.focus(); input.dispatchEvent(new Event('input')); };
        });
    };

    const saveCloud = async () => {
        try {
            if (await puter.auth.isSignedIn()) {
                let data = await puter.kv.get('copilot_accounts');
                let db = data ? JSON.parse(data) : {};
                db[session.name] = { ...db[session.name], settings: state, history: history };
                await puter.kv.set('copilot_accounts', JSON.stringify(db));
            }
        } catch(e) {}
    };

    const runAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        
        hub.classList.add('hidden-hub');
        scroller.style.display = 'block';
        
        const userDiv = document.createElement('div');
        userDiv.className = 'msg-u';
        userDiv.innerText = val;
        scroller.appendChild(userDiv);
        
        input.value = '';
        input.style.height = '24px';

        const aiBox = document.createElement('div');
        aiBox.className = 'msg-ai';
        aiBox.innerHTML = `<div>Thinking with ${state.model}...</div>`;
        scroller.appendChild(aiBox);
        scroller.scrollTop = scroller.scrollHeight;

        try {
            const response = await puter.ai.chat(val, { model: state.model });
            let content = response?.message?.content || response || "Error";
            aiBox.innerHTML = content.replace(/\n/g, '<br>');
            history.push({ q: val, a: content });
            updateHistoryUI();
            saveCloud();
        } catch (e) {
            aiBox.innerHTML = `<span style="color:#ef4444">Connection lost.</span>`;
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const updateHistoryUI = () => {
        historyList.innerHTML = history.slice().reverse().map((h, i) => {
            const idx = history.length - 1 - i;
            return `<div class="hist-item" data-idx="${idx}">${h.q}<div class="trash-btn" onclick="deleteHistory(event, ${idx})">🗑️</div></div>`;
        }).join('');
        document.querySelectorAll('.hist-item').forEach(item => { item.onclick = () => loadChat(parseInt(item.dataset.idx)); });
    };

    window.deleteHistory = async (e, idx) => { e.stopPropagation(); history.splice(idx, 1); updateHistoryUI(); saveCloud(); };

    window.loadChat = (i) => {
        hub.classList.add('hidden-hub');
        scroller.style.display = 'block';
        scroller.innerHTML = '';
        scroller.appendChild(Object.assign(document.createElement('div'), { className: 'msg-u', innerHTML: history[i].q }));
        scroller.appendChild(Object.assign(document.createElement('div'), { className: 'msg-ai', innerHTML: history[i].a.replace(/\n/g, '<br>') }));
    };

    genBtn.onclick = runAI;
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); } };
    input.oninput = () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };
    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.onclick = () => dropdown.classList.remove('active');
    document.getElementById('trigger-settings').onclick = () => settingsModal.style.display = 'flex';
    document.getElementById('open-search').onclick = () => { searchModal.style.display = 'flex'; document.getElementById('search-q').focus(); };
    document.getElementById('save-all').onclick = async () => { 
        state.nickname = document.getElementById('set-name').value;
        state.model = modelSelect.value;
        await saveCloud(); location.reload();
    };
    document.getElementById('side-lever').onclick = () => { state.hideSidebar = !state.hideSidebar; syncUI(); saveCloud(); };
    document.getElementById('mob-toggle').onclick = (e) => { e.stopPropagation(); sidebar.classList.toggle('open'); };
    document.querySelectorAll('.modal').forEach(m => { m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; }; });
    window.onkeydown = (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchModal.style.display = 'flex'; document.getElementById('search-q').focus(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    };
    loadCloud();
    showNotif("System Loaded Successfully");
});
