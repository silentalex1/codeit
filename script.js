function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        return {
            classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
            addEventListener: () => {},
            value: '',
            innerText: '',
            innerHTML: '',
            style: {},
            focus: () => {},
            click: () => {}
        };
    }
    return element;
}

const chatInput = safeGetElement('chatInput');
const inputContainer = safeGetElement('inputContainer');
const chatArea = safeGetElement('chatArea');
const sidebar = safeGetElement('sidebar');
const sidebarToggleBtn = safeGetElement('sidebarToggleBtn');
const toggleIcon = safeGetElement('toggleIcon');
const newChatBtn = safeGetElement('newChatBtn');
const historyContainer = safeGetElement('history');
const contextMenu = safeGetElement('contextMenu');
const renameBtn = safeGetElement('renameBtn');
const deleteBtn = safeGetElement('deleteBtn');
const suggestionsContainer = safeGetElement('suggestions');
const suggestionButtons = document.querySelectorAll('.sugg-btn');
const imagePreviewContainer = safeGetElement('imagePreviewContainer');
const imageUploadBtn = safeGetElement('imageUploadBtn');
const imageInput = safeGetElement('imageInput');
const modelDropdownBtn = safeGetElement('modelDropdownBtn');
const modelDropdown = safeGetElement('modelDropdown');
const modelDropdownLabel = safeGetElement('modelDropdownLabel');
const selectCodingModel = safeGetElement('selectCodingModel');
const selectCanvasModel = safeGetElement('selectCanvasModel');
const codingActiveBadge = safeGetElement('codingActiveBadge');
const canvasActiveBadge = safeGetElement('canvasActiveBadge');

const settingsBtn = safeGetElement('settingsBtn');
const settingsModal = safeGetElement('settingsModal');
const closeSettingsBtn = safeGetElement('closeSettingsBtn');
const tabAiBtn = safeGetElement('tabAiBtn');
const tabConfigBtn = safeGetElement('tabConfigBtn');
const tabUserBtn = safeGetElement('tabUserBtn');
const tabAiContent = safeGetElement('tabAiContent');
const tabConfigContent = safeGetElement('tabConfigContent');
const tabUserContent = safeGetElement('tabUserContent');
const saveAllBtn = safeGetElement('saveAllBtn');

const googleSignInBtn = safeGetElement('googleSignInBtn');
const loggedOutState = safeGetElement('loggedOutState');
const loggedInState = safeGetElement('loggedInState');
const usernameInput = safeGetElement('usernameInput');
const saveUsernameBtn = safeGetElement('saveUsernameBtn');

const openCreateKeyBtn = safeGetElement('openCreateKeyBtn');
const createKeyModal = safeGetElement('createKeyModal');
const cancelCreateKeyBtn = safeGetElement('cancelCreateKeyBtn');
const confirmCreateKeyBtn = safeGetElement('confirmCreateKeyBtn');
const newKeyNameInput = safeGetElement('newKeyName');

const showKeyModal = safeGetElement('showKeyModal');
const generatedKeyDisplayModal = safeGetElement('generatedKeyDisplayModal');
const copyModalKeyBtn = safeGetElement('copyModalKeyBtn');
const doneKeyBtn = safeGetElement('doneKeyBtn');
const apiKeyList = safeGetElement('apiKeyList');

const apiEndpoint = safeGetElement('apiEndpoint');
const apiKeyInput = safeGetElement('apiKeyInput');
const apiModel = safeGetElement('apiModel');
const apiTemperature = safeGetElement('apiTemperature');
const apiMaxTokens = safeGetElement('apiMaxTokens');
const testApiBtn = safeGetElement('testApiBtn');

let isMoved = false;
let sidebarOpen = false;
let activeHistoryItem = null;
let uploadedImages = [];
let currentModel = 'PSAI-v1.0';
let userData = {
    username: 'UlesRamirez',
    customInstructions: '',
    apiKeys: [],
    apiConfig: {
        endpoint: 'https://codeit.rest/v1/chat/completions',
        apiKey: '',
        model: 'prysmis-1',
        temperature: 0.7,
        maxTokens: 1024
    },
    isLoggedIn: false
};

const psaiClient = PrysmisAI.createClient({
    endpoint: userData.apiConfig?.endpoint || PrysmisAI.defaultEndpoint,
    auth: userData.apiConfig?.authHeader || ('Bearer sk-prysmis-prod-95fZe5PBGA7ErrKSL9dW3OjweOtioFQI'),
    model: userData.apiConfig?.model || PrysmisAI.modelId,
    temperature: parseFloat(userData.apiConfig?.temperature || 0.7),
    maxTokens: parseInt(userData.apiConfig?.maxTokens || 1024),
    systemPrompt: PrysmisAI.systemPrompt
});

const HF_SYSTEM_PROMPT = PrysmisAI.systemPrompt;

