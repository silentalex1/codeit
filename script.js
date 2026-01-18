document.getElementById('reg').addEventListener('click', async () => {
    const user = document.getElementById('u').value.trim();
    const pass = document.getElementById('p').value.trim();
    if (!user || !pass) return;

    try {
        let users = await puter.kv.get('app_users');
        users = users ? JSON.parse(users) : {};

        if (users[user]) {
            if (users[user] === pass) {
                sessionStorage.setItem('copilot_session', user);
                window.location.href = "/aigame";
            } else {
                alert("Username taken");
            }
        } else {
            users[user] = pass;
            await puter.kv.set('app_users', JSON.stringify(users));
            sessionStorage.setItem('copilot_session', user);
            window.location.href = "/aigame";
        }
    } catch (e) {
        puter.auth.signIn().then(() => window.location.href = "/aigame");
    }
});

document.getElementById('p-log').addEventListener('click', () => {
    puter.auth.signIn().then(() => window.location.href = "/aigame");
});
