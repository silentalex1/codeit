document.getElementById('btn-auth').addEventListener('click', async () => {
    const user = document.getElementById('username-in').value.trim();
    const pass = document.getElementById('password-in').value.trim();
    if (!user || !pass) return;
    let data = await puter.kv.get('codeit_copilot_users');
    let db = data ? JSON.parse(data) : {};
    if (db[user]) {
        if (db[user].password === pass) {
            sessionStorage.setItem('copilot_session', JSON.stringify({ username: user }));
            window.location.href = "aigame/";
        } else { alert("User already exists."); }
    } else {
        db[user] = { password: pass, settings: { nickname: user, pfp: '', workMode: false, hideSidebar: false }, history: [] };
        await puter.kv.set('codeit_copilot_users', JSON.stringify(db));
        sessionStorage.setItem('copilot_session', JSON.stringify({ username: user }));
        window.location.href = "aigame/";
    }
});
document.getElementById('btn-puter-auth').addEventListener('click', async () => {
    const user = await puter.auth.signIn();
    if (user) {
        sessionStorage.setItem('copilot_session', JSON.stringify({ username: user.username, isPuter: true }));
        window.location.href = "aigame/";
    }
});