const FALLBACK_ANSWERS = {
    'tween': 'To tween a part in Roblox:\n```lua\nlocal TweenService = game:GetService("TweenService")\nlocal part = workspace.Part\nlocal goal = {Position = Vector3.new(0, 10, 0)}\nlocal info = TweenInfo.new(2, Enum.EasingStyle.Quad)\nlocal tween = TweenService:Create(part, info, goal)\ntween:Play()\n```',
    'remoteevent|remote event': 'RemoteEvents connect Server and Client:\n```lua\n-- Server (Script)\nlocal RE = game.ReplicatedStorage.MyEvent\nRE.OnServerEvent:Connect(function(player, data)\n    print(player.Name, data)\nend)\n\n-- Client (LocalScript)\nlocal RE = game.ReplicatedStorage.MyEvent\nRE:FireServer("hello")\n```',
    'datastore|data store': 'DataStore example:\n```lua\nlocal DSS = game:GetService("DataStoreService")\nlocal store = DSS:GetDataStore("PlayerData")\n\ngame.Players.PlayerRemoving:Connect(function(player)\n    store:SetAsync(player.UserId, {coins = 100})\nend)\n```',
    'gui|screengui': 'Basic ScreenGui setup:\n```lua\nlocal gui = script.Parent\nlocal frame = Instance.new("Frame")\nframe.Size = UDim2.new(0.5, 0, 0.5, 0)\nframe.Position = UDim2.new(0.25, 0, 0.25, 0)\nframe.Parent = gui\n```',
    'loop|for.*do|while.*do': 'Lua loops in Roblox:\n```lua\nfor i = 1, 10 do print(i) end\n\nfor k, v in pairs(myTable) do print(k, v) end\n\nwhile true do\n    task.wait(1)\n    print("tick")\nend\n```',
    'function': 'Roblox Lua function syntax:\n```lua\nlocal function greet(name)\n    return "Hello, " .. name .. "!"\nend\nprint(greet("Player"))\n```',
    'part|brick|block': 'Create a Part in Roblox:\n```lua\nlocal part = Instance.new("Part")\npart.Size = Vector3.new(4, 1, 4)\npart.Position = Vector3.new(0, 5, 0)\npart.BrickColor = BrickColor.new("Bright blue")\npart.Anchored = true\npart.Parent = workspace\n```',
    'print': 'Use print() in Roblox: `print("hello world")` — output shows in the Output window in Roblox Studio.',
    'error|fix|bug': 'Common Roblox Lua error fixes:\n- "attempt to index nil" → the object does not exist yet, check spelling/path\n- "attempt to call nil" → function is not defined or not found\n- Use `print(typeof(myVar))` to debug variable types\n- Wrap code in `pcall(function() ... end)` to catch errors safely'
};

function getSmartFallback(query) {
    const lower = query.toLowerCase();
    for (const [pattern, answer] of Object.entries(FALLBACK_ANSWERS)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(lower)) return answer;
    }
    return null;
}

const COLOUR_MAP = {
    red: [220,38,38], crimson: [185,28,28], pink: [236,72,153], rose: [244,63,94],
    magenta: [217,70,239], maroon: [120,20,20], orange: [249,115,22], amber: [245,158,11],
    yellow: [234,179,8], gold: [212,175,55], lime: [132,204,22], green: [34,197,94],
    emerald: [16,185,129], teal: [20,184,166], cyan: [6,182,212], mint: [110,231,183],
    blue: [59,130,246], navy: [30,58,138], indigo: [99,102,241], violet: [139,92,246],
    purple: [168,85,247], lavender: [167,139,250], white: [255,255,255], silver: [192,192,192],
    grey: [107,114,128], gray: [107,114,128], black: [15,15,25], dark: [30,30,45],
    cream: [255,253,234], fire: [249,115,22], ice: [186,230,253], neon: [57,255,20],
    galaxy: [72,52,212], ocean: [14,165,233], forest: [21,128,61], sunset: [251,113,133],
    midnight: [15,23,42]
};

const STYLE_MAP = {
    gaming:'gaming', gamer:'gaming', game:'gaming', cool:'cool', aesthetic:'aesthetic',
    vibe:'aesthetic', anime:'anime', ninja:'ninja', warrior:'warrior', dragon:'dragon',
    fire:'fire', ice:'ice', cyber:'cyber', neon:'neon', galaxy:'galaxy', space:'space',
    ocean:'ocean', nature:'nature', forest:'nature', sunset:'sunset', dark:'dark',
    light:'light', minimal:'minimal', simple:'minimal', clean:'minimal', fancy:'fancy',
    elegant:'fancy', royal:'fancy', street:'streetwear', streetwear:'streetwear',
    urban:'streetwear', cute:'cute', kawaii:'cute', pastel:'pastel', pattern:'pattern',
    stripe:'stripe', stripes:'stripe', camo:'camo', camouflage:'camo', floral:'floral',
    flower:'floral'
};

const STYLE_DEFAULTS = {
    gaming:[[89,89,255],[15,15,25],[57,255,20]], fire:[[249,115,22],[220,38,38],[254,240,138]],
    ice:[[186,230,253],[147,197,253],[255,255,255]], neon:[[57,255,20],[0,255,255],[255,0,255]],
    galaxy:[[72,52,212],[139,92,246],[15,15,40]], space:[[15,15,40],[72,52,212],[255,255,255]],
    ocean:[[14,165,233],[6,182,212],[186,230,253]], anime:[[236,72,153],[168,85,247],[255,253,234]],
    cyber:[[6,182,212],[15,15,25],[57,255,20]], cute:[[244,63,94],[251,207,232],[255,255,255]],
    pastel:[[167,139,250],[251,207,232],[186,230,253]], minimal:[[255,255,255],[200,200,210],[50,50,70]],
    streetwear:[[15,15,25],[107,114,128],[255,255,255]], camo:[[21,128,61],[134,178,120],[50,50,30]],
    dark:[[15,15,25],[30,30,50],[139,92,246]], warrior:[[180,50,20],[80,30,10],[255,200,0]],
    ninja:[[15,15,15],[60,60,60],[200,200,200]], dragon:[[180,20,20],[80,10,10],[255,150,0]],
    floral:[[236,72,153],[253,164,175],[254,240,138]], stripe:[[59,130,246],[15,15,25],[255,255,255]]
};

const STYLE_LABELS = {
    gaming:'GAME ON', cyber:'CYBER', neon:'NEON', galaxy:'GALAXY', space:'SPACE',
    fire:'FIRE', ice:'ICE', ninja:'NINJA', warrior:'WARRIOR', dragon:'DRAGON',
    ocean:'OCEAN', cute:'CUTE', anime:'ANIME', streetwear:'STREET', camo:'CAMO',
    floral:'FLORAL', stripe:'STRIPE', dark:'DARK', cool:'COOL'
};

function blend(c1, c2, t) {
    return [
        Math.round(c1[0] + (c2[0]-c1[0])*t),
        Math.round(c1[1] + (c2[1]-c1[1])*t),
        Math.round(c1[2] + (c2[2]-c1[2])*t)
    ];
}
function darken(c, f) { return c.map(v => Math.max(0, Math.round(v*f))); }
function lighten(c, f) { return c.map(v => Math.min(255, Math.round(v*f))); }
function rgb(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }

