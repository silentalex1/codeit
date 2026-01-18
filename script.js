document.getElementById('submit-auth').addEventListener('click', async () => {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    if (!user || !pass) return;
    let raw = await puter.kv.get('copilot_accounts');
    let db = raw ? JSON.parse(raw) : {};
    if (db[user]) {
        if (db[user].password === pass) {
            sessionStorage.setItem('copilot_user', JSON.stringify({ username: user }));
            window.location.href = "aigame/";
        } else {
            alert("Username taken");
        }
    } else {
        db[user] = { password: pass, settings: { nickname: user, pfp: '', workMode: false, hideSidebar: false }, history: [] };
        await puter.kv.set('copilot_accounts', JSON.stringify(db));
        sessionStorage.setItem('copilot_user', JSON.stringify({ username: user }));
        window.location.href = "aigame/";
    }
});
document.getElementById('puter-auth').addEventListener('click', async () => {
    const user = await puter.auth.signIn();
    if (user) {
        sessionStorage.setItem('copilot_user', JSON.stringify({ username: user.username }));
        window.location.href = "aigame/";
    }
});
