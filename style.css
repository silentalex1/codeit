const Storage = {
    save: (user, pass) => {
        const data = JSON.parse(localStorage.getItem('user_db') || '{}');
        if (data[user]) return false;
        data[user] = { pass: pass, id: Date.now() };
        localStorage.setItem('user_db', JSON.stringify(data));
        return true;
    },
    check: (user, pass) => {
        const data = JSON.parse(localStorage.getItem('user_db') || '{}');
        return data[user] && data[user].pass === pass;
    }
};

document.getElementById('auth-btn').addEventListener('click', () => {
    const user = document.getElementById('u-name').value.trim();
    const pass = document.getElementById('u-pass').value.trim();

    if (!user || !pass) return alert("Fill in the boxes");

    const data = JSON.parse(localStorage.getItem('user_db') || '{}');
    if (data[user]) {
        if (Storage.check(user, pass)) {
            sessionStorage.setItem('current_user', user);
            window.location.href = "/aigame";
        } else {
            alert("Wrong details or user exists");
        }
    } else {
        if (Storage.save(user, pass)) {
            sessionStorage.setItem('current_user', user);
            window.location.href = "/aigame";
        }
    }
});

document.getElementById('p-login').addEventListener('click', async () => {
    try {
        const res = await puter.auth.signIn();
        if (res) window.location.href = "/aigame";
    } catch (e) {}
});