function analysePrompt(prompt) {
    const words = prompt.toLowerCase().match(/[a-z]+/g) || [];
    let colours = [];
    let rainbow = false;
    for (const w of words) {
        if (w === 'rainbow') { rainbow = true; break; }
        if (COLOUR_MAP[w]) colours.push(COLOUR_MAP[w]);
    }
    if (rainbow) colours = [[255,0,0],[255,127,0],[255,255,0],[0,200,0],[0,0,255],[139,0,255]];

    const styles = [];
    for (const w of words) {
        const s = STYLE_MAP[w];
        if (s && !styles.includes(s)) styles.push(s);
    }

    if (!colours.length) {
        for (const s of styles) {
            if (STYLE_DEFAULTS[s]) { colours = STYLE_DEFAULTS[s]; break; }
        }
    }
    if (!colours.length) colours = [[118,75,162],[30,30,50],[157,125,217]];

    const primary   = colours[0];
    const secondary = colours[1] || darken(primary, 0.6);
    const accent    = colours[2] || lighten(primary, 1.6).map(v => Math.min(255,v));

    const labelMatch = prompt.match(/"([^"]+)"/) || prompt.match(/'([^']+)'/);
    let label = labelMatch ? labelMatch[1].toUpperCase() : null;
    if (!label) {
        for (const s of styles) {
            if (STYLE_LABELS[s]) { label = STYLE_LABELS[s]; break; }
        }
    }

    return { primary, secondary, accent, allColours: colours, styles, label, rainbow };
}

function drawGradientRect(ctx, x1, y1, x2, y2, c1, c2, vertical=true) {
    const steps = vertical ? (y2-y1) : (x2-x1);
    for (let i = 0; i < steps; i++) {
        const t = i / Math.max(steps-1,1);
        const c = blend(c1, c2, t);
        ctx.fillStyle = rgb(c);
        if (vertical) ctx.fillRect(x1, y1+i, x2-x1, 1);
        else ctx.fillRect(x1+i, y1, 1, y2-y1);
    }
}

function drawStripes(ctx, x1, y1, x2, y2, colours, w=22) {
    let x = x1, i = 0;
    while (x < x2) {
        ctx.fillStyle = rgb(colours[i % colours.length]);
        ctx.fillRect(x, y1, Math.min(w, x2-x), y2-y1);
        x += w; i++;
    }
}

function drawCamo(ctx, x1, y1, x2, y2, colours) {
    ctx.fillStyle = rgb(colours[0]);
    ctx.fillRect(x1, y1, x2-x1, y2-y1);
    const seed = 42;
    let r = seed;
    function rand() { r = (r * 1664525 + 1013904223) & 0xffffffff; return (r >>> 0) / 4294967296; }
    for (let i = 0; i < 55; i++) {
        const cx = x1 + rand()*(x2-x1);
        const cy = y1 + rand()*(y2-y1);
        const rw = 10 + rand()*35;
        const rh = 5 + rand()*18;
        const col = colours[1 + Math.floor(rand()*(colours.length-1))] || colours[0];
        ctx.fillStyle = rgb(col);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, rh, rand()*Math.PI, 0, Math.PI*2);
        ctx.fill();
    }
}

function drawGalaxy(ctx, x1, y1, x2, y2, primary, accent) {
    drawGradientRect(ctx, x1, y1, x2, y2, primary, darken(primary, 0.3));
    let r = 7;
    function rand() { r = (r*1664525+1013904223)&0xffffffff; return (r>>>0)/4294967296; }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 120; i++) {
        const sx = x1 + rand()*(x2-x1);
        const sy = y1 + rand()*(y2-y1);
        const ss = 0.5 + rand()*2;
        ctx.beginPath();
        ctx.arc(sx, sy, ss, 0, Math.PI*2);
        ctx.fill();
    }
    const nb = blend(accent, [255,255,255], 0.35);
    for (let i = 0; i < 4; i++) {
        const nx = x1 + rand()*(x2-x1);
        const ny = y1 + rand()*(y2-y1);
        const nr = 15 + rand()*35;
        ctx.fillStyle = `rgba(${nb[0]},${nb[1]},${nb[2]},0.18)`;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, Math.PI*2);
        ctx.fill();
    }
}

