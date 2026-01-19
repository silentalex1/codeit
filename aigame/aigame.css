@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
body { background: #050505; color: white; height: 100vh; display: flex; overflow: hidden; }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1a1a1e; border-radius: 10px; }
.grid-bg { position: fixed; inset: 0; z-index: -1; background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 60px 60px; }
.sidebar { width: 280px; background: #08080a; border-right: 1px solid #1a1a1e; transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1); z-index: 1000; }
.sidebar.hidden { transform: translateX(-280px); width: 0; border: none; }
.side-inner { height: 100%; display: flex; flex-direction: column; padding: 20px; }
.history { flex: 1; overflow-y: auto; margin: 20px 0; }
.hist-item { padding: 12px; border-radius: 12px; font-size: 13px; color: #64748b; cursor: pointer; transition: 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px; }
.hist-item:hover { background: #111116; color: white; }
.search-box { background: #0c0c0e; border: 1px solid #1a1a1e; padding: 12px; border-radius: 14px; color: #475569; font-size: 12px; cursor: pointer; transition: 0.3s; }
.search-box:hover { border-color: #3b82f6; color: #94a3b8; }
.new-btn { width: 100%; padding: 14px; background: #111116; border: 1px solid #1e1e24; color: white; border-radius: 14px; cursor: pointer; font-weight: 700; transition: 0.3s; }
.side-restore { position: fixed; left: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 60px; background: #3b82f6; border-radius: 0 4px 4px 0; cursor: pointer; display: none; z-index: 200; box-shadow: 4px 0 20px rgba(59, 130, 246, 0.4); }
.main { flex: 1; display: flex; flex-direction: column; position: relative; height: 100vh; }
.navbar { height: 75px; display: flex; justify-content: space-between; align-items: center; padding: 0 40px; border-bottom: 1px solid #1a1a1e; background: rgba(5, 5, 5, 0.8); backdrop-filter: blur(15px); z-index: 1100; }
.logo { font-weight: 800; color: #3b82f6; font-size: 20px; letter-spacing: -0.5px; }
.nav-r { display: flex; align-items: center; gap: 25px; }
.plugin-btn { background: #10b981; color: white; border: none; padding: 10px 22px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.3s; }
.nav-item { background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 13px; font-weight: 600; }
.pfp-container { position: relative; }
.avatar { width: 42px; height: 42px; background: #1e293b; border-radius: 50%; cursor: pointer; border: 2px solid #1a1a1e; background-size: cover; background-position: center; transition: 0.3s; }
.dropdown { position: absolute; right: 0; top: 55px; width: 180px; background: #0c0c0e; border: 1px solid #1e1e24; border-radius: 18px; padding: 10px; display: none; z-index: 5000; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
.dropdown.active { display: block; animation: dropFade 0.25s ease-out; }
@keyframes dropFade { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.dropdown button { width: 100%; padding: 12px; background: transparent; border: none; color: #94a3b8; text-align: left; cursor: pointer; border-radius: 12px; font-size: 14px; font-weight: 600; }
.dropdown button:hover { background: #111116; color: white; }
#logout-btn { color: #ef4444 !important; }
.hub { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1); z-index: 500; }
.hub.active .hub-center-content { opacity: 0; pointer-events: none; transform: translateY(-20px); height: 0; overflow: hidden; }
.hub-center-content { text-align: center; width: 750px; transition: 0.5s; }
.hub h1 { font-size: 42px; margin-bottom: 45px; letter-spacing: -1.5px; font-weight: 800; }
.premade { display: flex; gap: 18px; justify-content: center; margin-bottom: 50px; }
.sq-opt { width: 220px; height: 130px; background: rgba(15, 15, 20, 0.4); border: 1px solid #1a1a1e; border-radius: 28px; color: #64748b; cursor: pointer; padding: 22px; font-size: 13px; font-weight: 600; transition: 0.3s; text-align: left; line-height: 1.6; }
.sq-opt:hover { border-color: #3b82f6; background: #0c0c0e; color: white; transform: translateY(-5px); box-shadow: 0 10px 30px rgba(59, 130, 246, 0.1); }
.input-hub-container { width: 100%; display: flex; justify-content: center; position: absolute; bottom: 10%; transition: 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.hub.active .input-hub-container { bottom: 30px; }
.input-hub { background: #0c0c0e; border: 1px solid #1e1e24; border-radius: 26px; padding: 12px 12px 12px 28px; display: flex; align-items: center; gap: 15px; width: 780px; box-shadow: 0 25px 60px rgba(0,0,0,0.5); position: relative; z-index: 1050; }
textarea { flex: 1; background: transparent; border: none; color: white; resize: none; min-height: 28px; max-height: 200px; outline: none; font-size: 16px; line-height: 28px; }
#gen-action { background: #3b82f6; color: white; border: none; padding: 12px 30px; border-radius: 18px; font-weight: 800; cursor: pointer; transition: 0.3s; font-size: 14px; }
.chat-viewport { width: 850px; margin: 0 auto; overflow-y: auto; height: calc(100vh - 180px); display: none; padding: 40px 20px 120px; scroll-behavior: smooth; }
.msg-u { font-weight: 800; font-size: 22px; border-left: 5px solid #3b82f6; padding-left: 28px; margin-bottom: 45px; letter-spacing: -0.5px; }
.msg-ai { background: rgba(12, 12, 17, 0.6); padding: 35px; border-radius: 32px; line-height: 1.8; color: #cbd5e1; margin-bottom: 50px; border: 1px solid #1e1e24; position: relative; }
.status-text { font-size: 14px; color: #3b82f6; font-weight: 700; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
.thought-stream { font-family: monospace; font-size: 12px; color: #475569; height: 20px; overflow: hidden; margin-bottom: 10px; border-left: 2px solid #1e1e24; padding-left: 10px; opacity: 0.8; }
.thought-line { animation: thoughtSlide 0.5s infinite linear; white-space: nowrap; }
@keyframes thoughtSlide { from { transform: translateY(0); } to { transform: translateY(-20px); } }
pre { background: #000; padding: 25px; border-radius: 20px; color: #4ade80; overflow-x: auto; margin-top: 20px; font-family: 'JetBrains Mono', monospace; font-size: 14px; border: 1px solid #111; }
.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(20px); display: none; justify-content: center; align-items: center; z-index: 9999; }
.modal-box { width: 550px; background: #0c0c0e; border-radius: 30px; padding: 35px; border: 1px solid #1e1e24; }
#search-q { width: 100%; background: #050505; border: 1px solid #1e1e24; padding: 18px; border-radius: 18px; color: white; outline: none; font-size: 16px; }
.settings-card { width: 900px; height: 650px; background: #0c0c0e; display: flex; border-radius: 35px; border: 1px solid #1e1e24; overflow: hidden; }
.s-nav { width: 260px; background: #08080a; border-right: 1px solid #1a1a1e; padding: 45px 25px; display: flex; flex-direction: column; }
.s-link { padding: 15px 22px; color: #4b5563; font-size: 14px; cursor: pointer; border-radius: 15px; margin-bottom: 10px; font-weight: 700; transition: 0.2s; }
.s-link.active { background: #111116; color: white; }
.s-bottom { margin-top: auto; display: flex; flex-direction: column; gap: 12px; }
#save-all { background: white; color: black; border: none; padding: 16px; border-radius: 16px; font-weight: 800; cursor: pointer; }
.danger { background: transparent; color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 14px; border-radius: 16px; font-size: 12px; cursor: pointer; font-weight: 700; }
.s-body { flex: 1; padding: 60px; overflow-y: auto; }
.tab { display: none; }
.tab.active { display: block; animation: tabFade 0.4s ease-out; }
@keyframes tabFade { from { opacity: 0; filter: blur(5px); } to { opacity: 1; filter: blur(0); } }
.title-wrap h3 { font-size: 24px; margin-bottom: 15px; font-weight: 800; }
.v-line { height: 1px; background: linear-gradient(90deg, #1e1e24, transparent); width: 100%; margin-bottom: 35px; }
.f-grp { margin-bottom: 35px; }
.f-grp label { display: block; font-size: 11px; color: #475569; margin-bottom: 12px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; }
.f-grp input { width: 100%; padding: 16px; background: #050507; border: 1px solid #1a1a1e; border-radius: 16px; color: white; outline: none; }
.drop-zone { width: 100%; height: 150px; border: 2px dashed #1e1e24; border-radius: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 35px; cursor: pointer; transition: 0.3s; }
.drop-zone:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.02); }
.lever-row { display: flex; justify-content: space-between; align-items: center; padding: 25px 0; border-top: 1px solid #1a1a1e; color: #94a3b8; font-size: 15px; font-weight: 700; }
.lever { width: 52px; height: 28px; background: #1e1e24; border-radius: 100px; position: relative; cursor: pointer; transition: 0.3s; }
.lever.on { background: #3b82f6; }
.dot { width: 20px; height: 20px; background: white; border-radius: 50%; position: absolute; top: 4px; left: 4px; transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.lever.on .dot { left: 28px; }
@media (max-width: 1024px) {
    .sidebar { position: fixed; left: -280px; height: 100%; }
    .sidebar.open { left: 0; }
    .burger { display: flex; }
    .input-hub { width: 92%; }
    .hub-center-content { width: 92%; }
}
