const DB = {
    save: (u, p) => {
        const users = JSON.parse(localStorage.getItem('sys_users') || '{}');
        if(users[u]) return false;
        users[u] = { password: p, date: Date.now() };
        localStorage.setItem('sys_users', JSON.stringify(users));
        return true;
    },
    login: (u, p) => {
        const users = JSON.parse(localStorage.getItem('sys_users') || '{}');
        return users[u] && users[u].password === p;
    }
};

document.getElementById('main-action').addEventListener('click', () => {
    const u = document.getElementById('user-in').value.trim();
    const p = document.getElementById('pass-in').value.trim();

    if(!u || !p) return alert("Fill everything in");

    const users = JSON.parse(localStorage.getItem('sys_users') || '{}');
    
    if(users[u]) {
        if(DB.login(u, p)) {
            sessionStorage.setItem('active_user', u);
            window.location.href = "/aigame";
        } else {
            alert("Username taken or wrong password");
        }
    } else {
        if(DB.save(u, p)) {
            sessionStorage.setItem('active_user', u);
            window.location.href = "/aigame";
        }
    }
});

document.getElementById('puter-login').addEventListener('click', async () => {
    try {
        const res = await puter.auth.signIn();
        if(res) window.location.href = "/aigame";
    } catch(e) {}
});