function drawNeon(ctx, x1, y1, x2, y2, colours) {
    ctx.fillStyle = 'rgb(5,5,15)';
    ctx.fillRect(x1, y1, x2-x1, y2-y1);
    let r = 99;
    function rand() { r=(r*1664525+1013904223)&0xffffffff; return (r>>>0)/4294967296; }
    for (let i = 0; i < 8; i++) {
        ctx.strokeStyle = rgb(colours[i % colours.length]);
        ctx.lineWidth = 2;
        ctx.shadowColor = rgb(colours[i % colours.length]);
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(x1, y1 + rand()*(y2-y1));
        ctx.lineTo(x2, y1 + rand()*(y2-y1));
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
}

function drawFloral(ctx, x1, y1, x2, y2, colours) {
    const bg = lighten(colours[0], 1.9).map(v => Math.min(255,v));
    ctx.fillStyle = rgb(bg);
    ctx.fillRect(x1, y1, x2-x1, y2-y1);
    let r = 33;
    function rand() { r=(r*1664525+1013904223)&0xffffffff; return (r>>>0)/4294967296; }
    for (let i = 0; i < 14; i++) {
        const cx = x1 + rand()*(x2-x1);
        const cy = y1 + rand()*(y2-y1);
        const pr = 8 + rand()*14;
        const pc = colours[Math.floor(rand()*colours.length)];
        for (let a = 0; a < 8; a++) {
            const ang = (a/8)*Math.PI*2;
            ctx.fillStyle = rgb(pc);
            ctx.beginPath();
            ctx.ellipse(cx+Math.cos(ang)*pr, cy+Math.sin(ang)*pr, 5, 3, ang, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.fillStyle = 'rgb(255,220,0)';
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI*2);
        ctx.fill();
    }
}

function renderRegion(ctx, x1, y1, x2, y2, info) {
    const { primary, secondary, accent, allColours, styles } = info;
    const cols = allColours.length ? allColours : [primary, secondary, accent];
    if (styles.includes('stripe')) drawStripes(ctx, x1, y1, x2, y2, cols);
    else if (styles.includes('camo')) drawCamo(ctx, x1, y1, x2, y2, cols);
    else if (styles.includes('galaxy') || styles.includes('space')) drawGalaxy(ctx, x1, y1, x2, y2, primary, accent);
    else if (styles.includes('neon') || styles.includes('cyber')) drawNeon(ctx, x1, y1, x2, y2, cols);
    else if (styles.includes('floral')) drawFloral(ctx, x1, y1, x2, y2, cols);
    else drawGradientRect(ctx, x1, y1, x2, y2, primary, secondary);
}

function drawDecorations(ctx, regions, info) {
    const { styles, accent } = info;
    const [fx1,fy1,fx2,fy2] = regions.front;
    const cx = Math.round((fx1+fx2)/2), cy = Math.round((fy1+fy2)/2);
    ctx.fillStyle = rgb(accent);
    ctx.strokeStyle = rgb(accent);
    ctx.lineWidth = 3;
    if (styles.includes('gaming')) {
        ctx.fillRect(cx-4, cy-22, 8, 44);
        ctx.fillRect(cx-22, cy-4, 44, 8);
    } else if (styles.includes('ninja') || styles.includes('warrior')) {
        ctx.beginPath();
        ctx.moveTo(fx1+18, fy1+18); ctx.lineTo(fx2-18, fy2-18);
        ctx.moveTo(fx2-18, fy1+18); ctx.lineTo(fx1+18, fy2-18);
        ctx.stroke();
    } else if (styles.includes('fire')) {
        ctx.fillStyle = 'rgb(255,100,0)';
        ctx.beginPath();
        ctx.moveTo(cx, fy1+28); ctx.lineTo(cx-30, fy2-48); ctx.lineTo(cx+30, fy2-48);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgb(255,220,0)';
        ctx.beginPath();
        ctx.moveTo(cx, fy1+48); ctx.lineTo(cx-18, fy2-68); ctx.lineTo(cx+18, fy2-68);
        ctx.closePath(); ctx.fill();
    } else if (styles.includes('ice')) {
        ctx.strokeStyle = 'rgb(186,230,253)';
        ctx.lineWidth = 2.5;
        for (let a = 0; a < 6; a++) {
            const rad = (a/6)*Math.PI;
            ctx.beginPath();
            ctx.moveTo(cx+Math.cos(rad)*36, cy+Math.sin(rad)*36);
            ctx.lineTo(cx-Math.cos(rad)*36, cy-Math.sin(rad)*36);
            ctx.stroke();
        }
    } else if (styles.includes('dragon')) {
        ctx.fillStyle = rgb(accent);
        ctx.beginPath();
        ctx.moveTo(cx, cy-26); ctx.lineTo(cx+22, cy); ctx.lineTo(cx, cy+26); ctx.lineTo(cx-22, cy);
        ctx.closePath(); ctx.fill();
    } else if (styles.includes('galaxy') || styles.includes('space')) {
        ctx.strokeStyle = rgb(lighten(accent, 1.4).map(v => Math.min(255,v)));
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI*2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI*2);
        ctx.stroke();
    } else if (styles.includes('minimal') || styles.includes('clean')) {
        const mid = Math.round((fy1+fy2)/2);
        ctx.strokeStyle = rgb(accent);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fx1+20, mid); ctx.lineTo(fx2-20, mid);
        ctx.stroke();
    } else if (styles.includes('anime')) {
        ctx.fillStyle = rgb(accent);
        ctx.beginPath();
        ctx.moveTo(cx, cy-24); ctx.lineTo(cx+20, cy+12); ctx.lineTo(cx-20, cy+12);
        ctx.closePath(); ctx.fill();
    }
}

