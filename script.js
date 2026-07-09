// Safe element getter that returns a safe fallback if element doesn't exist
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id "${id}" not found`);
        return {
            classList: { add: () => {}, remove: () => {}, toggle: () => {} },
            addEventListener: () => {},
            value: '',
            innerText: '',
            innerHTML: '',
            style: {},
            focus: () => {},
            click: () => {}
        };
    }
    return element;
}

const chatInput = safeGetElement('chatInput');
const inputContainer = safeGetElement('inputContainer');
const chatArea = safeGetElement('chatArea');
const sidebar = safeGetElement('sidebar');
const sidebarToggleBtn = safeGetElement('sidebarToggleBtn');
const toggleIcon = safeGetElement('toggleIcon');
const newChatBtn = safeGetElement('newChatBtn');
const historyContainer = safeGetElement('history');
const contextMenu = safeGetElement('contextMenu');
const renameBtn = safeGetElement('renameBtn');
const deleteBtn = safeGetElement('deleteBtn');
const suggestionsContainer = safeGetElement('suggestions');
const suggestionButtons = document.querySelectorAll('.sugg-btn');
const imagePreviewContainer = safeGetElement('imagePreviewContainer');
const imageUploadBtn = safeGetElement('imageUploadBtn');
const imageInput = safeGetElement('imageInput');
const modelDropdownBtn = safeGetElement('modelDropdownBtn');
const modelDropdown = safeGetElement('modelDropdown');

const settingsBtn = safeGetElement('settingsBtn');
const settingsModal = safeGetElement('settingsModal');
const closeSettingsBtn = safeGetElement('closeSettingsBtn');
const tabAiBtn = safeGetElement('tabAiBtn');
const tabConfigBtn = safeGetElement('tabConfigBtn');
const tabUserBtn = safeGetElement('tabUserBtn');
const tabAiContent = safeGetElement('tabAiContent');
const tabConfigContent = safeGetElement('tabConfigContent');
const tabUserContent = safeGetElement('tabUserContent');
const saveAllBtn = safeGetElement('saveAllBtn');

const googleSignInBtn = safeGetElement('googleSignInBtn');
const loggedOutState = safeGetElement('loggedOutState');
const loggedInState = safeGetElement('loggedInState');
const usernameInput = safeGetElement('usernameInput');
const saveUsernameBtn = safeGetElement('saveUsernameBtn');

const openCreateKeyBtn = safeGetElement('openCreateKeyBtn');
const createKeyModal = safeGetElement('createKeyModal');
const cancelCreateKeyBtn = safeGetElement('cancelCreateKeyBtn');
const confirmCreateKeyBtn = safeGetElement('confirmCreateKeyBtn');
const newKeyNameInput = safeGetElement('newKeyName');

const showKeyModal = safeGetElement('showKeyModal');
const generatedKeyDisplayModal = safeGetElement('generatedKeyDisplayModal');
const copyModalKeyBtn = safeGetElement('copyModalKeyBtn');
const doneKeyBtn = safeGetElement('doneKeyBtn');
const apiKeyList = safeGetElement('apiKeyList');

const apiEndpoint = safeGetElement('apiEndpoint');
const apiKeyInput = safeGetElement('apiKeyInput');
const apiModel = safeGetElement('apiModel');
const apiTemperature = safeGetElement('apiTemperature');
const apiMaxTokens = safeGetElement('apiMaxTokens');
const testApiBtn = safeGetElement('testApiBtn');

let isMoved = false;
let sidebarOpen = false;
let activeHistoryItem = null;
let uploadedImages = [];
let currentModel = 'PSAI-v1.0';
let userData = {
    username: 'UlesRamirez',
    customInstructions: '',
    apiKeys: [],
    apiConfig: {
        endpoint: 'https://api.prysmisai.com/v1/chat/completions',
        apiKey: '',
        model: 'prysmis-1',
        temperature: 0.7,
        maxTokens: 1024
    },
    isLoggedIn: false
};

gsap.set(sidebar, { x: "-100%" });

sidebarToggleBtn.addEventListener('click', () => {
    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
        gsap.to(sidebar, { x: "0%", duration: 0.5, ease: "power3.out" });
        toggleIcon.innerHTML = '<path d="M15 18l-6-6 6-6"/>';
    } else {
        gsap.to(sidebar, { x: "-100%", duration: 0.4, ease: "power3.in" });
        toggleIcon.innerHTML = '<path d="M9 18l6-6-6-6"/>';
    }
});

function transitionToChat() {
    if (!isMoved) {
        gsap.to(inputContainer, {
            top: "auto",
            bottom: "40px",
            y: 0,
            duration: 0.7,
            ease: "power4.out"
        });
        gsap.to(suggestionsContainer, {
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
                suggestionsContainer.style.display = 'none';
            }
        });
        isMoved = true;
    }
}

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && chatInput.value.trim() !== "") {
        transitionToChat();
        const userText = chatInput.value;
        addMessage(userText, 'user');
        addToHistory(userText);
        chatInput.value = "";
        setTimeout(() => getAIResponse(userText), 600);
    }
});

suggestionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        let text = e.target.innerText;
        if (text.endsWith('..')) {
            text = text.slice(0, -2);
        }
        if (text.endsWith('...')) {
            text = text.slice(0, -3);
        }
        chatInput.value = text;
        transitionToChat();
        chatInput.focus();
    });
});

function addMessage(text, sender, isCode = false) {
    const div = document.createElement('div');
    div.className = `message-bubble p-4 px-6 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm ${sender === 'user' ? 'bg-[#20202a] ml-auto border border-[#303040]' : 'bg-[#15151c] border border-[#252530] mr-auto'}`;
    
    if (isCode) {
        const codeBlock = document.createElement('div');
        codeBlock.className = 'code-block relative';
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = text;
        pre.appendChild(code);
        codeBlock.appendChild(pre);
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(text);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy', 1500);
        });
        codeBlock.appendChild(copyBtn);
        div.appendChild(codeBlock);
    } else {
        div.textContent = text;
    }
    
    chatArea.appendChild(div);
    gsap.to(div, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.5)" });
    chatArea.scrollTop = chatArea.scrollHeight;
}

let sessionId = null;
let currentUser = null;

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    
    if (sessionParam) {
        sessionId = sessionParam;
        fetchSessionInfo();
    } else {
        createNewSession();
    }
});

async function fetchSessionInfo() {
    try {
        const response = await fetch('/api/session?session=' + sessionId);
        const data = await response.json();
        
        if (data.authenticated && data.user) {
            currentUser = data.user;
            updateUIForLoggedInUser(data.user);
        }
    } catch (error) {
        console.error('Session fetch error:', error);
    }
}

async function createNewSession() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        sessionId = data.sessionId;
    } catch (error) {
        console.error('Session creation error:', error);
    }
}

function updateUIForLoggedInUser(user) {
    loggedOutState.classList.add('hidden');
    loggedInState.classList.remove('hidden');
    
    const usernameInputEl = document.getElementById('usernameInput');
    if (usernameInputEl) usernameInputEl.value = user.username || '';
    
    if (user.custom_instructions) {
        const customInstructionsEl = document.getElementById('customInstructions');
        if (customInstructionsEl) customInstructionsEl.value = user.custom_instructions;
    }
    
    if (user.api_config) {
        const apiEndpointEl = document.getElementById('apiEndpoint');
        if (apiEndpointEl) apiEndpointEl.value = user.api_config.endpoint || 'https://api.prysmisai.com/v1/chat/completions';
        
        const apiKeyInputEl = document.getElementById('apiKeyInput');
        if (apiKeyInputEl) apiKeyInputEl.value = user.api_config.apiKey || '';
        
        const apiModelEl = document.getElementById('apiModel');
        if (apiModelEl) apiModelEl.value = user.api_config.model || 'prysmis-1';
        
        const apiTemperatureEl = document.getElementById('apiTemperature');
        if (apiTemperatureEl) apiTemperatureEl.value = user.api_config.temperature || 0.7;
        
        const apiMaxTokensEl = document.getElementById('apiMaxTokens');
        if (apiMaxTokensEl) apiMaxTokensEl.value = user.api_config.max_tokens || 1024;
        
        const authHeaderEl = document.getElementById('authHeader');
        if (authHeaderEl) authHeaderEl.value = user.api_config.authHeader || 'Bearer sk-prysmis-prod-95fZe5PBGA7ErrKSL9dW3OjweOtioFQI';
    }
    
    if (user.api_keys && Array.isArray(user.api_keys)) {
        user.api_keys.forEach(key => {
            appendKeyToList(key);
        });
    }
}

async function getAIResponse(query) {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message-bubble p-4 px-6 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm bg-[#15151c] border border-[#252530] mr-auto';
    loadingDiv.innerHTML = '<span class="animate-pulse">PrysmisAI is thinking...</span>';
    chatArea.appendChild(loadingDiv);
    gsap.to(loadingDiv, { opacity: 1, y: 0, duration: 0.3 });
    chatArea.scrollTop = chatArea.scrollHeight;

    try {
        if (!sessionId) {
            const sessionResponse = await fetch('/api/session');
            const sessionData = await sessionResponse.json();
            sessionId = sessionData.sessionId;
        }

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': sessionId
            },
            body: JSON.stringify({ message: query, sessionId })
        });

        if (loadingDiv && loadingDiv.parentNode === chatArea) {
            chatArea.removeChild(loadingDiv);
        }

        if (response.ok) {
            const data = await response.json();
            if (data.sessionId) {
                sessionId = data.sessionId;
            }
            const aiContent = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : data.response;
            addMessage(aiContent, 'ai');
        } else {
            const errorData = await response.json();
            addMessage(`Error: ${errorData.error || 'Failed to get response'}`, 'ai');
        }
    } catch (error) {
        if (loadingDiv && loadingDiv.parentNode === chatArea) {
            chatArea.removeChild(loadingDiv);
        }
        addMessage(`Error connecting to PrysmisAI: ${error.message}. Make sure the server is running.`, 'ai');
    }
}

function addToHistory(text) {
    const div = document.createElement('div');
    div.className = 'history-item text-sm text-gray-300 cursor-pointer hover:bg-[#1a1a24] hover:text-white p-3 rounded-xl transition-all border border-transparent hover:border-[#2d2d3a] relative break-words flex flex-col';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'history-text truncate w-full pointer-events-none';
    textSpan.innerText = text;
    div.appendChild(textSpan);

    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        activeHistoryItem = div;
        const x = e.clientX;
        const y = e.clientY;
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.remove('hidden');
        requestAnimationFrame(() => {
            contextMenu.classList.add('context-menu-active');
        });
    });

    historyContainer.appendChild(div);
}

newChatBtn.addEventListener('click', () => {
    chatArea.innerHTML = "";
    gsap.to(inputContainer, {
        bottom: "auto",
        top: "50%",
        y: "-50%",
        duration: 0.7,
        ease: "power4.inOut"
    });
    suggestionsContainer.style.display = 'flex';
    gsap.to(suggestionsContainer, { opacity: 1, duration: 0.5 });
    isMoved = false;
    if (sidebarOpen) sidebarToggleBtn.click();
});

document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
        closeContextMenu();
    }
    if (!modelDropdown.contains(e.target) && !modelDropdownBtn.contains(e.target)) {
        modelDropdown.classList.add('hidden');
    }
});

function closeContextMenu() {
    contextMenu.classList.remove('context-menu-active');
    setTimeout(() => {
        contextMenu.classList.add('hidden');
    }, 150);
}

deleteBtn.addEventListener('click', () => {
    if (activeHistoryItem) {
        gsap.to(activeHistoryItem, {
            opacity: 0,
            x: -20,
            duration: 0.3,
            onComplete: () => {
                activeHistoryItem.remove();
                activeHistoryItem = null;
            }
        });
    }
    closeContextMenu();
});

renameBtn.addEventListener('click', () => {
    if (!activeHistoryItem) return;
    const textSpan = activeHistoryItem.querySelector('.history-text');
    if (!textSpan) return;
    const currentText = textSpan.innerText;
    activeHistoryItem.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'w-full bg-[#0a0a0d] border border-[#353545] text-gray-100 p-2 rounded-lg focus:outline-none focus:border-indigo-500 text-sm mb-2 shadow-inner';
    const saveBtn = document.createElement('button');
    saveBtn.innerText = 'Save';
    saveBtn.className = 'w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 rounded-lg transition-colors font-semibold';
    activeHistoryItem.appendChild(input);
    activeHistoryItem.appendChild(saveBtn);
    input.focus();
    const saveNewName = () => {
        const newName = input.value.trim() || currentText;
        activeHistoryItem.innerHTML = '';
        const newTextSpan = document.createElement('span');
        newTextSpan.className = 'history-text truncate w-full pointer-events-none';
        newTextSpan.innerText = newName;
        activeHistoryItem.appendChild(newTextSpan);
    };
    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveNewName();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveNewName();
        }
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    closeContextMenu();
});

modelDropdownBtn.addEventListener('click', () => {
    modelDropdown.classList.toggle('hidden');
});

imageUploadBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageData = e.target.result;
                    uploadedImages.push(imageData);
                    addImagePreview(imageData);
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

function addImagePreview(imageData) {
    imagePreviewContainer.classList.remove('hidden');
    
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    
    const img = document.createElement('img');
    img.src = imageData;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', () => {
        const index = uploadedImages.indexOf(imageData);
        if (index > -1) {
            uploadedImages.splice(index, 1);
        }
        preview.remove();
        if (uploadedImages.length === 0) {
            imagePreviewContainer.classList.add('hidden');
        }
    });
    
    preview.appendChild(img);
    preview.appendChild(removeBtn);
    imagePreviewContainer.appendChild(preview);
}

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    settingsModal.classList.add('flex');
    loadUserData();
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    settingsModal.classList.remove('flex');
});

tabAiBtn.addEventListener('click', () => {
    setActiveTab('ai');
});

tabConfigBtn.addEventListener('click', () => {
    setActiveTab('config');
});

tabUserBtn.addEventListener('click', () => {
    setActiveTab('user');
});

function setActiveTab(tab) {
    [tabAiBtn, tabConfigBtn, tabUserBtn].forEach(btn => {
        btn.className = 'text-left px-4 py-3 text-gray-400 hover:bg-[#15151c] hover:text-white rounded-xl text-sm font-semibold transition-colors';
    });
    
    [tabAiContent, tabConfigContent, tabUserContent].forEach(content => {
        content.classList.add('hidden');
    });

    if (tab === 'ai') {
        tabAiBtn.className = 'text-left px-4 py-3 bg-[#1e1e28] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm';
        tabAiContent.classList.remove('hidden');
    } else if (tab === 'config') {
        tabConfigBtn.className = 'text-left px-4 py-3 bg-[#1e1e28] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm';
        tabConfigContent.classList.remove('hidden');
    } else if (tab === 'user') {
        tabUserBtn.className = 'text-left px-4 py-3 bg-[#1e1e28] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm';
        tabUserContent.classList.remove('hidden');
    }
}

googleSignInBtn.addEventListener('click', () => {
    window.location.href = '/auth/google';
});

saveUsernameBtn.addEventListener('click', () => {
    const usernameInputEl = document.getElementById('usernameInput');
    if (usernameInputEl) {
        userData.username = usernameInputEl.value;
        const originalText = saveUsernameBtn.innerText;
        saveUsernameBtn.innerText = 'Saving...';
        
        saveUserData();
        
        setTimeout(() => {
            saveUsernameBtn.innerText = 'Saved!';
            setTimeout(() => {
                saveUsernameBtn.innerText = originalText;
            }, 1500);
        }, 500);
    }
});

saveAllBtn.addEventListener('click', () => {
    const customInstructionsEl = document.getElementById('customInstructions');
    if (customInstructionsEl) {
        userData.customInstructions = customInstructionsEl.value;
    }
    
    const apiEndpointEl = document.getElementById('apiEndpoint');
    const apiKeyInputEl = document.getElementById('apiKeyInput');
    const apiModelEl = document.getElementById('apiModel');
    const apiTemperatureEl = document.getElementById('apiTemperature');
    const apiMaxTokensEl = document.getElementById('apiMaxTokens');
    const authHeaderEl = document.getElementById('authHeader');
    const contentTypeEl = document.getElementById('contentType');
    
    if (apiEndpointEl) {
        userData.apiConfig = userData.apiConfig || {};
        userData.apiConfig.endpoint = apiEndpointEl.value;
    }
    if (apiKeyInputEl) {
        userData.apiConfig = userData.apiConfig || {};
        userData.apiConfig.apiKey = apiKeyInputEl.value;
    }
    if (apiModelEl) {
        userData.apiConfig = userData.apiConfig || {};
        userData.apiConfig.model = apiModelEl.value;
    }
    if (apiTemperatureEl) {
        userData.apiConfig = userData.apiConfig || {};
        userData.apiConfig.temperature = parseFloat(apiTemperatureEl.value);
    }
    if (apiMaxTokensEl) {
        userData.apiConfig = userData.apiConfig || {};
        userData.apiConfig.maxTokens = parseInt(apiMaxTokensEl.value);
    }
    if (authHeaderEl) {
        userData.apiConfig = userData.apiConfig || {};
        userData.apiConfig.authHeader = authHeaderEl.value;
    }
    if (contentTypeEl) {
        userData.apiConfig = userData.apiConfig || {};
        userData.apiConfig.contentType = contentTypeEl.value;
    }
    
    const usernameInputEl = document.getElementById('usernameInput');
    if (usernameInputEl) {
        userData.username = usernameInputEl.value;
    }
    
    saveUserData();
    
    const originalText = saveAllBtn.innerText;
    saveAllBtn.innerText = 'Saving to database...';
    
    setTimeout(() => {
        saveAllBtn.innerText = 'Saved!';
        saveAllBtn.classList.add('bg-emerald-600', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
        saveAllBtn.classList.remove('bg-indigo-600', 'shadow-[0_0_15px_rgba(79,70,229,0.25)]');
        setTimeout(() => {
            saveAllBtn.innerText = originalText;
            saveAllBtn.classList.remove('bg-emerald-600', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
            saveAllBtn.classList.add('bg-indigo-600', 'shadow-[0_0_15px_rgba(79,70,229,0.25)]');
        }, 2000);
    }, 500);
});

function loadUserData() {
    if (currentUser) {
        return;
    }
    
    const saved = localStorage.getItem('prysmisUserData');
    if (saved) {
        userData = JSON.parse(saved);
        
        const customInstructionsEl = document.getElementById('customInstructions');
        if (customInstructionsEl) customInstructionsEl.value = userData.customInstructions || '';
        
        const usernameInputEl = document.getElementById('usernameInput');
        if (usernameInputEl) usernameInputEl.value = userData.username || 'UlesRamirez';
        
        const apiEndpointEl = document.getElementById('apiEndpoint');
        if (apiEndpointEl) apiEndpointEl.value = userData.apiConfig?.endpoint || 'https://api.prysmisai.com/v1/chat/completions';
        
        const apiKeyInputEl = document.getElementById('apiKeyInput');
        if (apiKeyInputEl) apiKeyInputEl.value = userData.apiConfig?.apiKey || '';
        
        const apiModelEl = document.getElementById('apiModel');
        if (apiModelEl) apiModelEl.value = userData.apiConfig?.model || 'prysmis-1';
        
        const apiTemperatureEl = document.getElementById('apiTemperature');
        if (apiTemperatureEl) apiTemperatureEl.value = userData.apiConfig?.temperature || 0.7;
        
        const apiMaxTokensEl = document.getElementById('apiMaxTokens');
        if (apiMaxTokensEl) apiMaxTokensEl.value = userData.apiConfig?.maxTokens || 1024;
        
        const authHeaderEl = document.getElementById('authHeader');
        if (authHeaderEl) authHeaderEl.value = userData.apiConfig?.authHeader || 'Bearer sk-prysmis-prod-95fZe5PBGA7ErrKSL9dW3OjweOtioFQI';
        
        const contentTypeEl = document.getElementById('contentType');
        if (contentTypeEl) contentTypeEl.value = 'application/json';
        
        if (userData.isLoggedIn) {
            loggedOutState.classList.add('hidden');
            loggedInState.classList.remove('hidden');
        }
        
        userData.apiKeys.forEach(key => {
            appendKeyToList(key);
        });
    }
}

function saveUserData() {
    localStorage.setItem('prysmisUserData', JSON.stringify(userData));
    
    if (currentUser) {
        fetch('/api/user', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': sessionId
            },
            body: JSON.stringify({
                customInstructions: userData.customInstructions,
                apiConfig: userData.apiConfig,
                username: userData.username
            })
        }).catch(error => {
            console.error('Failed to save to server:', error);
        });
    }
}

openCreateKeyBtn.addEventListener('click', () => {
    newKeyNameInput.value = '';
    createKeyModal.classList.remove('hidden');
    createKeyModal.classList.add('flex');
});

cancelCreateKeyBtn.addEventListener('click', () => {
    createKeyModal.classList.add('hidden');
    createKeyModal.classList.remove('flex');
});

function generateAPIKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sk-prysmis-';
    for (let i = 0; i < 32; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

function appendKeyToList(keyString) {
    const row = document.createElement('div');
    row.className = 'bg-[#16161d] border border-[#252530] rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-sm';
    
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'flex-1 bg-[#0a0a0d] rounded-lg px-3 py-2.5 border border-[#22222c]';
    const input = document.createElement('input');
    input.type = 'password';
    input.value = keyString;
    input.className = 'w-full bg-transparent border-none outline-none text-sm text-indigo-100 font-mono tracking-wider pointer-events-none';
    input.readOnly = true;
    inputWrapper.appendChild(input);

    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'flex items-center gap-2.5';

    const showBtn = document.createElement('button');
    showBtn.innerText = 'Show API';
    showBtn.className = 'px-4 py-2.5 text-xs font-semibold bg-[#1e1e28] text-white border border-[#353545] rounded-lg hover:bg-[#252532] transition-colors w-24 text-center';
    
    const copyBtn = document.createElement('button');
    copyBtn.innerText = 'Copy API';
    copyBtn.className = 'px-4 py-2.5 text-xs font-semibold bg-[#1e1e28] text-white border border-[#353545] rounded-lg hover:bg-[#252532] transition-colors';

    showBtn.addEventListener('click', () => {
        if (input.type === 'password') {
            input.type = 'text';
            showBtn.innerText = 'Hide API';
        } else {
            input.type = 'password';
            showBtn.innerText = 'Show API';
        }
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(keyString);
        const originalText = copyBtn.innerText;
        copyBtn.innerText = 'Copied!';
        setTimeout(() => {
            copyBtn.innerText = originalText;
        }, 1500);
    });

    btnWrapper.appendChild(showBtn);
    btnWrapper.appendChild(copyBtn);
    row.appendChild(inputWrapper);
    row.appendChild(btnWrapper);
    
    apiKeyList.appendChild(row);
}

confirmCreateKeyBtn.addEventListener('click', () => {
    createKeyModal.classList.add('hidden');
    createKeyModal.classList.remove('flex');
    const newKey = generateAPIKey();
    generatedKeyDisplayModal.value = newKey;
    userData.apiKeys.push(newKey);
    appendKeyToList(newKey);
    saveUserData();
    showKeyModal.classList.remove('hidden');
    showKeyModal.classList.add('flex');
});

copyModalKeyBtn.addEventListener('click', () => {
    const key = generatedKeyDisplayModal.value;
    navigator.clipboard.writeText(key);
});

doneKeyBtn.addEventListener('click', () => {
    showKeyModal.classList.add('hidden');
    showKeyModal.classList.remove('flex');
});

testApiBtn.addEventListener('click', async () => {
    const apiEndpointEl = document.getElementById('apiEndpoint');
    const apiKeyInputEl = document.getElementById('apiKeyInput');
    const apiModelEl = document.getElementById('apiModel');
    const apiTemperatureEl = document.getElementById('apiTemperature');
    const apiMaxTokensEl = document.getElementById('apiMaxTokens');

    const config = {
        endpoint: apiEndpointEl ? apiEndpointEl.value : 'https://api.prysmisai.com/v1/chat/completions',
        apiKey: apiKeyInputEl ? apiKeyInputEl.value : '',
        model: apiModelEl ? apiModelEl.value : 'prysmis-1',
        temperature: apiTemperatureEl ? parseFloat(apiTemperatureEl.value) : 0.7,
        maxTokens: apiMaxTokensEl ? parseInt(apiMaxTokensEl.value) : 1024
    };

    testApiBtn.disabled = true;
    testApiBtn.innerText = 'Testing...';

    try {
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: 'Hello' }],
                temperature: config.temperature,
                max_tokens: config.maxTokens
            })
        });

        if (response.ok) {
            testApiBtn.innerText = 'Connected!';
            testApiBtn.classList.add('bg-emerald-600');
            setTimeout(() => {
                testApiBtn.innerText = 'Test Connection';
                testApiBtn.classList.remove('bg-emerald-600');
            }, 2000);
        } else {
            testApiBtn.innerText = 'Failed';
            testApiBtn.classList.add('bg-rose-600');
            setTimeout(() => {
                testApiBtn.innerText = 'Test Connection';
                testApiBtn.classList.remove('bg-rose-600');
            }, 2000);
        }
    } catch (error) {
        testApiBtn.innerText = 'Error';
        testApiBtn.classList.add('bg-rose-600');
        setTimeout(() => {
            testApiBtn.innerText = 'Test Connection';
            testApiBtn.classList.remove('bg-rose-600');
        }, 2000);
    }

    testApiBtn.disabled = false;
});