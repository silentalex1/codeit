@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

:root { 
    --ui-pad: 20px; 
    --ui-radius: 20px; 
    --ui-font: 16px; 
    --primary: #3b82f6; 
    --bg: #050505; 
    --accent: #10b981;
    --stroke: rgba(255,255,255,.08);
    --card: #0c0c0e;
}

[data-ui="mobile"], [data-ui="tablet"] { --ui-pad: 15px; --ui-font: 15px; }

* { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; pointer-events: auto; }
body { background: var(--bg); color: white; height: 100vh; display: flex; overflow: hidden; font-size: var(--ui-font); }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 10px; }

.main { flex: 1; display: flex; flex-direction: column; position: relative; height: 100%; min-width: 0; z-index: 10; }

.ui-notification { position: fixed; top: -100px; left: 50%; transform: translateX(-50%); background: rgba(10, 10, 12, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); padding: 10px 24px; border-radius: 100px; z-index: 9999; backdrop-filter: blur(15px); transition: all 0.8s cubic-bezier(0.19, 1, 0.22, 1); opacity: 0; pointer-events: none; }
.ui-notification.show { top: 85px; opacity: 1; }
.ui-notification.fade { opacity: 0; transform: translateX(-50%) translateY(-20px); }

.grid-bg { position: fixed; inset: 0; z-index: -1; background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; }
.sidebar { width: 280px; background: #08080a; border-right: 1px solid #1a1a1e; transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1); z-index: 1000; flex-shrink: 0; position: relative; }
.sidebar.hidden { transform: translateX(-280px); width: 0; border: none; visibility: hidden; margin-right: -280px; }

.navbar { height: 75px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 100px 0 40px; border-bottom: 1px solid #1a1a1e; background: rgba(5, 5, 5, 0.8); backdrop-filter: blur(15px); z-index: 1001; flex-shrink: 0; }
.nav-r { display: flex; align-items: center; gap: 20px; }

.hub { position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); width: min(800px, 92%); display: flex; flex-direction: column; transition: opacity 0.4s ease, transform 0.4s ease, visibility 0.4s; z-index: 50; }
.hub.hidden-hub { opacity: 0; transform: translate(-50%, 20px); visibility: hidden; pointer-events: none; }

.input-hub-pill { background: rgba(12, 12, 14, 0.9); border: 1px solid #1a1a1e; border-radius: 30px; padding: 10px 14px; display: flex; align-items: center; gap: 12px; width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.5); backdrop-filter: blur(10px); }

.chat-viewport { width: min(850px, 94%); margin: 0 auto; overflow-y: auto; height: calc(100vh - 180px); display: none; padding: 40px 20px 120px; flex: 1; position: relative; z-index: 5; }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(20px); display: none; justify-content: center; align-items: center; z-index: 5000; padding: 20px; }

.settings-card { width: 100%; max-width: 850px; height: 600px; background: var(--card); display: flex; border-radius: 32px; border: 1px solid #1a1a1e; overflow: hidden; position: relative; }
.s-nav { width: 240px; background: #08080a; border-right: 1px solid #151518; padding: 40px 25px; display: flex; flex-direction: column; z-index: 2; }
.s-body { flex: 1; padding: 45px; overflow-y: auto; background: var(--card); z-index: 1; }

.tab { display: none; }
.tab.active { display: block; }

.lever { width: 48px; height: 26px; background: #1a1a1e; border-radius: 100px; position: relative; cursor: pointer; transition: 0.3s; }
.lever.on { background: var(--primary); }
.dot { width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; top: 4px; left: 4px; transition: 0.4s; pointer-events: none; }
.lever.on .dot { left: 26px; }

.s-input { width: 100%; padding: 14px; background: #050507; border: 1px solid #1a1a1e; border-radius: 14px; color: white; outline: none; appearance: none; }
select.s-input { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; background-size: 16px; padding-right: 40px; }

.side-restore { position: fixed; left: 0; top: 50%; transform: translateY(-50%); width: 12px; height: 70px; background: var(--primary); border-radius: 0 10px 10px 0; cursor: pointer; display: none; z-index: 1100; box-shadow: 4px 0 20px rgba(59, 130, 246, 0.3); }

button, input, textarea, select, .lever, .s-link, .hist-item, .sq-opt { cursor: pointer; }

@media (max-width: 1024px) {
    .sidebar { position: fixed; left: -280px; height: 100%; top: 0; width: 280px; }
    .sidebar.open { left: 0; box-shadow: 20px 0 60px rgba(0,0,0,0.8); visibility: visible; }
    .navbar { padding: 0 15px; }
    .settings-card { flex-direction: column; height: 90vh; }
    .s-nav { width: 100%; flex-direction: row; height: auto; padding: 10px; border-right: none; border-bottom: 1px solid #151518; overflow-x: auto; }
}