function drawLabel(ctx, regions, info) {
    const { label, accent } = info;
    if (!label) return;
    const [fx1,fy1,fx2,fy2] = regions.front;
    const textX = Math.round((fx1+fx2)/2);
    const textY = fy2 - 42;
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(${darken(accent,0.3).join(',')},0.8)`;
    ctx.fillText(label, textX+2, textY+2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(label, textX, textY);
}

function generateShirtCanvas(prompt) {
    const W = 585, H = 559;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const info = analysePrompt(prompt);

    ctx.fillStyle = 'rgb(35,35,45)';
    ctx.fillRect(0, 0, W, H);

    const regions = {
        front:        [131, 82, 258, 332],
        back:         [267, 82, 394, 332],
        left_sleeve:  [6,   83, 131, 217],
        right_sleeve: [394, 83, 524, 217],
        collar:       [131, 46, 258,  82]
    };

    for (const [, box] of Object.entries(regions)) {
        renderRegion(ctx, box[0], box[1], box[2], box[3], info);
    }

    const outlineCol = rgb(darken(info.primary, 0.65));
    ctx.strokeStyle = outlineCol;
    ctx.lineWidth = 1;
    for (const [, box] of Object.entries(regions)) {
        ctx.strokeRect(box[0], box[1], box[2]-box[0], box[3]-box[1]);
    }

    drawDecorations(ctx, regions, info);
    drawLabel(ctx, regions, info);

    ctx.fillStyle = 'rgba(180,140,240,0.7)';
    ctx.font = '10px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('PSAI-Canvas-v1.0', 5, H-4);

    return canvas;
}

function addShirtMessage(prompt, canvas, styleInfo) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message-bubble p-4 px-6 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm bg-[#15151c] border border-[#252530] mr-auto flex flex-col gap-3';

    const styles = styleInfo.styles.length ? styleInfo.styles.map(s => s.charAt(0).toUpperCase()+s.slice(1)).join(', ') : 'Custom';
    const textDiv = document.createElement('div');
    textDiv.textContent = `✅ Shirt generated! Style: ${styles}`;
    wrapper.appendChild(textDiv);

    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.style.cssText = 'max-width:300px;border-radius:8px;border:1px solid #333355;margin-top:4px;';
    wrapper.appendChild(img);

    const dlBtn = document.createElement('button');
    dlBtn.textContent = '⬇ Download Shirt Template';
    dlBtn.style.cssText = 'margin-top:4px;padding:6px 14px;background:#4f46e5;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600;width:fit-content;';
    dlBtn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        const ts = new Date().toISOString().replace(/[:.]/g,'').slice(0,15);
        a.download = `shirt_${ts}.png`;
        a.click();
    });
    wrapper.appendChild(dlBtn);

    chatArea.appendChild(wrapper);
    gsap.to(wrapper, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' });
    chatArea.scrollTop = chatArea.scrollHeight;
}

gsap.set(sidebar, { x: '-100%' });

sidebarToggleBtn.addEventListener('click', () => {
    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
        gsap.to(sidebar, { x: '0%', duration: 0.5, ease: 'power3.out' });
        toggleIcon.innerHTML = '<path d="M15 18l-6-6 6-6"/>';
    } else {
        gsap.to(sidebar, { x: '-100%', duration: 0.4, ease: 'power3.in' });
        toggleIcon.innerHTML = '<path d="M9 18l6-6-6-6"/>';
    }
});

function transitionToChat() {
    if (!isMoved) {
        gsap.to(inputContainer, { top: 'auto', bottom: '40px', y: 0, duration: 0.7, ease: 'power4.out' });
        gsap.to(suggestionsContainer, {
            opacity: 0, duration: 0.3,
            onComplete: () => { suggestionsContainer.style.display = 'none'; }
        });
        isMoved = true;
    }
}

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && chatInput.value.trim() !== '') {
        transitionToChat();
        const userText = chatInput.value.trim();
        addMessage(userText, 'user');
        addToHistory(userText);
        chatInput.value = '';
        setTimeout(() => handleMessage(userText), 600);
    }
});

suggestionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        let text = e.target.innerText.trim();
        if (text.endsWith('..')) text = text.slice(0, -2).trim();
        if (text.endsWith('...')) text = text.slice(0, -3).trim();
        if (text.startsWith('🎨')) {
            setModel('PSAI-Canvas-v1.0');
        }
        chatInput.value = text.replace('🎨 ', '');
        transitionToChat();
        chatInput.focus();
    });
});

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message-bubble p-4 px-6 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm ${sender === 'user' ? 'bg-[#20202a] ml-auto border border-[#303040]' : 'bg-[#15151c] border border-[#252530] mr-auto'}`;

    const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/g;
    let lastIndex = 0, match, hasCode = false;
    const parts = [];
    while ((match = codeBlockRegex.exec(text)) !== null) {
        hasCode = true;
        if (match.index > lastIndex) parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        parts.push({ type: 'code', content: match[1].trim() });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push({ type: 'text', content: text.slice(lastIndex) });

    if (hasCode) {
        for (const part of parts) {
            if (part.type === 'text' && part.content.trim()) {
                const p = document.createElement('p');
                p.textContent = part.content;
                p.style.marginBottom = '8px';
                div.appendChild(p);
            } else if (part.type === 'code') {
                const codeBlock = document.createElement('div');
                codeBlock.className = 'code-block relative';
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.textContent = part.content;
                pre.appendChild(code);
                codeBlock.appendChild(pre);
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-btn';
                copyBtn.textContent = 'Copy';
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(part.content);
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => copyBtn.textContent = 'Copy', 1500);
                });
                codeBlock.appendChild(copyBtn);
                div.appendChild(codeBlock);
            }
        }
    } else {
        div.textContent = text;
    }

    chatArea.appendChild(div);
    gsap.to(div, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' });
    chatArea.scrollTop = chatArea.scrollHeight;
}

function showThinkingIndicator() {
    const div = document.createElement('div');
    div.id = 'thinkingIndicator';
    div.className = 'message-bubble p-4 px-6 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm bg-[#15151c] border border-[#252530] mr-auto';
    div.innerHTML = '<span class="animate-pulse">PrysmisAI is thinking...</span>';
    chatArea.appendChild(div);
    gsap.to(div, { opacity: 1, y: 0, duration: 0.3 });
    chatArea.scrollTop = chatArea.scrollHeight;
    return div;
}

function removeThinkingIndicator(el) {
    if (el && el.parentNode === chatArea) chatArea.removeChild(el);
}

async function handleMessage(query) {
    if (currentModel === 'PSAI-Canvas-v1.0') {
        const thinking = showThinkingIndicator();
        await new Promise(r => setTimeout(r, 200));
        removeThinkingIndicator(thinking);
        const info = analysePrompt(query);
        const canvas = generateShirtCanvas(query);
        addShirtMessage(query, canvas, info);
        return;
    }
    await getAIResponse(query);
}

async function getAIResponse(query) {
    const thinking = showThinkingIndicator();
    const fallback = getSmartFallback(query);

    psaiClient.configure({
        endpoint: userData.apiConfig?.endpoint || PrysmisAI.defaultEndpoint,
        auth: userData.apiConfig?.authHeader || ('Bearer sk-prysmis-prod-95fZe5PBGA7ErrKSL9dW3OjweOtioFQI'),
        model: userData.apiConfig?.model || PrysmisAI.modelId,
        temperature: parseFloat(userData.apiConfig?.temperature || 0.7),
        maxTokens: parseInt(userData.apiConfig?.maxTokens || 1024),
        systemPrompt: userData.customInstructions || PrysmisAI.systemPrompt
    });

    try {
        const result = await psaiClient.chat(query);
        removeThinkingIndicator(thinking);
        if (result && result.text) {
            addMessage(result.text, 'ai');
        } else if (fallback) {
            addMessage(fallback, 'ai');
        } else {
            addMessage('PSAI-v1.0 returned an empty response. Please try again.', 'ai');
        }
    } catch (err) {
        removeThinkingIndicator(thinking);
        if (fallback) {
            addMessage(fallback, 'ai');
            return;
        }
        const lower = query.toLowerCase().trim();
        if (lower === 'hi' || lower === 'hello' || lower === 'hey' || lower === 'yo') {
            addMessage('Hello! I am PrysmisAI (PSAI-v1.0), your Roblox coding assistant. How can I help you program today?', 'ai');
        } else {
            addMessage(`PSAI-v1.0 is temporarily unavailable. Error: ${err.message || 'connection failed'}`, 'ai');
        }
    }
}

