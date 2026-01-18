document.getElementById('btn-create').addEventListener('click', async () => {
    const user = document.getElementById('u-in').value.trim();
    const pass = document.getElementById('p-in').value.trim();
    if (!user || !pass) return;

    let db = await puter.kv.get('copilot_db');
    let data = db ? JSON.parse(db) : {};

    if (data[user]) {
        if (data[user].password === pass) {
            sessionStorage.setItem('copilot_session', JSON.stringify({ name: user }));
            window.location.href = "aigame/";
        } else { alert("Invalid password"); }
    } else {
        data[user] = {
            password: pass,
            settings: { nickname: user, pfp: '', workMode: false, hideSidebar: false },
            history: []
        };
        await puter.kv.set('copilot_db', JSON.stringify(data));
        sessionStorage.setItem('copilot_session', JSON.stringify({ name: user }));
        window.location.href = "aigame/";
    }
});

document.getElementById('btn-puter').addEventListener('click', () => {
    puter.auth.signIn().then(() => {
        sessionStorage.setItem('copilot_session', JSON.stringify({ name: 'PuterUser', isPuter: true }));
        window.location.href = "aigame/";
    });
});
