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

    let history = [];
    let state = { nickname: session.name, pfp: '', workMode: false, hideSidebar: false };

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
        } catch (e) {
            console.error("Cloud load error", e);
        }
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
            if (window.innerWidth > 1024) {
                sidebar.classList.add('hidden');
                restoreBtn.style.display = 'block';
            }
        } else {
            document.getElementById('side-lever').classList.remove('on');
            sidebar.classList.remove('hidden');
            restoreBtn.style.display = 'none';
        }
    };

    const updateImaginePrompts = () => {
        premadeContainer.innerHTML = `
            <button class="sq-opt" data-p="create me a obby that ">create me a obby that ___</button>
            <button class="sq-opt" data-p="make me a horror scene that does ">make me a horror scene that does ___</button>
            <button class="sq-opt" data-p="create me a map that looks like ">create me a map that looks like ___</button>
        `;
        attachPromptEvents();
    };

    const updateWorkPrompts = () => {
        premadeContainer.innerHTML = `
            <button class="sq-opt" data-p="solve this math question that im stuck on: ">solve this math question that im stuck on: ___</button>
            <button class="sq-opt" data-p="who would win godzilla vs thor?">who would win godzilla vs thor?</button>
            <button class="sq-opt" data-p="fix this code for me: ">fix this code for me: ___</button>
        `;
        attachPromptEvents();
    };

    const attachPromptEvents = () => {
        document.querySelectorAll('.sq-opt').forEach(btn => {
            btn.onclick = () => {
                input.value = btn.dataset.p;
                input.focus();
                hub.classList.add('typing');
            };
        });
    };

    const saveCloud = async () => {
        try {
            let data = await puter.kv.get('copilot_accounts');
            let db = data ? JSON.parse(data) : {};
            db[session.name] = { password: db[session.name]?.password, settings: state, history: history };
            await puter.kv.set('copilot_accounts', JSON.stringify(db));
        } catch (e) {
            console.error("Cloud save error", e);
        }
    };

    const formatMsg = (text) => {
        return text.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const id = 'code-' + Math.random().toString(36).substr(2, 9);
            return `
                <div class="code-container">
                    <div class="code-header">
                        <span>${lang || 'code'}</span>
                        <button class="copy-btn" onclick="copyCode('${id}')">Copy Code</button>
                    </div>
                    <pre id="${id}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                </div>
            `;
        });
    };

    window.copyCode = (id) => {
        const text = document.getElementById(id).innerText;
        navigator.clipboard.writeText(text);
        const btn = document.querySelector(`[onclick="copyCode('${id}')"]`);
        btn.innerText = 'Copied!';
        setTimeout(() => btn.innerText = 'Copy Code', 2000);
    };

    const runAI = async () => {
        const val = input.value.trim();
        if (!val) return;

        hub.classList.add('typing');
        scroller.style.display = 'block';
        const userDiv = document.createElement('div');
        userDiv.className = 'msg-u';
        userDiv.innerText = val;
        scroller.appendChild(userDiv);
        input.value = '';
        input.style.height = '24px';

        const aiBox = document.createElement('div');
        aiBox.className = 'msg-ai';
        const reasonBox = document.createElement('div');
        reasonBox.className = 'reasoning-box';
        const reasonTextDiv = document.createElement('div');
        reasonTextDiv.className = 'reasoning-text';
        reasonBox.appendChild(reasonTextDiv);
        const statusText = document.createElement('div');
        statusText.style.color = '#3b82f6';
        statusText.style.fontWeight = '800';
        statusText.innerText = state.workMode ? 'Answering your question...' : 'Analyzing your imagination...';
        aiBox.appendChild(reasonBox);
        aiBox.appendChild(statusText);
        scroller.appendChild(aiBox);
        scroller.scrollTop = scroller.scrollHeight;

        let reasonInterval;
        if (state.workMode) {
            reasonBox.style.display = 'block';
            const thoughts = ["Initializing high-density neural map...", "Synthesizing logical parameters...", "Cross-referencing algorithmic database...", "Calibrating response vectors...", "Optimizing output stream..."];
            let tIdx = 0;
            reasonInterval = setInterval(() => {
                reasonTextDiv.innerHTML = `<p>${thoughts[tIdx]}</p>`;
                tIdx = (tIdx + 1) % thoughts.length;
            }, 1200);
        }

        try {
            const response = await puter.ai.chat(val);
            if (reasonInterval) clearInterval(reasonInterval);
            aiBox.innerHTML = formatMsg(response);
            history.push({ q: val, a: response });
            updateHistoryUI();
            await saveCloud();
        } catch (e) {
            if (reasonInterval) clearInterval(reasonInterval);
            statusText.innerText = "Error getting response. Verify Puter session.";
            statusText.style.color = "#ef4444";
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const updateHistoryUI = () => {
        document.getElementById('chat-history').innerHTML = history.slice().reverse().map((h, i) => `
            <div class="hist-item" onclick="loadChat(${history.length - 1 - i})">${h.q}</div>
        `).join('');
    };

    window.loadChat = (i) => {
        hub.classList.add('typing');
        scroller.style.display = 'block';
        scroller.innerHTML = '';
        const qDiv = document.createElement('div'); qDiv.className = 'msg-u'; qDiv.innerText = history[i].q; scroller.appendChild(qDiv);
        const aDiv = document.createElement('div'); aDiv.className = 'msg-ai'; aDiv.innerHTML = formatMsg(history[i].a); scroller.appendChild(aDiv);
    };

    input.oninput = () => { if(input.value.length > 0) hub.classList.add('typing'); };
    genBtn.onclick = runAI;
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); }
        setTimeout(() => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; }, 0);
    };

    sidebar.ondblclick = () => { if(window.innerWidth > 1024) { state.hideSidebar = true; syncUI(); saveCloud(); } };
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

    document.getElementById('pfp-drop-zone').onclick = (e) => { e.preventDefault(); pfpInput.click(); };
    pfpInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                state.pfp = ev.target.result;
                pfpPreview.src = state.pfp;
                pfpPreview.style.display = 'block';
                dropContent.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    };

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
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchModal.style.display = searchModal.style.display === 'flex' ? 'none' : 'flex'; if (searchModal.style.display === 'flex') document.getElementById('search-q').focus(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    };

    document.getElementById('search-q').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const matches = history.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-results').innerHTML = matches.map(m => `
            <div class="hist-item" onclick="loadMatch('${m.q.replace(/'/g, "\\'")}')">${m.q}</div>
        `).join('');
    };

    window.loadMatch = (q) => {
        const item = history.find(h => h.q === q);
        if (item) { searchModal.style.display = 'none'; hub.classList.add('typing'); scroller.style.display = 'block'; scroller.innerHTML = ''; loadChat(history.indexOf(item)); }
    };

    document.getElementById('mob-toggle').onclick = () => sidebar.classList.toggle('open');
    document.getElementById('new-chat').onclick = () => location.reload();
    document.getElementById('logout-btn').onclick = () => { sessionStorage.clear(); window.location.href = "../"; };
    document.getElementById('conn-plugin').onclick = () => document.getElementById('plugin-modal').style.display = 'flex';
    document.getElementById('plug-yes').onclick = () => document.getElementById('plugin-modal').style.display = 'none';
    document.getElementById('plug-no').onclick = () => window.open('https://www.roblox.com/library/create', '_blank');

    await loadCloud();
});
