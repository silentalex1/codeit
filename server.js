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

        const wbToggle = document.getElementById('wb-toggle');
        const wbClose = document.getElementById('wb-close');
        const wbPanel = document.getElementById('whiteboard-panel');
        const wbCanvas = document.getElementById('wb-canvas');
        const wbCtx = wbCanvas.getContext('2d');
        const wbClear = document.getElementById('wb-clear');
        const toolPencil = document.getElementById('tool-pencil');
        const toolEraser = document.getElementById('tool-eraser');
        const stepPrev = document.getElementById('step-prev');
        const stepPlay = document.getElementById('step-play');
        const stepNext = document.getElementById('step-next');

        const customCMenu = document.getElementById('custom-cmenu');
        const cmenuReply = document.getElementById('cmenu-reply');

        const mobileImageBtn = document.getElementById('mobile-image-btn');
        const mobileImageInput = document.getElementById('mobile-image-input');

        let apiKey = localStorage.getItem('prysmis_api_key') || '';
        let isHumanizeActive = false;
        let chats = [];
        let currentChatId = null;
        let stCon = false;
        let stTree = '';
        let currImgs = [];
        let isContinuing = false;
        let activeSharedScreen = '';

        let wbSteps = [];
        let wbCurrentStep = 0;
        let wbAnimInterval = null;
        let isWbPlaying = false;
        let isWbDrawing = false;
        let wbLastX = 0;
        let wbLastY = 0;
        let wbTool = 'pencil';
        let drawProgress = 0;
        let animFrameId = null;

        let selectedMsgIdForReply = null;
        let selectedMsgTextForReply = '';
        let currentReplyId = null;

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
                if (data.screen) {
                    activeSharedScreen = data.screen;
                    let scEl = document.getElementById('screen-preview');
                    if (!scEl) {
                        scEl = document.createElement('div');
                        scEl.id = 'screen-preview';
                        scEl.className = 'flex flex-col p-4 bg-[#1e1e2e] border border-[#313244] rounded-xl mt-4 shrink-0';
                        scEl.innerHTML = '<span class="text-xs font-bold text-[#a6adc8] mb-2 uppercase tracking-wider">Shared Screen</span><img id="scr-img" class="rounded-lg w-full max-h-40 object-cover border border-[#313244] shadow-md">';
                        document.getElementById('chat-list-container').parentElement.appendChild(scEl);
                    }
                    document.getElementById('scr-img').src = data.screen;
                } else {
                    activeSharedScreen = '';
                    const scEl = document.getElementById('screen-preview');
                    if (scEl) scEl.remove();
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
            let currentModelName = isHumanizeActive ? "humanize-bypass" : "gemini-2.5 pro";
            fetch('/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activeModel: currentModelName })
            }).catch(() => {});
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

        mobileImageBtn.addEventListener('click', () => {
            mobileImageInput.click();
        });

        mobileImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    currImgs.push({ mimeType: file.type, data: ev.target.result.split(',')[1] });
                    renderPreview();
                };
                reader.readAsDataURL(file);
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

        chatArea.addEventListener('contextmenu', (e) => {
            const msgDiv = e.target.closest('.msg-model-type');
            if (msgDiv) {
                e.preventDefault();
                selectedMsgIdForReply = msgDiv.dataset.msgId;
                selectedMsgTextForReply = msgDiv.dataset.msgText || '';
                customCMenu.style.left = `${e.clientX}px`;
                customCMenu.style.top = `${e.clientY}px`;
                customCMenu.classList.remove('hidden');
            }
        });

        document.addEventListener('click', () => {
            customCMenu.classList.add('hidden');
        });

        customCMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        cmenuReply.onclick = () => {
            currentReplyId = selectedMsgIdForReply;
            const preview = document.getElementById('reply-preview');
            const previewText = document.getElementById('reply-preview-text');
            previewText.textContent = `Replying to: "${selectedMsgTextForReply.substring(0, 60)}..."`;
            preview.classList.remove('hidden');
            customCMenu.classList.add('hidden');
        };

        document.getElementById('reply-cancel').onclick = () => {
            currentReplyId = null;
            document.getElementById('reply-preview').classList.add('hidden');
        };

        function renderChat(animateLast = false) {
            chatArea.innerHTML = '';
            const defaultMsg = document.createElement('div');
            defaultMsg.className = 'max-w-[85%] p-4 rounded-xl text-[15px] self-start bg-[#1e1e2e] text-[#cdd6f4] border border-[#313244] shadow-md';
            defaultMsg.textContent = 'Ask PrysmisAI anything..';
            chatArea.appendChild(defaultMsg);

            const chat = chats.find(c => c.id === currentChatId);
            if (chat) {
                chat.history.forEach((msg, idx) => {
                    if (!msg.id) {
                        msg.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                    }

                    const wrapper = document.createElement('div');
                    wrapper.className = 'w-full flex flex-col relative my-2 ' + (msg.role === 'user' ? 'items-end' : 'items-start');

                    if (msg.role === 'user' && msg.replyToId) {
                        const parentMsg = chat.history.find(m => m.id === msg.replyToId);
                        if (parentMsg) {
                            const parentText = parentMsg.parts[0].text || '';
                            const replyHeader = document.createElement('div');
                            replyHeader.className = 'flex items-center gap-2 text-xs text-[#a6adc8] mb-1 mr-2 opacity-80 select-none';
                            replyHeader.innerHTML = `
                                <svg class="w-3 h-3 text-[#585b70]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                                <span class="italic">Replying to: "${parentText.substring(0, 50)}..."</span>
                            `;
                            wrapper.appendChild(replyHeader);
                        }
                    }

                    const div = document.createElement('div');
                    div.className = msg.role === 'user' 
                        ? 'max-w-[85%] p-4 rounded-xl text-[15px] bg-[#89b4fa] text-[#11111b] shadow-lg font-medium relative'
                        : 'max-w-[85%] p-4 rounded-xl text-[15px] bg-[#1e1e2e] text-[#cdd6f4] border border-[#313244] shadow-md msg-model-type relative';
                    
                    div.dataset.msgId = msg.id;
                    if (msg.role === 'model' && msg.parts[0].text) {
                        div.dataset.msgText = msg.parts[0].text;
                    }

                    if (animateLast && idx === chat.history.length - 1) div.classList.add('animate-msg');

                    if (msg.role === 'user' && msg.replyToId) {
                        const line = document.createElement('div');
                        line.className = 'absolute left-[-28px] top-[-10px] w-[24px] h-[20px] border-l-2 border-t-2 border-[#45475a] rounded-tl-[8px] pointer-events-none opacity-60';
                        div.appendChild(line);
                    }

                    let html = '';
                    if (msg.role === 'model' && msg.parts[0].text) {
                        let rw = msg.parts[0].text;
                        let tm = rw.match(/<think>([\s\S]*?)<\/think>/);
                        let cl = rw;
                        if (tm) {
                            cl = rw.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                            html += '<div class="flex items-center gap-2 text-[#a6adc8] font-bold text-xs mb-2 bg-[#11111b] px-3 py-2 rounded-lg w-fit shadow-inner border border-[#313244]"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Prysmis has processed this.</div>';
                        }
                        let wbMatch = cl.match(/<whiteboard>([\s\S]*?)<\/whiteboard>/);
                        if (wbMatch) {
                            cl = cl.replace(/<whiteboard>[\s\S]*?<\/whiteboard>/, '').trim();
                            try {
                                const parsed = JSON.parse(wbMatch[1]);
                                wbSteps = parsed.steps;
                                document.getElementById('wb-title').textContent = parsed.title || 'Whiteboard';
                                wbPanel.classList.remove('w-0');
                                wbPanel.classList.add('w-[500px]');
                                setTimeout(resizeCanvas, 310);
                                wbCurrentStep = 0;
                                startStepAnimation(0);
                            } catch (err) {}
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

                    const inlineContainer = document.createElement('div');
                    inlineContainer.innerHTML = html;
                    div.appendChild(inlineContainer);
                    wrapper.appendChild(div);
                    chatArea.appendChild(wrapper);
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
                if (activeSharedScreen) {
                    const b64Data = activeSharedScreen.split(',')[1];
                    up.push({ inlineData: { mimeType: 'image/jpeg', data: b64Data } });
                }

                let userMsgId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                const newMsg = { id: userMsgId, role: 'user', parts: up };
                if (currentReplyId) {
                    newMsg.replyToId = currentReplyId;
                }

                chat.history.push(newMsg);
                chatInput.value = '';
                currImgs = [];
                currentReplyId = null;
                document.getElementById('reply-preview').classList.add('hidden');
                renderPreview();
                renderChat(true);
                saveState();
            }

            let sysPrompt = 'You are PrysmisAI, an advanced, highly intelligent, and helpful artificial intelligence assistant. You provide accurate, detailed, and polite responses. You can analyze images perfectly and solve visual puzzles. If there is an image attached, it represents the user\'s real-time browser/screen captured via a connected bookmarklet, meaning you CAN see their screen. Use this context to solve their math, geometry, or browser problems perfectly. If the user asks a complex mathematical, geometric, or graphing question, you MUST include a step-by-step interactive whiteboard drawing inside an XML block format in your response: <whiteboard>{"title":"Title","steps":[{"text":"Step description","draw":[{"type":"line","x1":100,"y1":100,"x2":200,"y2":200,"color":"#89b4fa","width":3}]}]}</whiteboard>. Scale coordinates strictly from 0 to 500. Compute geometric coordinates using exact trigonometric rules. (vertex typically (250, 350) inside 500x500 viewport). Supports: line, arc (x, y, r, start, end, color, width), text (content, x, y, size, color).';
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
                        let aiMsgId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                        if (isC) {
                            let lm = chat.history[chat.history.length - 1];
                            if (lm && lm.role === 'model') lm.parts[0].text += aiText;
                            else chat.history.push({ id: aiMsgId, role: 'model', parts: [{ text: aiText }] });
                        } else {
                            chat.history.push({ id: aiMsgId, role: 'model', parts: [{ text: aiText }] });
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

        wbToggle.onclick = () => {
            if (wbPanel.classList.contains('w-0')) {
                wbPanel.classList.remove('w-0');
                wbPanel.classList.add('w-[500px]');
                setTimeout(resizeCanvas, 310);
            } else {
                wbPanel.classList.remove('w-[500px]');
                wbPanel.classList.add('w-0');
            }
        };

        wbClose.onclick = () => {
            wbPanel.classList.remove('w-[500px]');
            wbPanel.classList.add('w-0');
        };

        function getViewport() {
            const w = wbCanvas.width / (window.devicePixelRatio || 1);
            const h = wbCanvas.height / (window.devicePixelRatio || 1);
            const size = Math.min(w, h) * 0.9;
            const offsetX = (w - size) / 2;
            const offsetY = (h - size) / 2;
            return { size, offsetX, offsetY };
        }

        function tx(x) {
            const vp = getViewport();
            return vp.offsetX + (x / 500) * vp.size;
        }

        function ty(y) {
            const vp = getViewport();
            return vp.offsetY + (y / 500) * vp.size;
        }

        function ts(size) {
            const vp = getViewport();
            return (size / 500) * vp.size;
        }

        function resizeCanvas() {
            const rect = wbCanvas.parentElement.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            wbCanvas.width = rect.width * dpr;
            wbCanvas.height = rect.height * dpr;
            wbCtx.scale(dpr, dpr);
            if (wbSteps.length > 0) renderWbStep(wbCurrentStep);
        }

        window.addEventListener('resize', resizeCanvas);

        function startStepAnimation(stepIdx) {
            if (animFrameId) cancelAnimationFrame(animFrameId);
            let startTime = null;
            const duration = 1000;

            function frame(timestamp) {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                drawProgress = progress;
                renderWbStep(stepIdx, progress);
                if (progress < 1) {
                    animFrameId = requestAnimationFrame(frame);
                }
            }
            animFrameId = requestAnimationFrame(frame);
        }

        function renderWbStep(stepIdx, progress = 1) {
            if (stepIdx < 0 || stepIdx >= wbSteps.length) return;
            const step = wbSteps[stepIdx];
            const stepOverlay = document.getElementById('wb-step-overlay');
            stepOverlay.classList.remove('hidden');
            document.getElementById('wb-step-num').textContent = `Step ${stepIdx + 1} of ${wbSteps.length}`;
            document.getElementById('wb-step-desc').textContent = step.text || '';

            wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
            wbCtx.lineCap = 'round';
            wbCtx.lineJoin = 'round';

            for (let i = 0; i <= stepIdx; i++) {
                const s = wbSteps[i];
                const activeProgress = (i === stepIdx) ? progress : 1;
                if (s.draw) {
                    s.draw.forEach(cmd => {
                        wbCtx.beginPath();
                        wbCtx.strokeStyle = cmd.color || '#89b4fa';
                        wbCtx.lineWidth = ts(cmd.width || 3);
                        wbCtx.shadowBlur = 8;
                        wbCtx.shadowColor = cmd.color || '#89b4fa';
                        wbCtx.globalAlpha = (i === stepIdx) ? activeProgress : 1;

                        if (cmd.type === 'line') {
                            const x1 = tx(cmd.x1);
                            const y1 = ty(cmd.y1);
                            const x2 = tx(cmd.x2);
                            const y2 = ty(cmd.y2);
                            wbCtx.moveTo(x1, y1);
                            wbCtx.lineTo(x1 + (x2 - x1) * activeProgress, y1 + (y2 - y1) * activeProgress);
                            wbCtx.stroke();
                        } else if (cmd.type === 'arc') {
                            const x = tx(cmd.x);
                            const y = ty(cmd.y);
                            const r = ts(cmd.r);
                            const startRad = (cmd.start || 0) * Math.PI / 180;
                            const endRad = (cmd.end || 360) * Math.PI / 180;
                            wbCtx.arc(x, y, r, startRad, startRad + (endRad - startRad) * activeProgress);
                            wbCtx.stroke();
                        } else if (cmd.type === 'text') {
                            wbCtx.fillStyle = cmd.color || '#cdd6f4';
                            wbCtx.font = `bold ${ts(cmd.size || 16)}px sans-serif`;
                            wbCtx.shadowBlur = 0;
                            wbCtx.fillText(cmd.content, tx(cmd.x), ty(cmd.y));
                        }
                    });
                }
            }
            wbCtx.shadowBlur = 0;
            wbCtx.globalAlpha = 1;
        }

        stepPlay.onclick = () => {
            isWbPlaying = !isWbPlaying;
            if (isWbPlaying) {
                stepPlay.textContent = 'Pause';
                wbAnimInterval = setInterval(() => {
                    if (wbCurrentStep < wbSteps.length - 1) {
                        wbCurrentStep++;
                        startStepAnimation(wbCurrentStep);
                    } else {
                        clearInterval(wbAnimInterval);
                        isWbPlaying = false;
                        stepPlay.textContent = 'Play';
                    }
                }, 3000);
            } else {
                stepPlay.textContent = 'Play';
                clearInterval(wbAnimInterval);
            }
        };

        stepPrev.onclick = () => {
            if (wbCurrentStep > 0) {
                wbCurrentStep--;
                startStepAnimation(wbCurrentStep);
            }
        };

        stepNext.onclick = () => {
            if (wbCurrentStep < wbSteps.length - 1) {
                wbCurrentStep++;
                startStepAnimation(wbCurrentStep);
            }
        };

        wbCanvas.addEventListener('mousedown', (e) => {
            isWbDrawing = true;
            const rect = wbCanvas.getBoundingClientRect();
            wbLastX = (e.clientX - rect.left) * (wbCanvas.width / rect.width) / (window.devicePixelRatio || 1);
            wbLastY = (e.clientY - rect.top) * (wbCanvas.height / rect.height) / (window.devicePixelRatio || 1);
        });

        wbCanvas.addEventListener('mousemove', (e) => {
            if (!isWbDrawing) return;
            const rect = wbCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (wbCanvas.width / rect.width) / (window.devicePixelRatio || 1);
            const y = (e.clientY - rect.top) * (wbCanvas.height / rect.height) / (window.devicePixelRatio || 1);

            wbCtx.beginPath();
            wbCtx.shadowBlur = 4;
            if (wbTool === 'pencil') {
                wbCtx.strokeStyle = '#89b4fa';
                wbCtx.lineWidth = 4;
                wbCtx.shadowColor = '#89b4fa';
            } else {
                wbCtx.strokeStyle = '#1e1e2e';
                wbCtx.lineWidth = 30;
                wbCtx.shadowColor = 'transparent';
            }
            wbCtx.lineCap = 'round';
            wbCtx.lineJoin = 'round';
            wbCtx.moveTo(wbLastX, wbLastY);
            wbCtx.lineTo(x, y);
            wbCtx.stroke();
            wbLastX = x;
            wbLastY = y;
        });

        wbCanvas.addEventListener('mouseup', () => isWbDrawing = false);
        wbCanvas.addEventListener('mouseleave', () => isWbDrawing = false);

        wbClear.onclick = () => {
            wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
            document.getElementById('wb-step-overlay').classList.add('hidden');
            wbSteps = [];
            wbCurrentStep = 0;
        };

        toolPencil.onclick = () => {
            wbTool = 'pencil';
            toolPencil.className = 'p-2 bg-[#89b4fa] text-[#11111b] rounded-lg font-bold text-xs';
            toolEraser.className = 'p-2 bg-[#313244] text-[#cdd6f4] rounded-lg font-bold text-xs hover:bg-[#45475a]';
        };

        toolEraser.onclick = () => {
            wbTool = 'eraser';
            toolEraser.className = 'p-2 bg-[#89b4fa] text-[#11111b] rounded-lg font-bold text-xs';
            toolPencil.className = 'p-2 bg-[#313244] text-[#cdd6f4] rounded-lg font-bold text-xs hover:bg-[#45475a]';
        };

        sendBtn.addEventListener('click', () => sendMessage(false));
        continueBtn.addEventListener('click', () => sendMessage(true));
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(false);
            }
        });
    }
});
