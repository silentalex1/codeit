document.addEventListener('DOMContentLoaded', async () => {
    let session = JSON.parse(sessionStorage.getItem('copilot_session'));
    if (!session) { window.location.href = "../"; return; }

    const input = document.getElementById('ai-query');
    const genBtn = document.getElementById('gen-action');
    const hub = document.getElementById('hub');
    const hubVisuals = document.getElementById('hub-visuals');
    const scroller = document.getElementById('chat-scroller');
    const sidebar = document.getElementById('sidebar');
    const restoreBtn = document.getElementById('restore-tab');
    const avatar = document.getElementById('u-avatar');
    const dropdown = document.getElementById('u-dropdown');
    const settingsModal = document.getElementById('settings-modal');
    const modelSelect = document.getElementById('ai-model-select');
    const mediaInput = document.getElementById('media-input');
    const mediaBtn = document.getElementById('media-btn');
    const previewContainer = document.getElementById('media-preview-container');
    const premadeContainer = document.getElementById('premade-container');
    const pfpPreview = document.getElementById('pfp-preview');
    const dropContent = document.getElementById('drop-content');

    let history = [];
    let attachedFiles = [];
    let state = { nickname: session.name, pfp: '', workMode: false, hideSidebar: false, model: 'gemini-3-pro' };

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
        } catch(e) { console.error(e); }
    };

    const syncUI = () => {
        if (avatar && state.pfp) avatar.style.backgroundImage = `url(${state.pfp})`;
        document.getElementById('set-name').value = state.nickname;
        document.getElementById('set-pfp').value = state.pfp;
        modelSelect.value = state.model || 'gemini-3-pro';
        
        if (state.pfp) { pfpPreview.src = state.pfp; pfpPreview.style.display = 'block'; dropContent.style.display = 'none'; }
        
        document.getElementById('work-lever').classList.toggle('on', state.workMode);
        document.getElementById('side-lever').classList.toggle('on', state.hideSidebar);

        if (state.workMode) updateWorkPrompts(); else updateImaginePrompts();
        if (state.hideSidebar) { sidebar.classList.add('hidden'); restoreBtn.style.display = 'block'; }
        else { sidebar.classList.remove('hidden'); restoreBtn.style.display = 'none'; }
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
        } catch(e) { console.error(e); }
    };

    const runAI = async () => {
        const val = input.value.trim();
        if (!val && attachedFiles.length === 0) return;
        
        hub.classList.add('hidden-hub');
        scroller.style.display = 'block';
        
        const userDiv = document.createElement('div');
        userDiv.className = 'msg-u';
        userDiv.innerText = val;
        scroller.appendChild(userDiv);
        
        const currentFiles = [...attachedFiles];
        attachedFiles = [];
        previewContainer.innerHTML = '';
        input.value = '';
        input.style.height = '24px';

        const aiBox = document.createElement('div');
        aiBox.className = 'msg-ai';
        const reasonBox = document.createElement('div');
        reasonBox.innerHTML = `<div>Processing with ${state.model}...</div>`;
        aiBox.appendChild(reasonBox);
        scroller.appendChild(aiBox);
        scroller.scrollTop = scroller.scrollHeight;

        try {
            let prompt = val;
            if (currentFiles.length > 0) {
                prompt = [{ type: "text", text: val || "Examine these images." }];
                currentFiles.forEach(f => prompt.push({ type: "image_url", image_url: { url: f.data } }));
            }

            const response = await puter.ai.chat(prompt, { model: state.model });
            let content = response?.message?.content || response || "Error fetching response.";
            
            reasonBox.style.display = 'none';
            aiBox.innerHTML = content.replace(/\n/g, '<br>');
            history.push({ q: val, a: content });
            updateHistoryUI();
            saveCloud();
        } catch (e) {
            reasonBox.style.display = 'none';
            aiBox.innerHTML = `<span style="color:#ef4444">Connection Error. Sign in to Puter.</span>`;
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const handleFiles = (files) => {
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => { 
                    attachedFiles.push({ type: file.type, data: e.target.result });
                    const wrap = document.createElement('div');
                    wrap.className = 'preview-item';
                    wrap.innerHTML = `<img src="${e.target.result}">`;
                    previewContainer.appendChild(wrap);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    window.onpaste = (e) => {
        const items = e.clipboardData.items;
        for (let item of items) { if (item.type.indexOf('image') !== -1) handleFiles([item.getAsFile()]); }
    };

    const updateHistoryUI = () => {
        document.getElementById('chat-history').innerHTML = history.slice().reverse().map((h, i) => {
            const idx = history.length - 1 - i;
            return `<div class="hist-item" data-idx="${idx}">${h.q}<div class="trash-btn" onclick="deleteHistory(event, ${idx})"><svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></div></div>`;
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
        sidebar.classList.remove('open');
    };

    genBtn.onclick = runAI;
    mediaBtn.onclick = () => mediaInput.click();
    mediaInput.onchange = (e) => handleFiles(e.target.files);
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); } };
    input.oninput = () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };
    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.onclick = () => { dropdown.classList.remove('active'); sidebar.classList.remove('open'); };
    document.getElementById('trigger-settings').onclick = () => settingsModal.style.display = 'flex';
    document.getElementById('save-all').onclick = async () => { 
        state.nickname = document.getElementById('set-name').value;
        state.model = modelSelect.value;
        await saveCloud(); 
        location.reload(); 
    };
    document.getElementById('work-lever').onclick = () => { state.workMode = !state.workMode; syncUI(); };
    document.getElementById('side-lever').onclick = () => { state.hideSidebar = !state.hideSidebar; syncUI(); };
    document.getElementById('mob-toggle').onclick = (e) => { e.stopPropagation(); sidebar.classList.toggle('open'); };
    document.getElementById('new-chat').onclick = () => location.reload();
    window.onkeydown = (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchModal.style.display = 'flex'; document.getElementById('search-q').focus(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    };
    loadCloud();
});
