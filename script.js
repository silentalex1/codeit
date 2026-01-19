document.getElementById('reg-btn').addEventListener('click', async () => {
    const user = document.getElementById('reg-u').value.trim();
    const pass = document.getElementById('reg-p').value.trim();
    if (!user || !pass) return;
    let data = await puter.kv.get('copilot_accounts');
    let db = data ? JSON.parse(data) : {};
    if (db[user]) {
        if (db[user].password === pass) {
            sessionStorage.setItem('copilot_session', JSON.stringify({ name: user }));
            window.location.href = "aigame/";
        } else {
            alert("Username taken or wrong password");
        }
    } else {
        db[user] = { password: pass, settings: { nickname: user, pfp: '', workMode: false, hideSidebar: false }, history: [] };
        await puter.kv.set('copilot_accounts', JSON.stringify(db));
        sessionStorage.setItem('copilot_session', JSON.stringify({ name: user }));
        window.location.href = "aigame/";
    }
});
document.getElementById('puter-btn').addEventListener('click', async () => {
    const user = await puter.auth.signIn();
    if (user) {
        sessionStorage.setItem('copilot_session', JSON.stringify({ name: user.username }));
        window.location.href = "aigame/";
    }
});
