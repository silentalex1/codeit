document.getElementById('register-btn').addEventListener('click', async () => {
    const user = document.getElementById('user-input').value.trim();
    const pass = document.getElementById('pass-input').value.trim();
    if (!user || !pass) return;

    let db = await puter.kv.get('copilot_db');
    let data = db ? JSON.parse(db) : {};

    if (data[user]) {
        if (data[user].password === pass) {
            sessionStorage.setItem('active_session', JSON.stringify({ name: user, settings: data[user].settings }));
            window.location.href = "/aigame";
        } else {
            alert("Invalid password for this user.");
        }
    } else {
        data[user] = {
            password: pass,
            settings: { nickname: user, pfp: '', workMode: false, hideSidebar: false },
            history: []
        };
        await puter.kv.set('copilot_db', JSON.stringify(data));
        sessionStorage.setItem('active_session', JSON.stringify({ name: user, settings: data[user].settings }));
        window.location.href = "/aigame";
    }
});

document.getElementById('puter-login').addEventListener('click', () => {
    puter.auth.signIn().then(() => {
        sessionStorage.setItem('active_session', JSON.stringify({ name: 'PuterUser', isPuter: true }));
        window.location.href = "/aigame";
    });
});
