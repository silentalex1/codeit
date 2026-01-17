@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', sans-serif;
}

body {
    background: #0a0a0c;
    color: white;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.glow-bg {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(circle at 80% 20%, #1e3a8a 0%, transparent 40%),
                radial-gradient(circle at 10% 80%, #1e1b4b 0%, transparent 40%);
    z-index: -1;
}

.landing-grid {
    display: flex;
    width: 1200px;
    max-width: 90%;
    gap: 100px;
    align-items: center;
}

.text-side { flex: 1; }

.status-tag {
    background: #1e293b;
    padding: 6px 14px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 600;
    display: inline-block;
    margin-bottom: 24px;
    border: 1px solid #334155;
}

h1 {
    font-size: 52px;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 24px;
}

h1 span { color: #3b82f6; }

p {
    font-size: 18px;
    color: #94a3b8;
    margin-bottom: 40px;
}

.feature-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.f-item {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #cbd5e1;
}

.f-item span { color: #3b82f6; font-weight: bold; }

.auth-box {
    width: 420px;
    background: #111114;
    padding: 40px;
    border-radius: 28px;
    border: 1px solid #27272a;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
}

h2 { font-size: 22px; text-align: center; margin-bottom: 30px; }

.input-wrap { margin-bottom: 20px; }

.input-wrap label {
    display: block;
    font-size: 12px;
    color: #71717a;
    margin-bottom: 8px;
}

input {
    width: 100%;
    background: #0a0a0c;
    border: 1px solid #27272a;
    padding: 14px;
    border-radius: 12px;
    color: white;
    outline: none;
    transition: 0.2s;
}

input:focus { border-color: #3b82f6; }

.main-btn {
    width: 100%;
    padding: 16px;
    background: #fff;
    color: #000;
    border: none;
    border-radius: 12px;
    font-weight: 800;
    cursor: pointer;
    margin-bottom: 20px;
}

.or-line {
    text-align: center;
    position: relative;
    margin-bottom: 20px;
}

.or-line::after {
    content: "";
    position: absolute;
    left: 0; top: 50%; width: 100%; height: 1px;
    background: #27272a;
    z-index: 1;
}

.or-line span {
    background: #111114;
    padding: 0 10px;
    position: relative;
    z-index: 2;
    color: #52525b;
    font-size: 12px;
}

.secondary-btn {
    width: 100%;
    padding: 14px;
    background: transparent;
    border: 1px solid #3b82f6;
    color: #3b82f6;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
}

.p-link {
    display: block;
    text-align: center;
    margin-top: 20px;
    font-size: 11px;
    color: #3f3f46;
    text-decoration: none;
}
