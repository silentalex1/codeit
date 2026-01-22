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
    const premadeContainer = document.getElementById('premade-container');
    const mediaInput = document.getElementById('media-input');
    const previewContainer = document.getElementById('media-preview-container');

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
        modelSelect.value = state.model || 'gemini-3-pro';
        document.getElementById('set-name').value = state.nickname;
        document.getElementById('set-pfp').value = state.pfp;
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
            btn.onclick = () => { input.value = btn.dataset.p; input.focus(); };
        });
    };

    const runAI = async () => {
        const val = input.value.trim();
        if (!val && attachedFiles.length === 0) return;

        hub.classList.add('hidden-hub');
        scroller.style.display = 'block';

        const userDiv = document.createElement('div');
        userDiv.className = 'msg-u';
        userDiv.innerText = val || "Image/Media Shared";
        scroller.appendChild(userDiv);

        const currentFiles = [...attachedFiles];
        attachedFiles = [];
        if(previewContainer) previewContainer.innerHTML = '';
        input.value = '';
        input.style.height = '24px';

        const aiBox = document.createElement('div');
        aiBox.className = 'msg-ai';
        aiBox.innerText = "Processing...";
        scroller.appendChild(aiBox);
        scroller.scrollTop = scroller.scrollHeight;

        try {
            let prompt = val;
            if (currentFiles.length > 0) {
                prompt = [{ type: "text", text: val || "Describe this media." }];
                currentFiles.forEach(f => prompt.push({ type: "image_url", image_url: { url: f.data } }));
            }
            const response = await puter.ai.chat(prompt, { model: state.model });
            aiBox.innerText = response?.message?.content || response;
            history.push({ q: val, a: aiBox.innerText });
            updateHistoryUI();
        } catch (e) {
            aiBox.innerText = "Error: Connection lost. Ensure you are signed into Puter.";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const updateHistoryUI = () => {
        document.getElementById('chat-history').innerHTML = history.slice().reverse().map((h, i) => {
            const idx = history.length - 1 - i;
            return `<div class="hist-item" onclick="loadChat(${idx})">${h.q}</div>`;
        }).join('');
    };

    window.loadChat = (i) => {
        hub.classList.add('hidden-hub');
        scroller.style.display = 'block';
        scroller.innerHTML = '';
        scroller.appendChild(Object.assign(document.createElement('div'), { className: 'msg-u', innerHTML: history[i].q }));
        scroller.appendChild(Object.assign(document.createElement('div'), { className: 'msg-ai', innerHTML: history[i].a }));
    };

    genBtn.onclick = runAI;
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); } };
    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.onclick = () => { dropdown.classList.remove('active'); };
    document.getElementById('trigger-settings').onclick = () => settingsModal.style.display = 'flex';
    document.getElementById('save-all').onclick = () => { 
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp').value;
        state.model = modelSelect.value;
        settingsModal.style.display = 'none';
        syncUI();
    };

    document.querySelectorAll('.s-link').forEach(link => {
        link.onclick = () => {
            document.querySelectorAll('.s-link, .tab').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        };
    });

    document.getElementById('mob-toggle').onclick = (e) => { e.stopPropagation(); sidebar.classList.toggle('open'); };
    document.getElementById('new-chat').onclick = () => location.reload();
    
    window.onkeydown = (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); document.getElementById('search-modal').style.display = 'flex'; }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    };

    loadCloud();
});
