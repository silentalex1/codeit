window.bt = String.fromCharCode(96, 96, 96);
var bt = window.bt;
const path = window.location.pathname;

document.addEventListener('DOMContentLoaded', () => {
    const appBody = document.getElementById('app-body');
    if (appBody) {
        appBody.classList.remove('hidden');
    }

    if (path === '/login' || path.includes('login.html')) {
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                const u = document.getElementById('login-user').value.trim();
                const p = document.getElementById('login-pass').value.trim();
                if (u && p) {
                    try {
                        const res = await fetch('/login-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
                        const data = await res.json();
                        if (data.success) { localStorage.setItem('prysmis_user', u); window.location.href = '/'; } 
                        else document.getElementById('err-msg').classList.remove('hidden');
                    } catch (e) {}
                }
            });
        }
    } else if (path === '/register' || path.includes('register.html')) {
        const regBtn = document.getElementById('reg-btn');
        if (regBtn) {
            regBtn.addEventListener('click', async () => {
                const u = document.getElementById('reg-user').value.trim();
                const p = document.getElementById('reg-pass').value.trim();
                if (u && p) {
                    try {
                        const res = await fetch('/register-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
                        const data = await res.json();
                        if (data.success) { localStorage.setItem('prysmis_user', u); window.location.href = '/'; } 
                        else document.getElementById('reg-err').classList.remove('hidden');
                    } catch (e) {}
                }
            });
        }
    } else {
        if (!localStorage.getItem('prysmis_user')) {
            window.location.href = '/login';
        } else {
            initApp();
        }
    }

    function initApp() {
        const bt = window.bt;
        const bmDot = document.getElementById('bm-dot');
        const bmText = document.getElementById('bm-text');
        const stDot = document.getElementById('st-dot');
        const stText = document.getElementById('st-text');
        const settingsModal = document.getElementById('settings-modal');
        const settingsOpen = document.getElementById('settings-open');
        const settingsClose = document.getElementById('settings-close');
        const apiKeyInput = document.getElementById('api-key-input');
        const toggleKeyBtn = document.getElementById('toggle-key-btn');
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        const chatArea = document.getElementById('chat-area');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const humanizeBtn = document.getElementById('humanize-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const newChatBtn = document.getElementById('new-chat-btn');
        const chatList = document.getElementById('chat-list');
        const chatPreview = document.getElementById('chat-preview');
        const continueBtn = document.querySelector('.rr-cont');

        let apiKey = localStorage.getItem('prysmis_api_key') || '';
        let isHumanizeActive = false;
        let chats = [];
        let currentChatId = null;
        let stCon = false;
        let stTree = '';
        let currImgs = [];
        let isContinuing = false;

        function saveState() { localStorage.setItem('prysmis_site_chats', JSON.stringify(chats)); }
        function loadState() {
            const d = localStorage.getItem('prysmis_site_chats');
            if (d) { try { chats = JSON.parse(d); } catch (e) {} }
        }

        async function updateStatus() {
            if (!navigator.onLine) return;
            try {
                const res = await fetch('/status');
                if(!res.ok) return;
                const data = await res.json();
                if (data.tree) stTree = data.tree;
                if (data.bookmarklet) {
                    bmDot.classList.add('status-active');
                    bmDot.classList.remove('bg-[#f38ba8]');
                    bmText.textContent = 'Connected';
                    bmText.className = 'text-xs font-bold text-[#89b4fa]';
                }
                if (data.status === 'accepted') {
                    stCon = true;
                    stDot.classList.add('status-active');
                    stDot.classList.remove('bg-[#f38ba8]', 'bg-[#f9e2af]');
                    stText.textContent = 'Connected';
                    stText.className = 'text-xs font-bold text-[#89b4fa]';
                } else if (data.status === 'pending') {
                    stCon = false;
                    stDot.classList.remove('status-active');
                    stDot.className = 'w-2.5 h-2.5 rounded-full bg-[#f9e2af]';
                    stText.textContent = 'Action Required';
                    stText.className = 'text-xs font-bold text-[#f9e2af]';
                } else {
                    stCon = false;
                    stDot.classList.remove('status-active');
                    stDot.className = 'w-2.5 h-2.5 rounded-full bg-[#f38ba8]';
                    stText.textContent = 'Disconnected';
                    stText.className = 'text-xs font-bold text-[#f38ba8]';
                }
            } catch (err) {}
        }

        setInterval(updateStatus, 1500);
        updateStatus();
        loadState();
        if (chats.length > 0) currentChatId = chats[0].id;
        else initChat();
        updateSidebar();
        renderChat(false);

        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('prysmis_user');
            window.location.href = '/login';
        });

        function initChat() {
            const id = Date.now().toString();
            chats.unshift({ id: id, title: 'New Chat', history: [] });
            currentChatId = id;
            saveState();
            updateSidebar();
            renderChat(true);
        }
        newChatBtn.addEventListener('click', initChat);

        function updateSidebar() {
            chatList.innerHTML = '';
            chats.forEach(chat => {
                const div = document.createElement('div');
                div.className = 'p-3 rounded-lg cursor-pointer text-sm truncate transition-colors ' + (chat.id === currentChatId ? 'bg-[#313244] border border-[#45475a] font-bold text-[#cdd6f4]' : 'text-[#a6adc8] hover:bg-[#1e1e2e]');
                div.textContent = chat.title;
                div.addEventListener('click', () => {
                    currentChatId = chat.id;
                    updateSidebar();
                    renderChat(false);
                });
                chatList.appendChild(div);
            });
        }

        settingsOpen.addEventListener('click', () => {
            apiKeyInput.value = apiKey;
            apiKeyInput.type = 'password';
            toggleKeyBtn.textContent = 'show';
            settingsModal.classList.add('modal-open');
        });
        settingsClose.addEventListener('click', () => settingsModal.classList.remove('modal-open'));
        toggleKeyBtn.addEventListener('click', () => {
            if (apiKeyInput.type === 'password') { apiKeyInput.type = 'text'; toggleKeyBtn.textContent = 'hide'; } 
            else { apiKeyInput.type = 'password'; toggleKeyBtn.textContent = 'show'; }
        });
        saveSettingsBtn.addEventListener('click', () => {
            apiKey = apiKeyInput.value.trim();
            localStorage.setItem('prysmis_api_key', apiKey);
            settingsModal.classList.remove('modal-open');
        });

        humanizeBtn.addEventListener('click', () => {
            isHumanizeActive = !isHumanizeActive;
            if (isHumanizeActive) {
                humanizeBtn.classList.add('humanize-active');
            } else {
                humanizeBtn.classList.remove('humanize-active');
            }
        });

        function renderPreview() {
            chatPreview.innerHTML = '';
            if (currImgs.length === 0) {
                chatPreview.classList.add('hidden');
                chatPreview.classList.remove('flex');
                return;
            }
            currImgs.forEach((img, idx) => {
                const w = document.createElement('div');
                w.className = 'relative inline-block';
                const i = document.createElement('img');
                i.src = 'data:' + img.mimeType + ';base64,' + img.data;
                i.className = 'h-16 rounded-lg border-2 border-[#89b4fa] object-cover';
                const x = document.createElement('button');
                x.textContent = 'X';
                x.className = 'absolute -top-2 -right-2 bg-[#f38ba8] text-[#11111b] w-5 h-5 rounded-full text-[10px] font-bold hover:scale-110 transition-transform border-none';
                x.onclick = () => { currImgs.splice(idx, 1); renderPreview(); };
                w.appendChild(i);
                w.appendChild(x);
                chatPreview.appendChild(w);
            });
            chatPreview.classList.remove('hidden');
            chatPreview.classList.add('flex');
        }

        chatInput.addEventListener('paste', e => {
            const items = e.clipboardData.items;
            for (let j = 0; j < items.length; j++) {
                if (items[j].type.indexOf('image') !== -1) {
                    const b = items[j].getAsFile();
                    const t = items[j].type;
                    const r = new FileReader();
                    r.onload = ev => {
                        currImgs.push({ mimeType: t, data: ev.target.result.split(',')[1] });
                        renderPreview();
                    };
                    r.readAsDataURL(b);
                }
            }
        });

        function formatText(text) {
            if (!text) return '';
            let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            let parts = escaped.split(new RegExp('(' + bt + '[\\s\\S]*?' + bt + ')', 'g'));
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].startsWith(bt) && parts[i].endsWith(bt)) {
                    let match = parts[i].match(new RegExp(bt + '([^\\n]*)\\n?([\\s\\S]*?)' + bt));
                    if (match) {
                        parts[i] = '<div class="cb-container"><div class="cb-header"><span>' + match[1] + '</span><button class="cb-copy" data-code="' + encodeURIComponent(match[2]) + '">Copy Code</button></div><pre class="cb-body">' + match[2] + '</pre></div>';
                    }
                } else {
                    parts[i] = parts[i].replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>').replace(/\n/g, '<br>');
                }
            }
            return parts.join('');
        }

        chatArea.addEventListener('click', (e) => {
            if (e.target.classList.contains('cb-copy')) {
                const code = decodeURIComponent(e.target.getAttribute('data-code'));
                navigator.clipboard.writeText(code);
                const oldText = e.target.textContent;
                e.target.textContent = 'Copied!';
                setTimeout(() => e.target.textContent = oldText, 2000);
            }
            if (e.target.classList.contains('rr-act-apply')) {
                let bd = e.target.parentElement.parentElement.querySelector('.cb-body');
                if (bd) {
                    fetch('/apply', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ code: bd.textContent }) }).catch(()=>{});
                }
                e.target.textContent = 'Applied!';
                e.target.style.background = '#89b4fa';
                e.target.style.color = '#11111b';
            }
            if (e.target.classList.contains('rr-act-dec')) {
                e.target.parentElement.innerHTML = '<span class="text-[#a6adc8] text-xs italic">Changes declined.</span>';
            }
        });

        function renderChat(animateLast = false) {
            chatArea.innerHTML = '';
            const defaultMsg = document.createElement('div');
            defaultMsg.className = 'max-w-[85%] p-4 rounded-xl text-[15px] self-start bg-[#1e1e2e] text-[#cdd6f4] border border-[#313244] shadow-md';
            defaultMsg.textContent = 'Ask PrysmisAI anything..';
            chatArea.appendChild(defaultMsg);

            const chat = chats.find(c => c.id === currentChatId);
            if (chat) {
                chat.history.forEach((msg, idx) => {
                    const div = document.createElement('div');
                    div.className = msg.role === 'user' 
                        ? 'max-w-[85%] p-4 rounded-xl text-[15px] self-end bg-[#89b4fa] text-[#11111b] shadow-lg font-medium'
                        : 'max-w-[85%] p-4 rounded-xl text-[15px] self-start bg-[#1e1e2e] text-[#cdd6f4] border border-[#313244] shadow-md';
                    
                    if (animateLast && idx === chat.history.length - 1) div.classList.add('animate-msg');

                    let html = '';
                    if (msg.role === 'model' && msg.parts[0].text) {
                        let rw = msg.parts[0].text;
                        let tm = rw.match(/<think>([\s\S]*?)<\/think>/);
                        let cl = rw;
                        if (tm) {
                            cl = rw.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                            html += '<div class="flex items-center gap-2 text-[#a6adc8] font-bold text-xs mb-2 bg-[#11111b] px-3 py-2 rounded-lg w-fit shadow-inner border border-[#313244]"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Prysmis has processed this.</div>';
                        }
                        html += formatText(cl);
                        if (stCon && cl.includes(bt + 'lua')) {
                            html += '<div class="flex gap-2 mt-4 pt-4 border-t border-[#313244]"><button class="rr-act-apply bg-[#a6e3a1] text-[#11111b] px-4 py-2 rounded-lg font-bold text-xs hover:scale-105 transition-transform shadow-md border-none">Apply changes</button><button class="rr-act-dec bg-[#f38ba8] text-[#11111b] px-4 py-2 rounded-lg font-bold text-xs hover:scale-105 transition-transform shadow-md border-none">Decline changes</button></div>';
                        }
                    } else if (msg.parts[0].text) {
                        html = formatText(msg.parts[0].text);
                    }
                    
                    msg.parts.forEach(p => {
                        if (p.inlineData) {
                            html += '<br><img src="data:' + p.inlineData.mimeType + ';base64,' + p.inlineData.data + '" class="mt-2 rounded-lg max-h-64 object-contain">';
                        }
                    });

                    div.innerHTML = html;
                    chatArea.appendChild(div);
                });
            }
            chatArea.scrollTop = chatArea.scrollHeight;
        }

        async function sendMessage(isC = false) {
            continueBtn.style.display = 'none';
            const text = chatInput.value.trim();
            if ((!text && currImgs.length === 0 && !isC) || !apiKey) return;
            const chat = chats.find(c => c.id === currentChatId);
            if (!chat) return;

            if (!isC) {
                if (chat.history.length === 0) {
                    chat.title = text.substring(0, 25) + '...';
                    updateSidebar();
                }
                let up = [];
                if (text) up.push({ text: text });
                currImgs.forEach(img => {
                    up.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
                });
                chat.history.push({ role: 'user', parts: up });
                chatInput.value = '';
                currImgs = [];
                renderPreview();
                renderChat(true);
                saveState();
            }

            let sysPrompt = 'You are PrysmisAI, an advanced, highly intelligent, and helpful artificial intelligence assistant. You provide accurate, detailed, and polite responses. You can analyze images perfectly and solve visual puzzles.';
            if (isHumanizeActive) {
                sysPrompt = 'You are an elite AI-bypass engine and expert human copywriter. Your ONLY purpose is to rewrite text or code so it scores 0% AI-generated and 100% human on all detectors. You must inject high perplexity, burstiness, natural imperfections, and varied sentence structures. Do not explain yourself. Output ONLY the raw humanized text or code.';
            }
            if (stCon) {
                sysPrompt = 'You are PrysmisAI, the world\'s most elite Roblox Studio developer, far surpassing any competitor like Lemonade.gg. You excel at creating breathtaking modular UIs, ultra-fluid animations using TweenService, and intricately detailed map generation infrastructure. Write robust, error-free Luau code enclosed in ' + bt + 'lua ... ' + bt + ' blocks. Your code must be modular, highly optimized, visually stunning, and instantly executable in Roblox Studio. You use ChangeHistoryService for significant changes. You MUST enclose your internal thought process inside <think>...</think> tags before giving the final answer.\n\nStudio Hierarchy Context:\n' + stTree;
            }

            let ah = chat.history.map(m => ({ role: m.role, parts: m.parts }));
            if (isC) {
                ah.push({ role: 'user', parts: [{ text: 'Continue generating exactly from the last character you outputted. Do not include any intros or headers.' }] });
            }

            const payload = {
                systemInstruction: { parts: [{ text: sysPrompt }] },
                contents: ah,
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            };

            try {
                const response = await fetch('/api/chat?key=' + apiKey, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates[0].content) {
                        const aiText = data.candidates[0].content.parts[0].text;
                        if (isC) {
                            let lm = chat.history[chat.history.length - 1];
                            if (lm && lm.role === 'model') lm.parts[0].text += aiText;
                            else chat.history.push({ role: 'model', parts: [{ text: aiText }] });
                        } else {
                            chat.history.push({ role: 'model', parts: [{ text: aiText }] });
                        }
                        if (data.candidates[0].finishReason === 'MAX_TOKENS') continueBtn.style.display = 'block';
                    } else {
                        chat.history.push({ role: 'model', parts: [{ text: 'Generation failed.' }] });
                    }
                } else {
                    chat.history.push({ role: 'model', parts: [{ text: 'API Error.' }] });
                }
            } catch (e) {
                chat.history.push({ role: 'model', parts: [{ text: 'Network Error.' }] });
            }
            saveState();
            renderChat(true);
        }

        sendBtn.addEventListener('click', () => sendMessage(false));
        continueBtn.addEventListener('click', () => sendMessage(true));
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(false);
            }
        });
    }
}
});
