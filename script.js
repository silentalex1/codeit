const API_URL = "http://localhost:3000/api";

const registerUser = async () => {
    const username = document.getElementById('user-field').value.trim();
    const password = document.getElementById('pass-field').value.trim();
    if (!username || !password) return;

    try {
        const response = await fetch(`${API_URL}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, type: 'register' })
        });
        const data = await response.json();
        if (data.success) {
            sessionStorage.setItem('copilot_auth', JSON.stringify({ username }));
            window.location.href = "/aigame";
        } else {
            const loginRes = await fetch(`${API_URL}/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, type: 'login' })
            });
            const loginData = await loginRes.json();
            if (loginData.success) {
                sessionStorage.setItem('copilot_auth', JSON.stringify({ username }));
                window.location.href = "/aigame";
            } else {
                alert("Login failed or user exists.");
            }
        }
    } catch (e) {
        alert("Server error. Check server.js");
    }
};

document.getElementById('reg-trigger').addEventListener('click', registerUser);

document.getElementById('puter-trigger').addEventListener('click', async () => {
    const user = await puter.auth.signIn();
    if (user) {
        sessionStorage.setItem('copilot_auth', JSON.stringify({ username: user.username, isPuter: true }));
        window.location.href = "/aigame";
    }
});
