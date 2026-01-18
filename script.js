const api = "http://localhost:3000/api";

document.getElementById('go-btn').addEventListener('click', async () => {
    const username = document.getElementById('user').value.trim();
    const password = document.getElementById('pass').value.trim();

    if(!username || !password) return;

    try {
        const res = await fetch(`${api}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (res.ok || (await res.json()).error === "Username taken") {
            const login = await fetch(`${api}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if(login.ok) {
                sessionStorage.setItem('copilot_user', username);
                window.location.href = "/aigame";
            }
        }
    } catch (e) { alert("Server not running. Run server.js first!"); }
});

document.getElementById('p-btn').addEventListener('click', async () => {
    const u = await puter.auth.signIn();
    if(u) window.location.href = "/aigame";
});
