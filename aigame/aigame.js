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

    let history = [];
    let state = { nickname: session.name, pfp: '', workMode: false, hideSidebar: false };

    const loadCloud = async () => {
        const data = await puter.kv.get('copilot_accounts');
        const db = data ? JSON.parse(data) : {};
        if (db[session.name]) {
            state = { ...state, ...(db[session.name].settings || {}) };
            history = db[session.name].history || [];
            syncUI();
            updateHistoryUI();
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

        genBtn.innerText = state.workMode ? "Ask" : "Generate";
        document.getElementById('work-lever').classList.toggle('on', state.workMode);
        document.getElementById('side-lever').classList.toggle('on', state.hideSidebar);

        if (state.hideSidebar && window.innerWidth > 1024) {
            sidebar.classList.add('hidden');
            restoreBtn.style.display = 'block';
        }
    };

    const saveCloud = async () => {
        const data = await puter.kv.get('copilot_accounts');
        const db = data ? JSON.parse(data) : {};
        if (!db[session.name]) db[session.name] = { password: '', settings: {}, history: [] };
        db[session.name].settings = state;
        db[session.name].history = history;
        await puter.kv.set('copilot_accounts', JSON.stringify(db));
    };

    const getRandomThought = () => {
        const thoughts = [
            "Parsing user intent...", "Querying neural weights...", "Optimizing Roblox Luau performance...", 
            "Generating mesh heuristics...", "Simulating physics constraints...", "Structuring game logic...", 
            "Evaluating spatial hierarchy...", "Synthesizing environment assets...", "Refining algorithm paths...",
            "Contextualizing creative input...", "Applying design patterns...", "Scanning metadata...",
            "Constructing 3D arrays...", "Calculating vector transforms...", "Mapping entity relationships..."
        ];
        return thoughts[Math.floor(Math.random() * thoughts.length)];
    };

    const sendMsg = (text, isUser = false) => {
        hub.classList.add('active');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'msg-u' : 'msg-ai';
        
        if (isUser) {
            div.innerText = text;
        } else {
            const status = document.createElement('div');
            status.className = 'status-text';
            status.innerHTML = `<span>${state.workMode ? "Answering your question..." : "Imaginating your request..."}</span>`;
            
            const thoughtBox = document.createElement('div');
            thoughtBox.className = 'thought-stream';
            const thoughtLine = document.createElement('div');
            thoughtLine.className = 'thought-line';
            thoughtBox.appendChild(thoughtLine);
            
            const content = document.createElement('div');
            content.className = 'ai-response-content';
            content.innerHTML = text.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            
            div.appendChild(status);
            div.appendChild(thoughtBox);
            div.appendChild(content);

            let thoughtTimer = setInterval(() => {
                thoughtLine.innerText = getRandomThought();
            }, 500);
            
            setTimeout(() => {
                clearInterval(thoughtTimer);
                thoughtBox.style.display = 'none';
            }, 3000);
        }
        
        scroller.appendChild(div);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const runAI = async () => {
        const val = input.value.trim();
        if (!val) return;
        sendMsg(val, true);
        input.value = '';
        input.style.height = '28px';

        const aiMsg = document.createElement('div');
        aiMsg.className = 'msg-ai';
        
        const status = document.createElement('div');
        status.className = 'status-text';
        status.innerHTML = `<span class="pulse-dot"></span><span>${state.workMode ? "Answering your question..." : "Imaginating your request..."}</span>`;
        
        const thoughtBox = document.createElement('div');
        thoughtBox.className = 'thought-stream';
        const thoughtLine = document.createElement('div');
        thoughtLine.className = 'thought-line';
        thoughtBox.appendChild(thoughtLine);
        
        const content = document.createElement('div');
        content.className = 'ai-response-content';
        
        aiMsg.appendChild(status);
        aiMsg.appendChild(thoughtBox);
        aiMsg.appendChild(content);
        scroller.appendChild(aiMsg);
        scroller.scrollTop = scroller.scrollHeight;

        let thoughtInterval = setInterval(() => {
            thoughtLine.innerText = getRandomThought();
        }, 300);

        try {
            const response = await puter.ai.chat(val, { model: 'gpt-4o' });
            clearInterval(thoughtInterval);
            thoughtBox.style.opacity = '0';
            setTimeout(() => thoughtBox.remove(), 500);
            
            content.innerHTML = response.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            history.push({ q: val, a: response });
            updateHistoryUI();
            saveCloud();
        } catch (e) {
            clearInterval(thoughtInterval);
            content.innerText = "Connection lost. Please check your Puter account and refresh.";
            content.style.color = "#ef4444";
        }
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

    const handleFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            state.pfp = e.target.result;
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropContent.style.display = 'none';
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('pfp-drop-zone').onclick = () => pfpInput.click();
    pfpInput.onchange = (e) => handleFile(e.target.files[0]);

    genBtn.addEventListener('click', runAI);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAI(); }
        setTimeout(() => {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        }, 0);
    });

    sidebar.addEventListener('dblclick', () => {
        sidebar.classList.add('hidden');
        restoreBtn.style.display = 'block';
    });

    restoreBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        restoreBtn.style.display = 'none';
    });

    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => dropdown.classList.remove('active'));
    document.getElementById('trigger-settings').addEventListener('click', () => settingsModal.style.display = 'flex');

    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => { if (e.target === m) m.style.display = 'none'; });
    });

    document.querySelectorAll('.s-link').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.s-link, .tab').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        });
    });

    document.getElementById('work-lever').addEventListener('click', function() { this.classList.toggle('on'); });
    document.getElementById('side-lever').addEventListener('click', function() { this.classList.toggle('on'); });

    document.getElementById('save-all').addEventListener('click', async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp').value || state.pfp;
        state.workMode = document.getElementById('work-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever').classList.contains('on');
        await saveCloud();
        location.reload();
    });

    document.getElementById('clear-history').addEventListener('click', async () => {
        if (confirm("Clear history?")) {
            history = [];
            await saveCloud();
            location.reload();
        }
    });

    document.getElementById('puter-reauth').onclick = () => puter.auth.signIn().then(() => location.reload());

    const toggleSearch = () => {
        if (searchModal.style.display === 'flex') {
            searchModal.style.display = 'none';
        } else {
            searchModal.style.display = 'flex';
            document.getElementById('search-q').focus();
        }
    };

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); toggleSearch(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    document.getElementById('search-q').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const matches = history.filter(h => h.q.toLowerCase().includes(q));
        document.getElementById('search-results').innerHTML = matches.map(m => `
            <div class="hist-item" onclick="loadMatch('${m.q.replace(/'/g, "\\'")}')">${m.q}</div>
        `).join('');
    });

    window.loadMatch = (q) => {
        const item = history.find(h => h.q === q);
        if (item) {
            searchModal.style.display = 'none';
            scroller.innerHTML = '';
            sendMsg(item.q, true);
            sendMsg(item.a);
        }
    };

    document.querySelectorAll('.sq-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.p;
            input.focus();
        });
    });

    document.getElementById('mob-toggle').addEventListener('click', () => sidebar.classList.toggle('open'));
    document.getElementById('new-chat').addEventListener('click', () => location.reload());
    document.getElementById('logout-btn').addEventListener('click', () => { sessionStorage.clear(); window.location.href = "../"; });
    document.getElementById('conn-plugin').addEventListener('click', () => document.getElementById('plugin-modal').style.display = 'flex');
    document.getElementById('plug-yes').onclick = () => document.getElementById('plugin-modal').style.display = 'none';
    document.getElementById('plug-no').onclick = () => window.open('https://www.roblox.com/library/create', '_blank');

    await loadCloud();
});
