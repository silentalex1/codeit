const UserDB = {
    async fetchAll() {
        const data = await puter.kv.get('codeit_copilot_users');
        return data ? JSON.parse(data) : {};
    },
    async save(users) {
        await puter.kv.set('codeit_copilot_users', JSON.stringify(users));
    }
};
document.getElementById('auth-create').addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) return;
    const users = await UserDB.fetchAll();
    if (users[username]) {
        if (users[username].password === password) {
            sessionStorage.setItem('copilot_session', JSON.stringify({ username, settings: users[username].settings }));
            window.location.href = "aigame/";
        } else { alert("Username exists with different password."); }
    } else {
        const newUser = { password: password, settings: { nickname: username, pfp: '', workMode: false, hideSidebar: false }, history: [] };
        users[username] = newUser;
        await UserDB.save(users);
        sessionStorage.setItem('copilot_session', JSON.stringify({ username, settings: newUser.settings }));
        window.location.href = "aigame/";
    }
});
document.getElementById('auth-puter').addEventListener('click', async () => {
    const user = await puter.auth.signIn();
    if (user) {
        sessionStorage.setItem('copilot_session', JSON.stringify({ username: user.username, isPuter: true, settings: { nickname: user.username, pfp: '', workMode: false, hideSidebar: false } }));
        window.location.href = "aigame/";
    }
});