function setModel(model) {
    currentModel = model;
    const labelEl = document.getElementById('modelDropdownLabel');
    if (labelEl) labelEl.textContent = model;
    const codingBadge = document.getElementById('codingActiveBadge');
    const canvasBadge = document.getElementById('canvasActiveBadge');
    const codingBtn = document.getElementById('selectCodingModel');
    const canvasBtn = document.getElementById('selectCanvasModel');
    if (model === 'PSAI-v1.0') {
        if (codingBadge) codingBadge.classList.remove('hidden');
        if (canvasBadge) canvasBadge.classList.add('hidden');
        if (codingBtn) codingBtn.classList.replace('bg-[#1a1a22]', 'bg-[#1e1e28]');
        if (canvasBtn) canvasBtn.classList.replace('bg-[#1e1e28]', 'bg-[#1a1a22]');
        chatInput.placeholder = 'Ask PrysmisAI anything..';
    } else {
        if (codingBadge) codingBadge.classList.add('hidden');
        if (canvasBadge) canvasBadge.classList.remove('hidden');
        if (canvasBtn) canvasBtn.classList.replace('bg-[#1a1a22]', 'bg-[#1e1e28]');
        if (codingBtn) codingBtn.classList.replace('bg-[#1e1e28]', 'bg-[#1a1a22]');
        chatInput.placeholder = 'Describe your shirt design (e.g. blue galaxy gaming shirt)..';
    }
    modelDropdown.classList.add('hidden');
}

selectCodingModel.addEventListener('click', () => setModel('PSAI-v1.0'));
selectCanvasModel.addEventListener('click', () => setModel('PSAI-Canvas-v1.0'));

function addToHistory(text) {
    const div = document.createElement('div');
    div.className = 'history-item text-sm text-gray-300 cursor-pointer hover:bg-[#1a1a24] hover:text-white p-3 rounded-xl transition-all border border-transparent hover:border-[#2d2d3a] relative break-words flex flex-col';
    const textSpan = document.createElement('span');
    textSpan.className = 'history-text truncate w-full pointer-events-none';
    textSpan.innerText = text;
    div.appendChild(textSpan);
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        activeHistoryItem = div;
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.classList.remove('hidden');
        requestAnimationFrame(() => contextMenu.classList.add('context-menu-active'));
    });
    historyContainer.appendChild(div);
}

newChatBtn.addEventListener('click', () => {
    chatArea.innerHTML = '';
    gsap.to(inputContainer, { bottom: 'auto', top: '50%', y: '-50%', duration: 0.7, ease: 'power4.inOut' });
    suggestionsContainer.style.display = 'flex';
    gsap.to(suggestionsContainer, { opacity: 1, duration: 0.5 });
    isMoved = false;
    if (sidebarOpen) sidebarToggleBtn.click();
});

document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) closeContextMenu();
    if (!modelDropdown.contains(e.target) && !modelDropdownBtn.contains(e.target)) {
        modelDropdown.classList.add('hidden');
    }
});

function closeContextMenu() {
    contextMenu.classList.remove('context-menu-active');
    setTimeout(() => contextMenu.classList.add('hidden'), 150);
}

deleteBtn.addEventListener('click', () => {
    if (activeHistoryItem) {
        gsap.to(activeHistoryItem, { opacity: 0, x: -20, duration: 0.3, onComplete: () => { activeHistoryItem.remove(); activeHistoryItem = null; } });
    }
    closeContextMenu();
});

renameBtn.addEventListener('click', () => {
    if (!activeHistoryItem) return;
    const textSpan = activeHistoryItem.querySelector('.history-text');
    if (!textSpan) return;
    const currentText = textSpan.innerText;
    activeHistoryItem.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'w-full bg-[#0a0a0d] border border-[#353545] text-gray-100 p-2 rounded-lg focus:outline-none focus:border-indigo-500 text-sm mb-2 shadow-inner';
    const saveBtn = document.createElement('button');
    saveBtn.innerText = 'Save';
    saveBtn.className = 'w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 rounded-lg transition-colors font-semibold';
    activeHistoryItem.appendChild(input);
    activeHistoryItem.appendChild(saveBtn);
    input.focus();
    const saveNewName = () => {
        const newName = input.value.trim() || currentText;
        activeHistoryItem.innerHTML = '';
        const newTextSpan = document.createElement('span');
        newTextSpan.className = 'history-text truncate w-full pointer-events-none';
        newTextSpan.innerText = newName;
        activeHistoryItem.appendChild(newTextSpan);
    };
    saveBtn.addEventListener('click', (e) => { e.stopPropagation(); saveNewName(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveNewName(); });
    input.addEventListener('click', (e) => e.stopPropagation());
    closeContextMenu();
});

modelDropdownBtn.addEventListener('click', () => modelDropdown.classList.toggle('hidden'));

imageUploadBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    uploadedImages.push(ev.target.result);
                    addImagePreview(ev.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

function addImagePreview(imageData) {
    imagePreviewContainer.classList.remove('hidden');
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    const img = document.createElement('img');
    img.src = imageData;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', () => {
        const index = uploadedImages.indexOf(imageData);
        if (index > -1) uploadedImages.splice(index, 1);
        preview.remove();
        if (uploadedImages.length === 0) imagePreviewContainer.classList.add('hidden');
    });
    preview.appendChild(img);
    preview.appendChild(removeBtn);
    imagePreviewContainer.appendChild(preview);
}

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    settingsModal.classList.add('flex');
    loadUserData();
});
closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    settingsModal.classList.remove('flex');
});

tabAiBtn.addEventListener('click', () => setActiveTab('ai'));
tabConfigBtn.addEventListener('click', () => setActiveTab('config'));
tabUserBtn.addEventListener('click', () => setActiveTab('user'));

function setActiveTab(tab) {
    [tabAiBtn, tabConfigBtn, tabUserBtn].forEach(btn => {
        btn.className = 'text-left px-4 py-3 text-gray-400 hover:bg-[#15151c] hover:text-white rounded-xl text-sm font-semibold transition-colors';
    });
    [tabAiContent, tabConfigContent, tabUserContent].forEach(content => content.classList.add('hidden'));
    if (tab === 'ai') {
        tabAiBtn.className = 'text-left px-4 py-3 bg-[#1e1e28] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm';
        tabAiContent.classList.remove('hidden');
    } else if (tab === 'config') {
        tabConfigBtn.className = 'text-left px-4 py-3 bg-[#1e1e28] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm';
        tabConfigContent.classList.remove('hidden');
    } else if (tab === 'user') {
        tabUserBtn.className = 'text-left px-4 py-3 bg-[#1e1e28] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm';
        tabUserContent.classList.remove('hidden');
    }
}

