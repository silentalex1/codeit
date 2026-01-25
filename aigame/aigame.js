document.addEventListener('DOMContentLoaded', async () => {
    let sessionData = JSON.parse(sessionStorage.getItem('copilot_session'));
    if (!sessionData) {
        window.location.href = "../";
        return;
    }
    const inputElement = document.getElementById('ai-query');
    const generateButton = document.getElementById('gen-action');
    const centralHub = document.getElementById('hub');
    const chatScroller = document.getElementById('chat-scroller');
    const sidebarElement = document.getElementById('sidebar');
    const restorationHandle = document.getElementById('restore-tab');
    const userAvatar = document.getElementById('u-avatar');
    const profileDropdown = document.getElementById('u-dropdown');
    const modalSettings = document.getElementById('settings-modal');
    const profileFileInput = document.getElementById('pfp-file');
    const imagePreview = document.getElementById('pfp-preview');
    const dropContainer = document.getElementById('drop-content');
    const promptsContainer = document.getElementById('premade-container');
    const notificationBox = document.getElementById('ui-notifier');
    const notificationSpan = document.getElementById('notif-text');
    const uploadInput = document.getElementById('media-input');
    const uploadButton = document.getElementById('media-btn');
    const filePreviewBar = document.getElementById('media-preview-bar');
    const intelligenceSelect = document.getElementById('set-model');
    const modalSearch = document.getElementById('search-modal');
    const searchInputField = document.getElementById('search-q');
    const commBtn = document.getElementById('community-btn');
    const pluginBtn = document.getElementById('conn-plugin');
    const pluginModal = document.getElementById('plugin-modal');
    const pluginYes = document.getElementById('plugin-yes');
    const pluginNo = document.getElementById('plugin-no');
    const pluginClose = document.getElementById('close-plugin-modal');
    let chatMemory = [];
    let localState = {
        nickname: sessionData.name,
        pfp: '',
        workMode: false,
        hideSidebar: false,
        aiModel: 'gemini-3-pro'
    };
    let currentUploads = [];
    const getHardwareProfile = () => {
        const viewportWidth = window.innerWidth;
        const isTactile = navigator.maxTouchPoints > 0;
        let identifiedMode = "pc";
        if (viewportWidth <= 600) {
            identifiedMode = "mobile";
        } else if (viewportWidth <= 1024) {
            identifiedMode = "tablet";
        } else if (viewportWidth <= 1440 && isTactile) {
            identifiedMode = "laptop";
        }
        document.documentElement.dataset.ui = identifiedMode;
        return identifiedMode;
    };
    const triggerSystemNotification = async (hardwareType) => {
        if (sessionStorage.getItem('notified_device_session_v4')) return;
        notificationBox.classList.add('show');
        const sequenceList = [
            "detecting the user device..",
            `user is on ${hardwareType}`,
            `switching site to ${hardwareType}`,
            `switch to ${hardwareType}`
        ];
        for (const phase of sequenceList) {
            notificationSpan.innerText = phase;
            await new Promise(resolve => setTimeout(resolve, 950));
        }
        notificationBox.classList.add('fade');
        setTimeout(() => {
            notificationBox.classList.remove('show', 'fade');
            sessionStorage.setItem('notified_device_session_v4', 'true');
        }, 600);
    };
    const fetchCloudData = async () => {
        try {
            const rawStore = await puter.kv.get('copilot_accounts');
            const parsedStore = rawStore ? JSON.parse(rawStore) : {};
            if (parsedStore[sessionData.name]) {
                const dataBlock = parsedStore[sessionData.name].settings || {};
                localState = {
                    ...localState,
                    ...dataBlock
                };
                chatMemory = parsedStore[sessionData.name].history || [];
                updateSystemUI();
                renderChatLogs();
            }
        } catch (error) {
            console.error("Cloud Access Denied", error);
        }
    };
    const updateSystemUI = () => {
        if (userAvatar && localState.pfp) {
            userAvatar.style.backgroundImage = `url(${localState.pfp})`;
        }
        document.getElementById('set-name').value = localState.nickname;
        document.getElementById('set-pfp').value = localState.pfp;
        if (localState.aiModel) {
            intelligenceSelect.value = localState.aiModel;
        }
        if (localState.pfp) {
            imagePreview.src = localState.pfp;
            imagePreview.style.display = 'block';
            dropContainer.style.display = 'none';
        }
        generateButton.innerText = localState.workMode ? "Ask" : "Generate";
        document.getElementById('work-lever').classList.toggle('on', localState.workMode);
        document.getElementById('side-lever').classList.toggle('on', localState.hideSidebar);
        if (localState.workMode) {
            displayWorkPresets();
        } else {
            displayCreativePresets();
        }
        if (localState.hideSidebar) {
            sidebarElement.classList.add('hidden');
            restorationHandle.style.display = 'block';
        } else {
            sidebarElement.classList.remove('hidden');
            restorationHandle.style.display = 'none';
        }
    };
    const displayCreativePresets = () => {
        const creativeList = [
            { label: "create me a obby that ", text: "create me a obby that ___" },
            { label: "make me a horror scene that does ", text: "make me a horror scene that does ___" },
            { label: "create me a map that looks like ", text: "create me a map that looks like ___" }
        ];
        promptsContainer.innerHTML = creativeList.map(item => `
            <button class="premade-pill" data-prompt="${item.label}">
                ${item.text}
            </button>
        `).join('');
        linkPresetActions();
    };
    const displayWorkPresets = () => {
        const professionalList = [
            { label: "solve this math question: ", text: "solve this math question: ___" },
            { label: "who would win godzilla vs thor?", text: "who would win godzilla vs thor?" },
            { label: "fix this code: ", text: "fix this code: ___" }
        ];
        promptsContainer.innerHTML = professionalList.map(item => `
            <button class="premade-pill" data-prompt="${item.label}">
                ${item.text}
            </button>
        `).join('');
        linkPresetActions();
    };
    const linkPresetActions = () => {
        const presetElements = document.querySelectorAll('.premade-pill');
        presetElements.forEach(element => {
            element.addEventListener('click', () => {
                inputElement.value = element.dataset.prompt;
                inputElement.focus();
                refreshInputHeight();
            });
        });
    };
    const refreshInputHeight = () => {
        inputElement.style.height = 'auto';
        inputElement.style.height = Math.min(inputElement.scrollHeight, 180) + 'px';
    };
    const commitToCloud = async () => {
        try {
            const rawStore = await puter.kv.get('copilot_accounts');
            const parsedStore = rawStore ? JSON.parse(rawStore) : {};
            parsedStore[sessionData.name] = {
                ...parsedStore[sessionData.name],
                settings: localState,
                history: chatMemory
            };
            await puter.kv.set('copilot_accounts', JSON.stringify(parsedStore));
        } catch (error) {
            console.error("Cloud Transaction Failed", error);
        }
    };
    const buildUploadPreviews = () => {
        filePreviewBar.innerHTML = '';
        currentUploads.forEach((item, pointer) => {
            const wrap = document.createElement('div');
            wrap.className = 'media-item-preview';
            wrap.innerHTML = `
                <img src="${item.data}" alt="Media">
                <div class="media-rm-btn" data-ptr="${pointer}">×</div>
            `;
            filePreviewBar.appendChild(wrap);
        });
        const removalButtons = document.querySelectorAll('.media-rm-btn');
        removalButtons.forEach(button => {
            button.onclick = (event) => {
                const targetIdx = parseInt(event.target.dataset.ptr);
                currentUploads.splice(targetIdx, 1);
                buildUploadPreviews();
            };
        });
    };
    const processPasteEvent = (pasteEvent) => {
        const clipboardStream = pasteEvent.clipboardData.items;
        for (let entry of clipboardStream) {
            if (entry.type.includes('image')) {
                const rawFile = entry.getAsFile();
                const fileLink = new FileReader();
                fileLink.onload = (loadEvent) => {
                    currentUploads.push({ data: loadEvent.target.result });
                    buildUploadPreviews();
                };
                fileLink.readAsDataURL(rawFile);
            }
        }
    };
    const convertMarkdown = (inputString) => {
        let transformed = inputString
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li>$1</li>');
        transformed = transformed.replace(/```([a-z]*)\n([\s\S]*?)```/g, (rawMatch, language, source) => {
            const uniqueID = 'code_' + Math.random().toString(36).substr(2, 7);
            return `
                <div class="code-block-aesthetic">
                    <div class="code-header-aesthetic">
                        <span class="code-lang-tag">${language || 'code'}</span>
                        <button class="copy-action-btn" data-id="${uniqueID}">Copy</button>
                    </div>
                    <pre><code id="${uniqueID}">${source.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
                </div>
            `;
        });
        return transformed;
    };
    const runInferenceTask = async () => {
        const queryVal = inputElement.value.trim();
        if (!queryVal && currentUploads.length === 0) return;
        const verification = await puter.auth.isSignedIn();
        if (!verification) {
            await puter.auth.signIn();
            return;
        }
        centralHub.classList.add('vanished');
        chatScroller.style.display = 'block';
        const userNode = document.createElement('div');
        userNode.className = 'msg-bubble-user';
        if (currentUploads.length > 0) {
            const imageStrip = document.createElement('div');
            imageStrip.className = 'chat-image-strip';
            currentUploads.forEach(imgData => {
                const imgNode = document.createElement('img');
                imgNode.src = imgData.data;
                imgNode.className = 'chat-sent-image';
                imageStrip.appendChild(imgNode);
            });
            userNode.appendChild(imageStrip);
        }
        if (queryVal) {
            const textContent = document.createElement('div');
            textContent.innerHTML = convertMarkdown(queryVal);
            userNode.appendChild(textContent);
        }
        chatScroller.appendChild(userNode);
        const snapshotUploads = [...currentUploads];
        inputElement.value = '';
        currentUploads = [];
        buildUploadPreviews();
        inputElement.style.height = '48px';
        const aiNode = document.createElement('div');
        aiNode.className = 'msg-bubble-ai';
        const thinkingIndicator = document.createElement('div');
        thinkingIndicator.className = 'ai-reasoning-wrap';
        thinkingIndicator.innerHTML = `
            <div class="thinking-dots">
                <div class="t-dot"></div><div class="t-dot"></div><div class="t-dot"></div>
            </div>
            <span>${localState.workMode ? 'Logic Engine computing...' : 'Creativity Matrix synthesizing...'}</span>
        `;
        aiNode.appendChild(thinkingIndicator);
        chatScroller.appendChild(aiNode);
        chatScroller.scrollTop = chatScroller.scrollHeight;
        try {
            const aiResponse = await puter.ai.chat(queryVal, { model: localState.aiModel });
            const outputText = aiResponse.message ? aiResponse.message.content : aiResponse;
            thinkingIndicator.style.display = 'none';
            aiNode.innerHTML = convertMarkdown(String(outputText));
            chatMemory.push({ q: queryVal, a: String(outputText), images: snapshotUploads });
            renderChatLogs();
            await commitToCloud();
        } catch (error) {
            thinkingIndicator.style.display = 'none';
            aiNode.innerHTML = `<span class="error-text">Request aborted. Verify Puter availability.</span>`;
        }
        chatScroller.scrollTop = chatScroller.scrollHeight;
    };
    const renderChatLogs = () => {
        const memoryStack = document.getElementById('chat-history');
        const descendingStack = [...chatMemory].reverse();
        memoryStack.innerHTML = descendingStack.map((block, index) => {
            const referenceIndex = chatMemory.length - 1 - index;
            return `
                <div class="history-item-aesthetic" data-idx="${referenceIndex}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>${block.q || 'Multimedia Entry'}</span>
                </div>
            `;
        }).join('');
        const logElements = document.querySelectorAll('.history-item-aesthetic');
        logElements.forEach(element => {
            element.onclick = () => pullSpecificConversation(parseInt(element.dataset.idx));
        });
    };
    const pullSpecificConversation = (indexVal) => {
        centralHub.classList.add('vanished');
        chatScroller.style.display = 'block';
        chatScroller.innerHTML = '';
        const entry = chatMemory[indexVal];
        const uM = document.createElement('div');
        uM.className = 'msg-bubble-user';
        if (entry.images && entry.images.length > 0) {
            const strip = document.createElement('div');
            strip.className = 'chat-image-strip';
            entry.images.forEach(img => {
                const i = document.createElement('img');
                i.src = img.data;
                i.className = 'chat-sent-image';
                strip.appendChild(i);
            });
            uM.appendChild(strip);
        }
        if (entry.q) {
            const t = document.createElement('div');
            t.innerHTML = convertMarkdown(entry.q);
            uM.appendChild(t);
        }
        const aM = document.createElement('div');
        aM.className = 'msg-bubble-ai';
        aM.innerHTML = convertMarkdown(entry.a);
        chatScroller.appendChild(uM);
        chatScroller.appendChild(aM);
    };
    generateButton.addEventListener('click', runInferenceTask);
    inputElement.addEventListener('keydown', (keyEvent) => {
        if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
            keyEvent.preventDefault();
            runInferenceTask();
        }
    });
    inputElement.addEventListener('paste', processPasteEvent);
    inputElement.addEventListener('input', refreshInputHeight);
    userAvatar.addEventListener('click', (avatarEvent) => {
        avatarEvent.stopPropagation();
        profileDropdown.classList.toggle('active');
    });
    document.addEventListener('click', (clickEvent) => {
        if (!userAvatar.contains(clickEvent.target)) {
            profileDropdown.classList.remove('active');
        }
    });
    document.getElementById('trigger-settings').onclick = () => {
        modalSettings.style.display = 'flex';
        profileDropdown.classList.remove('active');
    };
    document.getElementById('select-pfp-btn').onclick = () => profileFileInput.click();
    profileFileInput.onchange = (inputEvent) => {
        const file = inputEvent.target.files[0];
        if (!file) return;
        const decoder = new FileReader();
        decoder.onload = (loadEvent) => {
            localState.pfp = loadEvent.target.result;
            imagePreview.src = localState.pfp;
            imagePreview.style.display = 'block';
            dropContainer.style.display = 'none';
        };
        decoder.readAsDataURL(file);
    };
    document.getElementById('save-all').onclick = async () => {
        localState.nickname = document.getElementById('set-name').value;
        localState.pfp = document.getElementById('set-pfp').value || localState.pfp;
        localState.aiModel = intelligenceSelect.value;
        await commitToCloud();
        updateSystemUI();
        modalSettings.style.display = 'none';
    };
    document.getElementById('work-lever').onclick = () => {
        localState.workMode = !localState.workMode;
        updateSystemUI();
    };
    document.getElementById('side-lever').onclick = () => {
        localState.hideSidebar = !localState.hideSidebar;
        updateSystemUI();
    };
    document.getElementById('mob-toggle').onclick = () => sidebarElement.classList.toggle('open');
    document.getElementById('new-chat').onclick = () => location.reload();
    uploadButton.onclick = () => uploadInput.click();
    uploadInput.onchange = (e) => {
        const list = Array.from(e.target.files);
        list.forEach(f => {
            const r = new FileReader();
            r.onload = (ev) => {
                currentUploads.push({ data: ev.target.result });
                buildUploadPreviews();
            };
            r.readAsDataURL(f);
        });
    };
    commBtn.onclick = () => window.open("https://discord.gg/kkryewvVYt", "_blank");
    pluginBtn.onclick = () => { pluginModal.style.display = 'flex'; };
    pluginClose.onclick = () => { pluginModal.style.display = 'none'; };
    pluginNo.onclick = () => { window.open("https://www.roblox.com/library/placeholder", "_blank"); pluginModal.style.display = 'none'; };
    pluginYes.onclick = async () => {
        try {
            await fetch("http://localhost:21342/connect", { mode: 'no-cors' });
            alert("Sent connection handshake to Roblox Studio.");
        } catch(e) {
            alert("No plugin detected on port 21342. Ensure Studio is open.");
        }
        pluginModal.style.display = 'none';
    };
    const backdropList = document.querySelectorAll('.modal');
    backdropList.forEach(m => {
        m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; };
    });
    const navigationLinks = document.querySelectorAll('.s-link');
    navigationLinks.forEach(l => {
        l.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.s-link, .tab').forEach(el => el.classList.remove('active'));
            l.classList.add('active');
            const targetSection = document.getElementById(l.getAttribute('data-tab'));
            if (targetSection) targetSection.classList.add('active');
        };
    });
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            if (modalSearch.style.display === 'flex') {
                modalSearch.style.display = 'none';
            } else {
                modalSearch.style.display = 'flex';
                searchInputField.focus();
            }
        }
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(activeModal => activeModal.style.display = 'none');
        }
    });
    sidebarElement.addEventListener('dblclick', () => {
        if (localState.hideSidebar && !sidebarElement.classList.contains('hidden')) {
            sidebarElement.classList.add('hidden');
            restorationHandle.style.display = 'block';
            commitToCloud();
        }
    });
    restorationHandle.addEventListener('dblclick', () => {
        if (localState.hideSidebar && sidebarElement.classList.contains('hidden')) {
            sidebarElement.classList.remove('hidden');
            restorationHandle.style.display = 'none';
            commitToCloud();
        }
    });
    const observer = new MutationObserver(() => {
        const btns = document.querySelectorAll('.copy-action-btn');
        btns.forEach(b => {
            b.onclick = () => {
                const id = b.dataset.id;
                const source = document.getElementById(id).innerText;
                navigator.clipboard.writeText(source);
                b.innerText = "Copied!";
                setTimeout(() => b.innerText = "Copy", 2000);
            };
        });
    });
    observer.observe(chatScroller, { childList: true });
    const hardwareIdentity = getHardwareProfile();
    await triggerSystemNotification(hardwareIdentity);
    await fetchCloudData();
    window.addEventListener('resize', getHardwareProfile);
});
