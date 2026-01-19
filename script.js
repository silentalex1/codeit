document.getElementById('reg-btn').addEventListener('click', async () => {
    const u = document.getElementById('reg-u').value.trim();
    const p = document.getElementById('reg-p').value.trim();
    if (!u || !p) return;
    let raw = await puter.kv.get('copilot_db');
    let db = raw ? JSON.parse(raw) : {};
    if (db[u]) {
        if (db[u].password === p) {
            sessionStorage.setItem('copilot_user', JSON.stringify({ username: u }));
            window.location.href = "aigame/";
        } else { alert("User already exists."); }
    } else {
        db[u] = { password: p, settings: { nickname: u, pfp: '', workMode: false, hideSidebar: false }, history: [] };
        await puter.kv.set('copilot_db', JSON.stringify(db));
        sessionStorage.setItem('copilot_user', JSON.stringify({ username: u }));
        window.location.href = "aigame/";
    }
});
document.getElementById('puter-btn').addEventListener('click', async () => {
    const user = await puter.auth.signIn();
    if (user) {
        sessionStorage.setItem('copilot_user', JSON.stringify({ username: user.username }));
        window.location.href = "aigame/";
    }
});
