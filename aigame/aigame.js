document.addEventListener('DOMContentLoaded', async () => {
    const rawSession = sessionStorage.getItem('copilot_session');
    if (!rawSession) {
        window.location.href = "../";
        return;
    }
    const session = JSON.parse(rawSession);

    const inputArea = document.getElementById('ai-text-input');
    const submitBtn = document.getElementById('send-ai-request');
    const hubUi = document.getElementById('hub-ui-container');
    const msgContainer = document.getElementById('chat-messages-container');
    const sidebar = document.getElementById('app-sidebar');
    const restoreSidebar = document.getElementById('sidebar-restore-btn');
    const navAvatar = document.getElementById('nav-user-avatar');
    const userDropdown = document.getElementById('user-context-menu');
    const settingsModal = document.getElementById('settings-overlay');
    const searchModal = document.getElementById('search-overlay');
    const pluginModal = document.getElementById('plugin-overlay');

    let historyArr = [];
    let state = {
        nickname: session.username,
        pfp: '',
        workMode: false,
        hideSidebar: false
    };

    const loadUserData = async () => {
        try {
            const dbRaw = await puter.kv.get('codeit_copilot_users');
            const database = JSON.parse(dbRaw || '{}');
            if (database[session.username]) {
                state = database[session.username].settings || state;
                historyArr = database[session.username].history || [];
                refreshUI();
                renderHistoryList();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const refreshUI = () => {
        if (navAvatar) navAvatar.style.backgroundImage = state.pfp ? `url(${state.pfp})` : '';
        document.getElementById('set-name').value = state.nickname;
        document.getElementById('set-pfp').value = state.pfp;
        if (state.pfp) {
            const preview = document.getElementById('pfp-preview-element');
            preview.src = state.pfp;
            preview.style.display = 'block';
            document.getElementById('pfp-prompt-text').style.display = 'none';
        }
        if (state.workMode) {
            submitBtn.innerText = 'Ask';
            submitBtn.classList.add('work-mode');
            document.getElementById('ai-work-mode-lever').classList.add('on');
        } else {
            submitBtn.innerText = 'Generate';
            submitBtn.classList.remove('work-mode');
            document.getElementById('ai-work-mode-lever').classList.remove('on');
        }
        if (state.hideSidebar) {
            document.getElementById('side-lever-toggle').classList.add('on');
        }
    };

    const saveUserData = async () => {
        try {
            const dbRaw = await puter.kv.get('codeit_copilot_users');
            const database = JSON.parse(dbRaw || '{}');
            database[session.username] = { settings: state, history: historyArr, password: database[session.username].password };
            await puter.kv.set('codeit_copilot_users', JSON.stringify(database));
        } catch (err) {
            console.error(err);
        }
    };

    const addMessageBubble = (content, isUser = false, isError = false) => {
        hubUi.classList.add('minimized');
        msgContainer.style.display = 'block';
        const bubble = document.createElement('div');
        bubble.className = isUser ? 'msg-u' : 'msg-ai';
        if (isError) bubble.classList.add('error');
        
        if (isUser) {
            bubble.innerText = content;
        } else {
            bubble.innerHTML = content.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
        }
        
        msgContainer.appendChild(bubble);
        msgContainer.scrollTop = msgContainer.scrollHeight;
    };

    const handleAIPrompt = async () => {
        const query = inputArea.value.trim();
        if (!query) return;
        addMessageBubble(query, true);
        inputArea.value = '';
        inputArea.style.height = '26px';

        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'msg-ai';
        thinkingDiv.innerText = 'Thinking...';
        msgContainer.appendChild(thinkingDiv);

        try {
            const response = await puter.ai.chat(query);
            thinkingDiv.innerHTML = response.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            historyArr.push({ q: query, a: response });
            renderHistoryList();
            saveUserData();
        } catch (err) {
            thinkingDiv.innerText = 'Error: AI connection failed. Check Puter Session.';
            thinkingDiv.classList.add('error');
        }
        msgContainer.scrollTop = msgContainer.scrollHeight;
    };

    const renderHistoryList = () => {
        const container = document.getElementById('chat-history-list');
        container.innerHTML = historyArr.map((h, i) => `<div class="hist-item-ui" onclick="loadSelectedHistory(${i})">${h.q}</div>`).join('');
    };

    window.loadSelectedHistory = (index) => {
        msgContainer.innerHTML = '';
        addMessageBubble(historyArr[index].q, true);
        addMessageBubble(historyArr[index].a);
    };

    submitBtn.addEventListener('click', handleAIPrompt);
    inputArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAIPrompt();
        }
        inputArea.style.height = 'auto';
        inputArea.style.height = inputArea.scrollHeight + 'px';
    });

    sidebar.addEventListener('dblclick', () => {
        if (state.hideSidebar || window.innerWidth < 1024) {
            sidebar.classList.add('hidden');
            restoreSidebar.style.display = 'block';
        }
    });

    restoreSidebar.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        restoreSidebar.style.display = 'none';
    });

    navAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => userDropdown.classList.remove('active'));

    document.getElementById('open-settings-trigger').addEventListener('click', () => settingsModal.style.display = 'flex');

    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    });

    document.querySelectorAll('.s-tab-link').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.s-tab-link, .settings-pane').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.target).classList.add('active');
        });
    });

    document.getElementById('pfp-drop-zone').onclick = () => document.getElementById('pfp-hidden-input').click();
    document.getElementById('pfp-hidden-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                state.pfp = ev.target.result;
                const prev = document.getElementById('pfp-preview-element');
                prev.src = state.pfp;
                prev.style.display = 'block';
                document.getElementById('pfp-prompt-text').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    };

    document.getElementById('ai-work-mode-lever').addEventListener('click', function() { this.classList.toggle('on'); });
    document.getElementById('side-toggle-lever').addEventListener('click', function() { this.classList.toggle('on'); });

    document.getElementById('save-all-settings').addEventListener('click', async () => {
        state.nickname = document.getElementById('set-name').value;
        state.pfp = document.getElementById('set-pfp').value || state.pfp;
        state.workMode = document.getElementById('ai-work-mode-lever').classList.contains('on');
        state.hideSidebar = document.getElementById('side-toggle-lever').classList.contains('on');
        await saveUserData();
        location.reload();
    });

    document.getElementById('clear-all-history').addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear chat history?')) {
            historyArr = [];
            renderHistoryList();
            msgContainer.innerHTML = '';
            hubUi.classList.remove('minimized');
            settingsModal.style.display = 'none';
            await saveUserData();
        }
    });

    document.getElementById('nav-connect-plugin').addEventListener('click', () => pluginModal.style.display = 'flex');
    document.getElementById('plugin-answer-yes').addEventListener('click', () => {
        window.open('https://example.com');
        pluginModal.style.display = 'none';
    });
    document.getElementById('plugin-answer-no').addEventListener('click', () => {
        pluginModal.style.display = 'none';
        addMessageBubble('you need to install the plugin for the website to connect and work.', false, true);
    });

    const toggleSearch = () => {
        const showing = searchModal.style.display === 'flex';
        searchModal.style.display = showing ? 'none' : 'flex';
        if (!showing) document.getElementById('search-field').focus();
    };

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); toggleSearch(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    });

    document.getElementById('search-field').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const matches = historyArr.filter(h => h.q.toLowerCase().includes(val));
        document.getElementById('search-list-results').innerHTML = matches.map(m => `<div class="hist-item-ui" onclick="pickSearchMatch('${m.q.replace(/'/g, "\\'")}')">${m.q}</div>`).join('');
    });

    window.pickSearchMatch = (query) => {
        const found = historyArr.find(h => h.q === query);
        if (found) {
            searchModal.style.display = 'none';
            msgContainer.innerHTML = '';
            addMessageBubble(found.q, true);
            addMessageBubble(found.a);
        }
    };

    document.querySelectorAll('.premade-card').forEach(btn => {
        btn.addEventListener('click', () => {
            inputArea.value = btn.dataset.prompt;
            inputArea.focus();
        });
    });

    document.getElementById('mobile-sidebar-toggle').addEventListener('click', () => sidebar.classList.toggle('open'));
    document.getElementById('btn-reset-chat').addEventListener('click', () => location.reload());
    document.getElementById('nav-logout').addEventListener('click', () => { sessionStorage.clear(); window.location.href = '../'; });

    await loadUserData();
});
