document.addEventListener('DOMContentLoaded', async () => {
    const sessionData = sessionStorage.getItem('copilot_session');
    if (!sessionData) {
        window.location.href = "../";
        return;
    }
    const session = JSON.parse(sessionData);

    const input = document.getElementById('prompt-input');
    const submitBtn = document.getElementById('action-submit');
    const hub = document.getElementById('hub-ui');
    const scroller = document.getElementById('chat-scroller');
    const sidebar = document.getElementById('sidebar-ui');
    const restoreBtn = document.getElementById('restore-sidebar-trigger');
    const avatar = document.getElementById('header-avatar');
    const dropdown = document.getElementById('avatar-dropdown');
    const settingsModal = document.getElementById('settings-modal');
    const searchModal = document.getElementById('search-modal');
    const pluginModal = document.getElementById('plugin-modal');
    const pfpInput = document.getElementById('pfp-file-input');
    const pfpPreview = document.getElementById('pfp-preview-img');
    const dropZoneContent = document.getElementById('drop-text-content');

    let chatHistory = [];
    let state = {
        nickname: session.username,
        pfp: '',
        workMode: false,
        hideSidebar: false
    };

    const loadCloud = async () => {
        try {
            const raw = await puter.kv.get('codeit_copilot_users');
            const db = JSON.parse(raw || '{}');
            if (db[session.username]) {
                state = db[session.username].settings || state;
                chatHistory = db[session.username].history || [];
                syncUI();
                renderHistory();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const syncUI = () => {
        if (avatar) avatar.style.backgroundImage = state.pfp ? 'url(' + state.pfp + ')' : '';
        const nameField = document.getElementById('set-name');
        const pfpField = document.getElementById('set-pfp');
        if (nameField) nameField.value = state.nickname;
        if (pfpField) pfpField.value = state.pfp;
        if (state.pfp) {
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropZoneContent.style.display = 'none';
        }
        if (state.workMode) {
            submitBtn.innerText = 'Ask';
            submitBtn.classList.add('mode-ask');
            document.getElementById('ai-work-toggle').classList.add('on');
        } else {
            submitBtn.innerText = 'Generate';
            submitBtn.classList.remove('mode-ask');
            document.getElementById('ai-work-toggle').classList.remove('on');
        }
        if (state.hideSidebar) {
            document.getElementById('side-lever-toggle').classList.add('on');
        }
    };

    const saveCloud = async () => {
        try {
            const raw = await puter.kv.get('codeit_copilot_users');
            const db = JSON.parse(raw || '{}');
            if (db[session.username]) {
                db[session.username].settings = state;
                db[session.username].history = chatHistory;
                await puter.kv.set('codeit_copilot_users', JSON.stringify(db));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const createMessage = (text, isUser = false, isError = false) => {
        hub.classList.add('minimized');
        scroller.style.display = 'block';
        const div = document.createElement('div');
        div.className = isUser ? 'msg-u' : 'msg-ai';
        if (isError) div.classList.add('err');
        
        if (isUser) {
            div.innerText = text;
        } else {
            const formatted = text.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            div.innerHTML = formatted;
        }
        scroller.appendChild(div);
        scroller.scrollTop = scroller.scrollHeight;
    };

    const runChat = async () => {
        const val = input.value.trim();
        if (!val) return;
        createMessage(val, true);
        input.value = '';
        input.style.height = '26px';

        const thinking = document.createElement('div');
        thinking.className = 'msg-ai';
        thinking.innerText = 'Thinking...';
        scroller.appendChild(thinking);

        try {
            const response = await puter.ai.chat(val);
            thinking.innerHTML = response.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            chatHistory.push({ q: val, a: response });
            renderHistory();
            saveCloud();
        } catch (err) {
            thinking.innerText = 'Error: Puter session connection failure.';
            thinking.classList.add('err');
        }
        scroller.scrollTop = scroller.scrollHeight;
    };

    const renderHistory = () => {
        const box = document.getElementById('history-container');
        box.innerHTML = chatHistory.map((h, i) => '<div class="hist-item" onclick="loadPrevChat(' + i + ')">' + h.q + '</div>').join('');
    };

    window.loadPrevChat = (i) => {
        scroller.innerHTML = '';
        createMessage(chatHistory[i].q, true);
        createMessage(chatHistory[i].a);
    };

    submitBtn.addEventListener('click', runChat);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            runChat();
        }
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    });

    sidebar.addEventListener('dblclick', () => {
        if (state.hideSidebar || window.innerWidth < 1024) {
            sidebar.classList.add('hidden');
            restoreBtn.style.display = 'block';
        }
    });

    restoreBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        restoreBtn.style.display = 'none';
    });

    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('active');
    });

    document.getElementById('nav-open-settings').addEventListener('click', () => {
        settingsModal.style.display = 'flex';
    });

    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => {
            if (e.target === m) m.style.display = 'none';
        });
    });

    document.querySelectorAll('.s-nav').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.s-nav, .tab-pane').forEach(e => e.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        });
    });

    const fileHandler = (file) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            state.pfp = e.target.result;
            pfpPreview.src = state.pfp;
            pfpPreview.style.display = 'block';
            dropZoneContent.style.display = 'none';
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('pfp-drop').onclick = () => pfpInput.click();
    pfpInput.onchange = (e) => fileHandler(e.target.files[0]);
    document.getElementById('pfp-drop').ondragover = (e) => e.preventDefault();
    document.getElementById('pfp-drop').ondrop = (e) => {
        e.preventDefault();
        fileHandler(e.dataTransfer.files[0]);
    };

    document.getElementById('ai-work-toggle').addEventListener('click', function() {
        this.classList.toggle('on');
    });
    document.getElementById('side-lever-toggle').addEventListener('click', function() {
        this.classList.toggle('on');
    });

    document.getElementById('save-all').addEventListener('click', async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp').value || state.pfp;
        state.workMode = document.getElementById('ai-work-toggle').classList.contains('on');
        state.hideSidebar = document.getElementById('side-lever-toggle').classList.contains('on');
        await saveCloud();
        location.reload();
    });

    document.getElementById('clear-history').addEventListener('click', async () => {
        if (confirm('Clear all chat history?')) {
            chatHistory = [];
            renderHistory();
            scroller.innerHTML = '';
            hub.classList.remove('minimized');
            settingsModal.style.display = 'none';
            await saveCloud();
        }
    });

    document.getElementById('connect-plugin-trigger').addEventListener('click', () => {
        pluginModal.style.display = 'flex';
    });
    document.getElementById('plug-confirm-yes').addEventListener('click', () => {
        window.open('https://example.com');
        pluginModal.style.display = 'none';
    });
    document.getElementById('plug-confirm-no').addEventListener('click', () => {
        pluginModal.style.display = 'none';
        createMessage('you need to install the plugin for the website to connect and work.', false, true);
    });

    const toggleSearch = () => {
        const isVisible = (searchModal.style.display === 'flex');
        searchModal.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) document.getElementById('search-q').focus();
    };

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            toggleSearch();
        }
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        }
    });

    document.getElementById('search-q').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const matches = chatHistory.filter(h => h.q.toLowerCase().includes(query));
        document.getElementById('search-results').innerHTML = matches.map(m => '<div class="hist-item" onclick="pickSearch(\'' + m.q.replace(/'/g, "\\'") + '\')">' + m.q + '</div>').join('');
    });

    window.pickSearch = (query) => {
        const match = chatHistory.find(h => h.q === query);
        if (match) {
            searchModal.style.display = 'none';
            scroller.innerHTML = '';
            createMessage(match.q, true);
            createMessage(match.a);
        }
    };

    document.querySelectorAll('.premade-sq').forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.p;
            input.focus();
        });
    });

    document.getElementById('mobile-menu-trigger').addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    document.getElementById('btn-reset-chat').addEventListener('click', () => {
        location.reload();
    });

    document.getElementById('nav-logout').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = '../';
    });

    document.getElementById('puter-reauth').onclick = () => {
        puter.auth.signIn().then(() => location.reload());
    };

    await loadCloud();
});
