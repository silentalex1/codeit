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
    const modelSelect = document.getElementById('ai-model-select');
    const mediaInput = document.getElementById('media-input');
    const mediaBtn = document.getElementById('media-btn');
    const previewContainer = document.getElementById('media-preview-container');
    const premadeContainer = document.getElementById('premade-container');

    let history = [];
    let attachedFiles = [];
    let state = { 
        nickname: session.name, 
        pfp: '', 
        workMode: false, 
        hideSidebar: false,
        model: 'gpt-4o' 
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
        } catch(e) { console.error(e); }
    };

    const syncUI = () => {
        if (avatar && state.pfp) avatar.style.backgroundImage = `url(${state.pfp})`;
        modelSelect.value = state.model || 'gpt-4o';
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

    const refreshPreviews = () => {
        previewContainer.innerHTML = '';
        attachedFiles.forEach((file, i) => {
            const wrap = document.createElement('div');
            wrap.className = 'preview-item';
            const img = document.createElement('img');
            img.src = file.data;
            const rm = document.createElement('button');
            rm.className = 'remove-preview';
            rm.innerText = '×';
            rm.onclick = () => { attachedFiles.splice(i, 1); refreshPreviews(); };
            wrap.appendChild(img);
            wrap.appendChild(rm);
            previewContainer.appendChild(wrap);
        });
    };

    const handleFiles = (files) => {
        for (let file of files) {
            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                const reader = new FileReader();
                reader.onload = (e) => { attachedFiles.push({ type: file.type, data: e.target.result }); refreshPreviews(); };
                reader.readAsDataURL(file);
            }
        }
    };

    window.onpaste = (e) => {
        const items = e.clipboardData.items;
        for (let item of items) { if (item.type.indexOf('image') !== -1) handleFiles([item.getAsFile()]); }
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
        refreshPreviews();
        input.value = '';
        input.style.height = '24px';

        const aiBox = document.createElement('div');
        aiBox.className = 'msg-ai';
        const reasonBox = document.createElement('div');
        reasonBox.className = 'reasoning-box';
        reasonBox.style.display = 'block';
        reasonBox.innerHTML = `<div class="thought-dots"><div class="thought-dot"></div><div class="thought-dot"></div><div class="thought-dot"></div></div><div>Thinking with ${state.model}...</div>`;
        aiBox.appendChild(reasonBox);
        scroller.appendChild(aiBox);
        scroller.scrollTop = scroller.scrollHeight;

        try {
            let prompt = val;
            if (currentFiles.length > 0) {
                prompt = [{ type: "text", text: val || "Describe this media." }];
                currentFiles.forEach(f => {
                    prompt.push({ type: "image_url", image_url: { url: f.data } });
                });
            }

            const response = await puter.ai.chat(prompt, { model: state.model });
            let content = response?.message?.content || response || "No response received.";
            
            reasonBox.style.display = 'none';
            aiBox.innerHTML = content.replace(/\n/g, '<br>');
            history.push({ q: val, a: content });
            updateHistoryUI();
        } catch (e) {
            reasonBox.style.display = 'none';
            aiBox.innerHTML = `<span style="color:#ef4444">Connection lost. Ensure you are signed into Puter.</span>`;
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const updateHistoryUI = () => {
        document.getElementById('chat-history').innerHTML = history.slice().reverse().map((h, i) => {
            const idx = history.length - 1 - i;
            return `<div class="hist-item" data-idx="${idx}">${h.q}</div>`;
        }).join('');
    };

    genBtn.onclick = runAI;
    mediaBtn.onclick = () => mediaInput.click();
    mediaInput.onchange = (e) => handleFiles(e.target.files);
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); } };
    input.oninput = () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };
    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.onclick = () => dropdown.classList.remove('active');
    document.getElementById('trigger-settings').onclick = () => settingsModal.style.display = 'flex';
    document.getElementById('save-all').onclick = () => { state.model = modelSelect.value; settingsModal.style.display='none'; };
    document.getElementById('mob-toggle').onclick = (e) => { e.stopPropagation(); sidebar.classList.toggle('open'); };
    document.getElementById('new-chat').onclick = () => location.reload();

    loadCloud();
});
