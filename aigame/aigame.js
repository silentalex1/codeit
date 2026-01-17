document.addEventListener('DOMContentLoaded', async () => {
    const user = sessionStorage.getItem('current_user');
    const isPuter = await puter.auth.isSignedIn();

    if (!user && !isPuter) {
        window.location.href = "../";
        return;
    }

    const input = document.getElementById('ai-input');
    const send = document.getElementById('send-trigger');
    const stage = document.getElementById('chat-stage');
    const log = document.getElementById('chat-log');
    const optBtns = document.querySelectorAll('.opt-btn');

    optBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.getAttribute('data-text');
            input.focus();
        });
    });

    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    });

    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;

        if (!stage.classList.contains('active')) {
            stage.classList.add('active');
        }

        log.innerHTML += `<div class="msg user-msg">${text}</div>`;
        input.value = "";
        input.style.height = '24px';

        const aiWrap = document.createElement('div');
        aiWrap.className = "msg ai-msg";
        aiWrap.innerText = "Thinking...";
        log.appendChild(aiWrap);

        try {
            const response = await puter.ai.chat(text, { model: 'gemini-1.5-pro-latest' });
            aiWrap.innerText = "";
            
            const formatted = response.replace(/```lua([\s\S]*?)```/g, '<pre>$1</pre>');
            aiWrap.innerHTML = formatted;
        } catch (e) {
            aiWrap.innerText = "Error: AI could not connect.";
        }
        
        log.scrollTop = log.scrollHeight;
    };

    send.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});
