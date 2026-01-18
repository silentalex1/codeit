const DB = {
    async register(user, pass) {
        let users = JSON.parse(localStorage.getItem('cp_users') || '[]');
        if (users.find(u => u.user === user)) return false;
        users.push({ user, pass });
        localStorage.setItem('cp_users', JSON.stringify(users));
        return true;
    },
    async login(user, pass) {
        let users = JSON.parse(localStorage.getItem('cp_users') || '[]');
        return users.find(u => u.user === user && u.pass === pass);
    }
};

document.getElementById('create-acc-btn').addEventListener('click', async () => {
    const user = document.getElementById('user-field').value.trim();
    const pass = document.getElementById('pass-field').value.trim();
    if (!user || !pass) return;

    const exists = await DB.login(user, pass);
    if (exists) {
        sessionStorage.setItem('cp_session', user);
        window.location.href = "/aigame";
    } else {
        const success = await DB.register(user, pass);
        if (success) {
            sessionStorage.setItem('cp_session', user);
            window.location.href = "/aigame";
        } else {
            alert("Username taken");
        }
    }
});

document.getElementById('puter-btn').addEventListener('click', async () => {
    try {
        const user = await puter.auth.signIn();
        if (user) window.location.href = "/aigame";
    } catch (e) {}
});
