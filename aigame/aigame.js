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
    const pfpInput = document.getElementById('pfp-file');
    const pfpPreview = document.getElementById('pfp-preview');
    const dropContent = document.getElementById('drop-content');
    const premadeContainer = document.getElementById('premade-container');
    const notif = document.getElementById('ui-notifier');
    const notifText = document.getElementById('notif-text');
    const mediaInput = document.getElementById('media-input');
    const mediaBtn = document.getElementById('media-btn');
    const previewBar = document.getElementById('media-preview-bar');
    const modelSelect = document.getElementById('set-model');

    let history = [];
    let state = { nickname: session.name, pfp: '', workMode: false, hideSidebar: false, aiModel: 'gpt-5.2' };
    let attachedFiles = [];

    const detectUI = () => {
        const w = window.innerWidth;
        const isTouch = navigator.maxTouchPoints > 0;
        let mode = (w <= 600) ? "mobile" : (w <= 1024) ? "tablet" : (w <= 1440 && isTouch) ? "laptop" : "pc";
        document.documentElement.dataset.ui = mode;
        return mode;
    };

    const showNotif = async (steps) => {
        notif.classList.add('show');
        for (const step of steps) {
            notifText.innerText = step;
            await new Promise(r => setTimeout(r, 1100));
        }
        notif.classList.add('fade');
        setTimeout(() => { notif.classList.remove('show', 'fade'); }, 800);
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
                state = { ...state, ...db[session.name].settings };
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
        modelSelect.value = state.aiModel || 'gpt-5.2';
        
        if (state.pfp) { 
            pfpPreview.src = state.pfp; 
            pfpPreview.style.display = 'block'; 
            dropContent.style.display = 'none'; 
        } else {
            pfpPreview.style.display = 'none';
            dropContent.style.display = 'flex';
        }
        
        genBtn.innerText = state.workMode ? "Ask" : "Generate";
        document.getElementById('work-lever').classList.toggle('on', state.workMode);
        document.getElementById('side-lever').classList.toggle('on', state.hideSidebar);

        if (state.workMode) updateWorkPrompts(); else updateImaginePrompts();
        if (state.hideSidebar) { sidebar.classList.add('hidden'); restoreBtn.style.display = 'block'; }
        else { sidebar.classList.remove('hidden'); restoreBtn.style.display = 'none'; }
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
            btn.onclick = (e) => { 
                e.stopPropagation();
                input.value = btn.dataset.p; 
                input.focus(); 
                input.dispatchEvent(new Event('input'));
            };
        });
    };

    const saveCloud = async () => {
        try {
            let data = await puter.kv.get('copilot_accounts');
            let db = data ? JSON.parse(data) : {};
            db[session.name] = { settings: state, history: history };
            await puter.kv.set('copilot_accounts', JSON.stringify(db));
        } catch(e) {}
    };

    const refreshPreviews = () => {
        previewBar.innerHTML = '';
        attachedFiles.forEach((f, i) => {
            const div = document.createElement('div');
            div.className = 'media-preview-item';
            div.innerHTML = `<img src="${f.data}"><div class="remove-media" onclick="removeMedia(${i})">×</div>`;
            previewBar.appendChild(div);
        });
    };

    window.removeMedia = (i) => { attachedFiles.splice(i, 1); refreshPreviews(); };

    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    attachedFiles.push({ name: 'pasted_image.png', data: event.target.result });
                    refreshPreviews();
                };
                reader.readAsDataURL(blob);
            }
        }
    });

    const formatMsg = (text) => {
        return text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>');
    };

    const runAI = async () => {
        const val = input.value.trim();
        if (!val && attachedFiles.length === 0) return;
        
        hub.style.display = 'none';
        scroller.style.display = 'block';
        
        const userDiv = document.createElement('div');
        userDiv.className = 'msg-u';
        userDiv.innerHTML = formatMsg(val);
        scroller.appendChild(userDiv);
        
        input.value = '';
        attachedFiles = [];
        refreshPreviews();
        input.style.height = '24px';

        const aiBox = document.createElement('div');
        aiBox.className = 'msg-ai';
        const reasonBox = document.createElement('div');
        reasonBox.className = 'reasoning-box';
        reasonBox.style.display = 'block';
        reasonBox.innerHTML = `<div class="thought-dots"><div class="thought-dot"></div><div class="thought-dot"></div><div class="thought-dot"></div></div><div>Thinking...</div>`;
        aiBox.appendChild(reasonBox);
        scroller.appendChild(aiBox);
        scroller.scrollTop = scroller.scrollHeight;

        try {
            const response = await puter.ai.chat(val, { model: state.aiModel });
            const content = response.message ? response.message.content : response;
            reasonBox.style.display = 'none';
            aiBox.innerHTML = formatMsg(String(content));
            history.push({ q: val, a: String(content) });
            updateHistoryUI();
            await saveCloud();
        } catch (e) {
            reasonBox.style.display = 'none';
            aiBox.innerText = "Error: Check your connection.";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const updateHistoryUI = () => {
        document.getElementById('chat-history').innerHTML = history.slice().reverse().map((h, i) => {
            const actualIndex = history.length - 1 - i;
            return `<div class="hist-item" onclick="loadChat(${actualIndex})">${h.q}</div>`;
        }).join('');
    };

    window.loadChat = (i) => {
        hub.style.display = 'none';
        scroller.style.display = 'block';
        scroller.innerHTML = '';
        scroller.appendChild(Object.assign(document.createElement('div'), { className: 'msg-u', innerHTML: formatMsg(history[i].q) }));
        scroller.appendChild(Object.assign(document.createElement('div'), { className: 'msg-ai', innerHTML: formatMsg(history[i].a) }));
    };

    genBtn.onclick = runAI;
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); } };
    input.oninput = () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };

    avatar.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); };
    document.addEventListener('click', () => dropdown.classList.remove('active'));
    
    document.getElementById('trigger-settings').onclick = () => settingsModal.style.display = 'flex';
    document.getElementById('save-all').onclick = async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp').value;
        state.aiModel = modelSelect.value;
        await saveCloud();
        syncUI();
        settingsModal.style.display = 'none';
    };

    document.getElementById('select-pfp').onclick = () => pfpInput.click();
    pfpInput.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => { state.pfp = ev.target.result; syncUI(); };
        reader.readAsDataURL(e.target.files[0]);
    };

    document.getElementById('work-lever').onclick = () => { state.workMode = !state.workMode; syncUI(); };
    document.getElementById('side-lever').onclick = () => { state.hideSidebar = !state.hideSidebar; syncUI(); };
    document.getElementById('mob-toggle').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('new-chat').onclick = () => location.reload();
    restoreBtn.onclick = () => { state.hideSidebar = false; syncUI(); };

    document.querySelectorAll('.modal').forEach(m => m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; });
    document.querySelectorAll('.s-link').forEach(link => {
        link.onclick = () => {
            document.querySelectorAll('.s-link, .tab').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        };
    });

    await initUI();
    await loadCloud();
});
