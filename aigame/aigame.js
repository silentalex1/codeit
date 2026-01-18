@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
body { background: #050505; color: white; height: 100vh; display: flex; overflow: hidden; }

.grid-bg {
    position: fixed; inset: 0; z-index: -1;
    background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 60px 60px;
}

.sidebar { width: 280px; background: #08080a; border-right: 1px solid #1a1a1e; transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1); z-index: 1000; }
.sidebar.hidden { transform: translateX(-280px); width: 0; border: none; padding: 0; }
.side-inner { height: 100%; display: flex; flex-direction: column; padding: 20px; }
.history { flex: 1; overflow-y: auto; margin: 20px 0; }
.search-box { background: #15151a; border: 1px solid #222; padding: 12px; border-radius: 10px; color: #475569; font-size: 12px; cursor: pointer; }
.side-bottom { margin-top: auto; }
.new-btn { width: 100%; padding: 14px; background: #111116; border: 1px solid #222; color: white; border-radius: 12px; cursor: pointer; font-weight: 600; }

.side-restore { position: fixed; left: 15px; top: 50%; width: 6px; height: 50px; background: #3b82f6; border-radius: 100px; cursor: pointer; display: none; z-index: 200; box-shadow: 0 0 20px #3b82f666; }

.main { flex: 1; display: flex; flex-direction: column; position: relative; }
.navbar { height: 75px; display: flex; justify-content: space-between; align-items: center; padding: 0 40px; border-bottom: 1px solid #1a1a1e; background: #050505; }
.logo { font-weight: 800; color: #3b82f6; font-size: 20px; }
.nav-r { display: flex; align-items: center; gap: 20px; }
.plugin-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; }
.nav-item { background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 13px; }

.pfp-container { position: relative; display: flex; align-items: center; }
.avatar { width: 38px; height: 38px; background: #1e293b; border-radius: 50%; cursor: pointer; border: 1px solid #334155; background-size: cover; }
.dropdown { position: absolute; right: 0; top: 45px; width: 160px; background: #0c0c0e; border: 1px solid #1e1e24; border-radius: 14px; padding: 10px; display: none; z-index: 1001; }
.dropdown.active { display: block; }
.dropdown button { width: 100%; padding: 10px; background: transparent; border: none; color: white; text-align: left; cursor: pointer; border-radius: 8px; font-size: 14px; }
.dropdown button:hover { background: #15151a; }

.hub { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 750px; text-align: center; transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.hub.active { top: calc(100% - 110px); }
.hub h1 { font-size: 34px; margin-bottom: 35px; }
.hub.active h1, .hub.active .premade { display: none; }
.premade { display: flex; gap: 15px; justify-content: center; margin-bottom: 35px; }
.sq-opt { width: 180px; height: 110px; background: #0c0c0e; border: 1px solid #222; border-radius: 20px; color: #94a3b8; cursor: pointer; padding: 15px; font-size: 12px; font-weight: 600; transition: 0.3s; }
.sq-opt:hover { border-color: #3b82f6; background: #111116; color: white; }

.input-hub { background: #111116; border: 1px solid #222; border-radius: 20px; padding: 14px 28px; display: flex; align-items: center; gap: 15px; width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
textarea { flex: 1; background: transparent; border: none; color: white; resize: none; height: 26px; outline: none; font-size: 16px; line-height: 26px; }
#gen-action { background: #3b82f6; color: white; border: none; padding: 10px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; }

.chat-viewport { width: 850px; margin: 50px auto; overflow-y: auto; max-height: calc(100vh - 270px); display: none; padding-bottom: 50px; }
.msg-u { font-weight: 700; font-size: 19px; border-left: 4px solid #3b82f6; padding-left: 20px; margin-bottom: 30px; }
.msg-ai { background: #0c0c11; padding: 28px; border-radius: 22px; line-height: 1.7; color: #cbd5e1; margin-bottom: 45px; border: 1px solid #1e1e24; }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(12px); display: none; justify-content: center; align-items: center; z-index: 2000; }
.modal-box { width: 500px; background: #0c0c0e; border-radius: 20px; padding: 25px; border: 1px solid #222; }
#search-q { width: 100%; background: #111116; border: 1px solid #333; padding: 15px; border-radius: 12px; color: white; outline: none; }

.settings-card { width: 800px; height: 550px; background: #0c0c0e; display: flex; border-radius: 28px; border: 1px solid #222; overflow: hidden; }
.s-nav { width: 220px; background: #08080a; border-right: 1px solid #1a1a1e; padding: 35px; display: flex; flex-direction: column; }
.s-link { padding: 12px 18px; color: #475569; font-size: 14px; cursor: pointer; border-radius: 10px; margin-bottom: 10px; }
.s-link.active { background: #111116; color: white; font-weight: 700; }
.s-bottom { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }
#save-all { background: #3b82f6; color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; }
.danger { background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 12px; border-radius: 12px; font-size: 12px; cursor: pointer; }
.puter-btn-s { background: #111116; border: 1px solid #1a1a1e; color: #94a3b8; padding: 10px; border-radius: 10px; cursor: pointer; font-size: 12px; }

.s-body { flex: 1; padding: 45px; overflow-y: auto; }
.tab { display: none; }
.tab.active { display: block; }
.title-wrap { margin-bottom: 30px; }
.title-wrap h3 { margin-bottom: 10px; }
.v-line { height: 1px; background: #1a1a1e; width: 100%; }

.f-grp { margin-bottom: 25px; }
.f-grp label { display: block; font-size: 11px; color: #475569; margin-bottom: 10px; text-transform: uppercase; }
.f-grp input { width: 100%; padding: 12px; background: #050507; border: 1px solid #1e1e24; border-radius: 12px; color: white; outline: none; }

.drop-zone { width: 100%; height: 120px; border: 2px dashed #1e1e24; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 25px; cursor: pointer; transition: 0.3s; position: relative; }
.drop-zone:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
#select-pfp { background: #1a1a1e; border: 1px solid #333; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; margin-bottom: 8px; }
.drop-zone p { font-size: 12px; color: #475569; }
#pfp-preview { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; }

.lever-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-top: 1px solid #1a1a1e; }
.lever { width: 46px; height: 24px; background: #1e1e24; border-radius: 100px; position: relative; cursor: pointer; transition: 0.3s; }
.lever.on { background: #3b82f6; }
.dot { width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: 0.3s; }
.lever.on .dot { left: 25px; }

.plugin-box { text-align: center; width: 400px; background: #0c0c0e; padding: 30px; border-radius: 20px; border: 1px solid #222; }
.p-btns { display: flex; gap: 15px; margin-top: 25px; }
.p-btns button { flex: 1; padding: 14px; border-radius: 12px; cursor: pointer; font-weight: 700; border: none; }
#plug-yes { background: #3b82f6; color: white; }
#plug-no { background: #1a1a1e; color: white; }

.burger { display: none; background: none; border: none; color: white; font-size: 26px; cursor: pointer; }
@media (max-width: 1024px) {
    .sidebar { position: fixed; left: -280px; height: 100%; }
    .sidebar.open { left: 0; }
    .burger { display: block; }
    .chat-viewport, .hub { width: 95%; }
    .pc-only { display: none; }
}