googleSignInBtn.addEventListener('click', () => {
    window.location.href = '/auth/google';
});

saveUsernameBtn.addEventListener('click', () => {
    const el = document.getElementById('usernameInput');
    if (el) {
        userData.username = el.value;
        saveUsernameBtn.innerText = 'Saving...';
        saveUserData();
        setTimeout(() => {
            saveUsernameBtn.innerText = 'Saved!';
            setTimeout(() => { saveUsernameBtn.innerText = 'Save'; }, 1500);
        }, 500);
    }
});

saveAllBtn.addEventListener('click', () => {
    const fields = { customInstructions:'customInstructions', apiEndpoint:'apiEndpoint', apiKeyInput:'apiKeyInput', apiModel:'apiModel', apiTemperature:'apiTemperature', apiMaxTokens:'apiMaxTokens', authHeader:'authHeader', contentType:'contentType', usernameInput:'usernameInput' };
    const customEl = document.getElementById('customInstructions');
    if (customEl) userData.customInstructions = customEl.value;
    userData.apiConfig = userData.apiConfig || {};
    const ae = document.getElementById('apiEndpoint'); if (ae) userData.apiConfig.endpoint = ae.value;
    const ak = document.getElementById('apiKeyInput'); if (ak) userData.apiConfig.apiKey = ak.value;
    const am = document.getElementById('apiModel'); if (am) userData.apiConfig.model = am.value;
    const at = document.getElementById('apiTemperature'); if (at) userData.apiConfig.temperature = parseFloat(at.value);
    const ax = document.getElementById('apiMaxTokens'); if (ax) userData.apiConfig.maxTokens = parseInt(ax.value);
    const ah = document.getElementById('authHeader'); if (ah) userData.apiConfig.authHeader = ah.value;
    const un = document.getElementById('usernameInput'); if (un) userData.username = un.value;
    saveUserData();
    const orig = saveAllBtn.innerText;
    saveAllBtn.innerText = 'Saving...';
    setTimeout(() => {
        saveAllBtn.innerText = 'Saved!';
        saveAllBtn.classList.add('bg-emerald-600');
        saveAllBtn.classList.remove('bg-indigo-600');
        setTimeout(() => {
            saveAllBtn.innerText = orig;
            saveAllBtn.classList.remove('bg-emerald-600');
            saveAllBtn.classList.add('bg-indigo-600');
        }, 2000);
    }, 500);
});

function loadUserData() {
    const urlParams = new URLSearchParams(window.location.search);
    const loginStatus = urlParams.get('login');
    const loginName = urlParams.get('name');
    
    let saved = localStorage.getItem('prysmisUserData');
    if (saved) {
        userData = JSON.parse(saved);
    }

    if (loginStatus === 'success' && loginName) {
        userData.isLoggedIn = true;
        userData.username = loginName;
        saveUserData();

        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const ci = document.getElementById('customInstructions'); if (ci) ci.value = userData.customInstructions || '';
    const un = document.getElementById('usernameInput'); if (un) un.value = userData.username || 'UlesRamirez';
    const ae = document.getElementById('apiEndpoint'); if (ae) ae.value = userData.apiConfig?.endpoint || 'https://codeit.rest/v1/chat/completions';
    const ak = document.getElementById('apiKeyInput'); if (ak) ak.value = userData.apiConfig?.apiKey || '';
    const am = document.getElementById('apiModel'); if (am) am.value = userData.apiConfig?.model || 'prysmis-1';
    const at = document.getElementById('apiTemperature'); if (at) at.value = userData.apiConfig?.temperature || 0.7;
    const ax = document.getElementById('apiMaxTokens'); if (ax) ax.value = userData.apiConfig?.maxTokens || 1024;
    const ah = document.getElementById('authHeader'); if (ah) ah.value = userData.apiConfig?.authHeader || 'Bearer sk-prysmis-prod-95fZe5PBGA7ErrKSL9dW3OjweOtioFQI';
    if (userData.isLoggedIn) { loggedOutState.classList.add('hidden'); loggedInState.classList.remove('hidden'); }
    if (userData.apiKeys) {
        apiKeyList.innerHTML = '';
        userData.apiKeys.forEach(key => appendKeyToList(key));
    }
}

function saveUserData() {
    localStorage.setItem('prysmisUserData', JSON.stringify(userData));
}

openCreateKeyBtn.addEventListener('click', () => {
    newKeyNameInput.value = '';
    createKeyModal.classList.remove('hidden');
    createKeyModal.classList.add('flex');
});
cancelCreateKeyBtn.addEventListener('click', () => {
    createKeyModal.classList.add('hidden');
    createKeyModal.classList.remove('flex');
});

function generateAPIKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sk-prysmis-';
    for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
}

function appendKeyToList(keyString) {
    const row = document.createElement('div');
    row.className = 'bg-[#16161d] border border-[#252530] rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-sm';
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'flex-1 bg-[#0a0a0d] rounded-lg px-3 py-2.5 border border-[#22222c]';
    const input = document.createElement('input');
    input.type = 'password';
    input.value = keyString;
    input.className = 'w-full bg-transparent border-none outline-none text-sm text-indigo-100 font-mono tracking-wider pointer-events-none';
    input.readOnly = true;
    inputWrapper.appendChild(input);
    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'flex items-center gap-2.5';
    const showBtn = document.createElement('button');
    showBtn.innerText = 'Show API';
    showBtn.className = 'px-4 py-2.5 text-xs font-semibold bg-[#1e1e28] text-white border border-[#353545] rounded-lg hover:bg-[#252532] transition-colors w-24 text-center';
    const copyBtn = document.createElement('button');
    copyBtn.innerText = 'Copy API';
    copyBtn.className = 'px-4 py-2.5 text-xs font-semibold bg-[#1e1e28] text-white border border-[#353545] rounded-lg hover:bg-[#252532] transition-colors';
    showBtn.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
        showBtn.innerText = input.type === 'password' ? 'Show API' : 'Hide API';
    });
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(keyString);
        copyBtn.innerText = 'Copied!';
        setTimeout(() => copyBtn.innerText = 'Copy API', 1500);
    });
    btnWrapper.appendChild(showBtn);
    btnWrapper.appendChild(copyBtn);
    row.appendChild(inputWrapper);
    row.appendChild(btnWrapper);
    apiKeyList.appendChild(row);
}

