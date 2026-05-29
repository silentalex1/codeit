if (!localStorage.getItem('prysmis_user')) {
    window.location.href = '/login';
} else {
    document.getElementById('app-body').classList.remove('hidden');
}

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

let apiKey = localStorage.getItem('prysmis_api_key') || '';
let isHumanizeActive = false;
let chatHistory = [];

async function updateStatus() {
    try {
        const res = await fetch('/status');
        const data = await res.json();

        if (data.bookmarklet) {
            bmDot.classList.add('status-active');
            bmDot.classList.remove('bg-[#f38ba8]');
            bmText.textContent = 'Connected';
            bmText.className = 'text-xs font-bold text-[#89b4fa]';
        }

        if (data.status === 'accepted') {
            stDot.classList.add('status-active');
            stDot.classList.remove('bg-[#f38ba8]', 'bg-[#f9e2af]');
            stText.textContent = 'Connected';
            stText.className = 'text-xs font-bold text-[#89b4fa]';
        } else if (data.status === 'pending') {
            stDot.classList.remove('status-active');
            stDot.className = 'w-2.5 h-2.5 rounded-full bg-[#f9e2af]';
            stText.textContent = 'Action Required';
            stText.className = 'text-xs font-bold text-[#f9e2af]';
        } else {
            stDot.classList.remove('status-active');
            stDot.className = 'w-2.5 h-2.5 rounded-full bg-[#f38ba8]';
            stText.textContent = 'Disconnected';
            stText.className = 'text-xs font-bold text-[#f38ba8]';
        }
    } catch (err) {
        bmDot.classList.remove('status-active');
        bmDot.className = 'w-2.5 h-2.5 rounded-full bg-[#f38ba8]';
        bmText.textContent = 'Offline';
        bmText.className = 'text-xs font-bold text-[#f38ba8]';

        stDot.classList.remove('status-active');
        stDot.className = 'w-2.5 h-2.5 rounded-full bg-[#f38ba8]';
        stText.textContent = 'Offline';
        stText.className = 'text-xs font-bold text-[#f38ba8]';
    }
}

setInterval(updateStatus, 1000);
updateStatus();

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('prysmis_user');
    window.location.href = '/login';
});

newChatBtn.addEventListener('click', () => {
    chatHistory = [];
    renderChat();
});

settingsOpen.addEventListener('click', () => {
    apiKeyInput.value = apiKey;
    apiKeyInput.type = 'password';
    toggleKeyBtn.textContent = 'show';
    settingsModal.classList.add('modal-open');
});

settingsClose.addEventListener('click', () => {
    settingsModal.classList.remove('modal-open');
});

toggleKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleKeyBtn.textContent = 'hide';
    } else {
        apiKeyInput.type = 'password';
        toggleKeyBtn.textContent = 'show';
    }
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

function formatText(text) {
    if (!text) return '';
    let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let parts = escaped.split(/(```[\s\S]*?```)/g);
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith('```') && parts[i].endsWith('```')) {
            let match = parts[i].match(/```([^\n]*)\n?([\s\S]*?)```/);
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
});

function renderChat() {
    chatArea.innerHTML = '';
    const defaultMsg = document.createElement('div');
    defaultMsg.className = 'max-w-[85%] p-4 rounded-xl text-[15px] self-start bg-[#1e1e2e] text-[#cdd6f4] border border-[#313244] shadow-md';
    defaultMsg.textContent = 'Ask PrysmisAI anything..';
    chatArea.appendChild(defaultMsg);

    chatHistory.forEach(msg => {
        const div = document.createElement('div');
        div.className = msg.role === 'user' 
            ? 'max-w-[85%] p-4 rounded-xl text-[15px] self-end bg-[#89b4fa] text-[#11111b] shadow-lg font-medium'
            : 'max-w-[85%] p-4 rounded-xl text-[15px] self-start bg-[#1e1e2e] text-[#cdd6f4] border border-[#313244] shadow-md';
        div.innerHTML = formatText(msg.parts[0].text);
        chatArea.appendChild(div);
    });
    chatArea.scrollTop = chatArea.scrollHeight;
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !apiKey) return;

    chatHistory.push({ role: 'user', parts: [{ text: text }] });
    chatInput.value = '';
    renderChat();

    let sysPrompt = 'You are PrysmisAI, an advanced, highly intelligent, and helpful artificial intelligence assistant. You provide accurate, detailed, and polite responses.';
    
    if (isHumanizeActive) {
        sysPrompt = 'You are an elite AI-bypass engine and expert human copywriter. Your ONLY purpose is to rewrite text or code so it scores 0% AI-generated and 100% human on all detectors, including Turnitin, GPTZero, Copyleaks, ZeroGPT, Quillbot, Writer, Sapling, and Originality. You must inject high perplexity, burstiness, natural imperfections, and varied sentence structures. Do not explain yourself. Do not include introductory or concluding remarks. Output ONLY the raw humanized text or code.';
    }

    const payload = {
        systemInstruction: { parts: [{ text: sysPrompt }] },
        contents: chatHistory.map(m => ({ role: m.role, parts: m.parts })),
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
    };

    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=' + apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            if (data.candidates && data.candidates[0].content) {
                chatHistory.push({ role: 'model', parts: [{ text: data.candidates[0].content.parts[0].text }] });
            } else {
                chatHistory.push({ role: 'model', parts: [{ text: 'Generation failed.' }] });
            }
        } else {
            chatHistory.push({ role: 'model', parts: [{ text: 'API Error.' }] });
        }
    } catch (e) {
        chatHistory.push({ role: 'model', parts: [{ text: 'Network Error.' }] });
    }
    renderChat();
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

renderChat();
