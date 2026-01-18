document.getElementById('auth-btn').onclick = async () => {
    const user = document.getElementById('u-reg').value.trim();
    const pass = document.getElementById('p-reg').value.trim();
    if (!user || !pass) return;
    let data = await puter.kv.get('copilot_accounts');
    let db = data ? JSON.parse(data) : {};
    if (db[user]) {
        if (db[user].password === pass) {
            sessionStorage.setItem('copilot_user', JSON.stringify({ username: user }));
            window.location.href = "aigame/";
        } else {
            alert("Username already exists.");
        }
    } else {
        db[user] = { password: pass, settings: { nickname: user, pfp: '', workMode: false, hideSidebar: false }, history: [] };
        await puter.kv.set('copilot_accounts', JSON.stringify(db));
        sessionStorage.setItem('copilot_user', JSON.stringify({ username: user }));
        window.location.href = "aigame/";
    }
};
document.getElementById('puter-btn').onclick = async () => {
    const user = await puter.auth.signIn();
    if (user) {
        sessionStorage.setItem('copilot_user', JSON.stringify({ username: user.username }));
        window.location.href = "aigame/";
    }
};