confirmCreateKeyBtn.addEventListener('click', () => {
    createKeyModal.classList.add('hidden');
    createKeyModal.classList.remove('flex');
    const newKey = generateAPIKey();
    generatedKeyDisplayModal.value = newKey;
    userData.apiKeys = userData.apiKeys || [];
    userData.apiKeys.push(newKey);
    appendKeyToList(newKey);
    saveUserData();
    showKeyModal.classList.remove('hidden');
    showKeyModal.classList.add('flex');
});

copyModalKeyBtn.addEventListener('click', () => navigator.clipboard.writeText(generatedKeyDisplayModal.value));
doneKeyBtn.addEventListener('click', () => { showKeyModal.classList.add('hidden'); showKeyModal.classList.remove('flex'); });

testApiBtn.addEventListener('click', async () => {
    const ae = document.getElementById('apiEndpoint');
    const ak = document.getElementById('apiKeyInput');
    const am = document.getElementById('apiModel');
    const at = document.getElementById('apiTemperature');
    const ax = document.getElementById('apiMaxTokens');
    const config = {
        endpoint: ae ? ae.value : '',
        apiKey: ak ? ak.value : '',
        model: am ? am.value : 'prysmis-1',
        temperature: at ? parseFloat(at.value) : 0.7,
        maxTokens: ax ? parseInt(ax.value) : 1024
    };
    testApiBtn.disabled = true;
    testApiBtn.innerText = 'Testing...';
    try {
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: 'Hello' }], temperature: config.temperature, max_tokens: config.maxTokens })
        });
        testApiBtn.innerText = response.ok ? 'Connected!' : 'Failed';
        testApiBtn.classList.add(response.ok ? 'bg-emerald-600' : 'bg-rose-600');
        setTimeout(() => {
            testApiBtn.innerText = 'Test Connection';
            testApiBtn.classList.remove('bg-emerald-600', 'bg-rose-600');
        }, 2000);
    } catch {
        testApiBtn.innerText = 'Error';
        testApiBtn.classList.add('bg-rose-600');
        setTimeout(() => { testApiBtn.innerText = 'Test Connection'; testApiBtn.classList.remove('bg-rose-600'); }, 2000);
    }
    testApiBtn.disabled = false;
});

const terminalToggleBtn = safeGetElement('terminalToggleBtn');
const terminalPanel = safeGetElement('terminalPanel');
const clearTerminalBtn = safeGetElement('clearTerminalBtn');
const terminalOutput = safeGetElement('terminalOutput');
const terminalInput = safeGetElement('terminalInput');

terminalToggleBtn.addEventListener('click', () => {
    terminalPanel.classList.toggle('hidden');
    if (!terminalPanel.classList.contains('hidden')) {
        terminalInput.focus();
    }
});

clearTerminalBtn.addEventListener('click', () => {
    terminalOutput.innerHTML = '';
});

const mockFilesystem = {
    'packages': ['lucide-icons', 'three', 'gsap', 'canvas-confetti'],
    'installed': []
};

function writeTerminalLine(text, type = 'info') {
    const div = document.createElement('div');
    if (type === 'error') {
        div.className = 'text-rose-500';
    } else if (type === 'success') {
        div.className = 'text-emerald-400';
    } else if (type === 'cmd') {
        div.className = 'text-indigo-400';
    } else {
        div.className = 'text-gray-300';
    }
    div.textContent = text;
    terminalOutput.appendChild(div);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

terminalInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        const cmdText = terminalInput.value.trim();
        terminalInput.value = '';
        if (!cmdText) return;

        writeTerminalLine(`$ ${cmdText}`, 'cmd');

        const parts = cmdText.split(' ');
        const mainCmd = parts[0].toLowerCase();

        switch (mainCmd) {
            case 'clear':
                terminalOutput.innerHTML = '';
                break;
            case 'help':
                writeTerminalLine('Available commands:');
                writeTerminalLine('  help                    Show this guide');
                writeTerminalLine('  clear                   Clear terminal screen');
                writeTerminalLine('  npm install [package]   Simulate installing front-end packages');
                writeTerminalLine('  npm list                List installed packages');
                writeTerminalLine('  ai info                 Query active model status info');
                break;
            case 'npm':
                if (parts[1] === 'install') {
                    const pkg = parts[2];
                    if (!pkg) {
                        writeTerminalLine('Error: Please specify a package to install. E.g. npm install gsap', 'error');
                    } else {
                        writeTerminalLine(`Installing ${pkg}...`);
                        await new Promise(r => setTimeout(r, 1200));
                        if (!mockFilesystem.installed.includes(pkg)) {
                            mockFilesystem.installed.push(pkg);
                        }
                        writeTerminalLine(`Added ${pkg} successfully to project dependencies.`, 'success');
                    }
                } else if (parts[1] === 'list') {
                    if (mockFilesystem.installed.length === 0) {
                        writeTerminalLine('No extra packages installed.');
                    } else {
                        writeTerminalLine('Installed packages:');
                        mockFilesystem.installed.forEach(p => writeTerminalLine(`  - ${p}`, 'success'));
                    }
                } else {
                    writeTerminalLine(`Unknown npm command option: ${parts[1] || ''}`, 'error');
                }
                break;
            case 'ai':
                if (parts[1] === 'info') {
                    writeTerminalLine(`Active Model: ${currentModel}`);
                    writeTerminalLine(`API Mode: Direct Hugging Face Inference`);
                    writeTerminalLine(`Backend Server Status: healthy (mocked client-side)`);
                } else {
                    writeTerminalLine('Usage: ai info', 'error');
                }
                break;
            default:
                writeTerminalLine(`Unknown command: ${mainCmd}. Type 'help' for command list.`, 'error');
                break;
        }
    }
});
