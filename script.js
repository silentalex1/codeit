const UserSystem = {
    handleRegister: (user, pass) => {
        const db = JSON.parse(localStorage.getItem('app_users') || '{}');
        if (db[user]) return false;
        db[user] = { password: pass, created: Date.now() };
        localStorage.setItem('app_users', JSON.stringify(db));
        return true;
    },
    handleLogin: (user, pass) => {
        const db = JSON.parse(localStorage.getItem('app_users') || '{}');
        return db[user] && db[user].password === pass;
    }
};

document.getElementById('create-acc-btn').addEventListener('click', () => {
    const u = document.getElementById('user-field').value.trim();
    const p = document.getElementById('pass-field').value.trim();

    if (!u || !p) return alert("Please fill in both fields.");

    const db = JSON.parse(localStorage.getItem('app_users') || '{}');
    if (db[u]) {
        if (UserSystem.handleLogin(u, p)) {
            sessionStorage.setItem('active_session', u);
            window.location.href = "/aigame";
        } else {
            alert("Username is taken. If this is you, check your password.");
        }
    } else {
        if (UserSystem.handleRegister(u, p)) {
            sessionStorage.setItem('active_session', u);
            window.location.href = "/aigame";
        }
    }
});

document.getElementById('puter-btn').addEventListener('click', async () => {
    try {
        const res = await puter.auth.signIn();
        if (res) window.location.href = "/aigame";
    } catch (err) {}
});
