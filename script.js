document.getElementById('register-btn').addEventListener('click', async () => {
    const user = document.getElementById('user-input').value.trim();
    const pass = document.getElementById('pass-input').value.trim();
    if (!user || !pass) return;

    let db = await puter.kv.get('copilot_db');
    let data = db ? JSON.parse(db) : {};

    if (data[user]) {
        if (data[user].password === pass) {
            sessionStorage.setItem('copilot_session', JSON.stringify({ name: user, method: 'custom' }));
            window.location.href = "aigame/";
        } else {
            alert("Invalid password.");
        }
    } else {
        data[user] = {
            password: pass,
            settings: { nickname: user, pfp: '', workMode: false, hideSidebar: false },
            history: []
        };
        await puter.kv.set('copilot_db', JSON.stringify(data));
        sessionStorage.setItem('copilot_session', JSON.stringify({ name: user, method: 'custom' }));
        window.location.href = "aigame/";
    }
});

document.getElementById('puter-login').addEventListener('click', async () => {
    const user = await puter.auth.signIn();
    if (user) {
        sessionStorage.setItem('copilot_session', JSON.stringify({ name: user.username, method: 'puter' }));
        window.location.href = "aigame/";
    }
});
