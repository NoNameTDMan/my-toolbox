/*
 * 粘土クリッカー / Clay Clicker
 * Version: 0.1.0 (2026-11-13)
 * Author: Prototype design team (仮)
 * Standalone top-level page; safe for embedding as My Toolbox PWA game.
 * Saving: clay-clicker-save-v1 and clay-clicker-save-v1-last-good only.
 */
'use strict';
(() => {
  const VERSION = '0.1.0';
  const SAVE_KEY = 'clay-clicker-save-v1';
  const BACKUP_KEY = 'clay-clicker-save-v1-last-good';
  const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
  const RATIO = 9;

  const TIER_NAMES = [
    '粘土','圧縮粘土','二重圧縮粘土','高密度圧縮粘土','超高密度粘土',
    '結晶粘土','強化結晶粘土','ナノ粘土','分子粘土','原子粘土',
    '量子粘土','超伝導粘土','プラズマ粘土','中性子粘土','星核粘土',
    '超新星粘土','重力凝縮粘土','特異点粘土','ブラックホール粘土',
    '暗黒物質粘土','負質量粘土','反粘土','反物質原鉱','高純度反物質','純反物質'
  ];
  const TIERS = TIER_NAMES.map((name, level) => ({ name, level, factor: RATIO ** level }));
  const FACILITIES = [
    ['スコップ',15,0.1,'╱','手作業で少しずつ採掘'],
    ['採掘ドローン',100,1,'◇','小型ドローンで自動採掘'],
    ['粘土採掘場',1100,8,'▤','地表から粘土を掘り出す'],
    ['圧縮工場',12000,47,'▣','土塊を高速プレス'],
    ['地中探査機',130000,260,'⌁','地下資源を見つけ出す'],
    ['採掘都市',1.4e6,1400,'▥','町全体で粘土を生産'],
    ['地殻穿孔機',2e7,7800,'⇣','地殻まで届く巨大ドリル'],
    ['ナノ採掘機',3.3e8,44000,'⁙','ナノマシンが採掘を分担'],
    ['分子増殖槽',5.1e9,260000,'▦','分子レベルで粘土を増やす'],
    ['量子複製機',7.5e10,1.6e6,'✣','量子的に粘土を複製'],
    ['時空採掘装置',1.1e12,1e7,'◎','別時空から粘土を採掘'],
    ['恒星精製炉',1.7e13,6.5e7,'✦','星のエネルギーで精製'],
    ['重力圧縮核',2.6e14,4e8,'◈','極限重力で圧縮'],
    ['暗黒物質収集機',4.2e15,2.5e9,'✧','未知の物質を回収'],
    ['反物質合成機',6.6e16,1.7e10,'◉','物質の構造を反転'],
    ['法則再設計装置',1.1e18,1.1e11,'※','生産そのものの法則を変える'],
    ['宇宙創成機',1.8e19,7.2e11,'✳','粘土を産む宇宙を造る'],
    ['真空崩壊炉',2.8e20,5e12,'✺','真空のエネルギーを利用']
  ].map(([name, baseCost, cps, symbol, desc], id) => ({id,name,baseCost,cps,symbol,desc}));

  const FACILITY_MILESTONES = [5,15,30,60];
  const FACILITY_UPGRADE_PRICE = [20,100,500,3500];
  const CLICK_LEVELS = [50,1e3,1e5,1e8,1e12,1e17];
  const GLOBAL_LEVELS = [1e6,1e10,1e15,1e20];
  const UPGRADES = [
    ...FACILITIES.flatMap(f => FACILITY_MILESTONES.map((count,j) => ({
      id:`f-${f.id}-${j}`,kind:'facility',facility:f.id,need:count,
      name:`${f.name} ${['改良','高速化','高効率化','極限改造'][j]}`,
      desc:`${f.name}の生産量 ×2（${count}台所有で解禁）`,cost:f.baseCost*FACILITY_UPGRADE_PRICE[j],symbol:'⬆'
    }))),
    ...CLICK_LEVELS.map((need,j) => ({id:`c-${j}`,kind:'click',need,
      name:`タップ強化 ${j+1}`,desc:'タップによる生産量 ×2',cost:need*.45,symbol:'✦'})),
    ...GLOBAL_LEVELS.map((need,j) => ({id:`g-${j}`,kind:'global',need,
      name:`粘土触媒 ${j+1}`,desc:'すべての施設の生産量 ×1.6',cost:need*.55,symbol:'◆'}))
  ];
  const UPGRADE_BY_ID = new Map(UPGRADES.map(u => [u.id,u]));
  const ACHIEVEMENTS = [
    ['first','はじめのひと押し','粘土を1回タップ',s=>s.clicks>=1],
    ['first-building','工業化の第一歩','施設を1台購入',s=>totalOwned(s)>=1],
    ['ten-buildings','採掘団','施設を合計10台所有',s=>totalOwned(s)>=10],
    ['hundred-buildings','粘土帝国','施設を合計100台所有',s=>totalOwned(s)>=100],
    ['thousand','千の粘土','累計1,000 粘土を生産',s=>s.lifetime>=1e3],
    ['million','百万の粘土','累計100万 粘土を生産',s=>s.lifetime>=1e6],
    ['billion','億を超えて','累計10億 粘土を生産',s=>s.lifetime>=1e9],
    ['quadrillion','惑星規模','累計1,000兆 粘土を生産',s=>s.lifetime>=1e15],
    ['zillion','無限への入口','累計1垓 粘土を生産',s=>s.lifetime>=1e20],
    ['tier-3','圧縮の達人','高密度圧縮粘土に進化',s=>getTier(s.lifetime)>=3],
    ['tier-10','量子の地平線','量子粘土に進化',s=>getTier(s.lifetime)>=10],
    ['tier-final','純粋な到達点','純反物質に進化',s=>getTier(s.lifetime)>=TIERS.length-1]
  ].map(([id,name,desc,test])=>({id,name,desc,test}));

  const $ = (id) => document.getElementById(id);
  const el = {
    amount:$('amount'),tierName:$('tier-name'),rawAmount:$('raw-amount'),cps:$('cps'),clickPower:$('click-power'),
    lifetime:$('lifetime'),tierCounter:$('tier-counter'),tierProgress:$('tier-progress'),tierFill:$('tier-progress-fill'),
    tierProgressLabel:$('tier-progress-label'),nextTier:$('next-tier'),nextTarget:$('next-target'),
    clayButton:$('clay-button'),sprite:$('clay-sprite'),particles:$('particles'),panel:$('panel-content'),
    bonus:$('bonus-clay'),boost:$('boost-banner'),boostTimer:$('boost-timer'),toast:$('toast'),
    saveStatus:$('save-status'),home:$('home-link'),upgradeDot:$('upgrade-dot'),
    shade:$('modal-shade'),modalTitle:$('modal-title'),modalBody:$('modal-body'),modalActions:$('modal-actions'),
    file:$('import-file')
  };
  const now = () => Date.now();
  const freshState = () => ({
    version:1,clay:0,lifetime:0,clicks:0,buildings: Array(FACILITIES.length).fill(0),
    upgrades:[],achievements:[],lastSaved:now(),boostUntil:0,
    bonusAt:now()+45000+Math.round(Math.random()*45000),bonusUntil:0,reducedMotion:false
  });
  let state = freshState();
  let gameLocked = false;
  let volatileMode = false;
  let activeTab = 'buildings';
  let buyAmount = 1;
  let lastFrame = now();
  let lastStatsPaint = 0;
  let lastShopPaint = 0;
  let lastAutosave = 0;
  let toastTimer = null;
  let lastTier = 0;

  function getTier(total) {
    let out = 0;
    while(out < TIERS.length-1 && total >= TIERS[out+1].factor) out++;
    return out;
  }
  function totalOwned(s){return s.buildings.reduce((a,b)=>a+b,0)}
  function formatNumber(n, decimals=2) {
    if (!Number.isFinite(n)) return '—';
    if (n < 0) return `-${formatNumber(-n,decimals)}`;
    if (n === 0) return '0';
    if (n < 1) return n < .001 ? n.toExponential(2).replace('e-','×10^-') : n.toFixed(3).replace(/0+$/,'').replace(/\.$/,'');
    if (n >= 1e24) return n.toExponential(2).replace('e+','×10^');
    const large = [[1e20,'垓'],[1e16,'京'],[1e12,'兆'],[1e8,'億'],[1e4,'万']];
    for (const [size,suffix] of large) {
      if (n>=size) return (n/size).toFixed((n/size >=100 ? 0 : n/size>=10 ? 1 : decimals)).replace(/\.0+$/,'').replace(/(\.\d*[1-9])0+$/,'$1')+suffix;
    }
    return new Intl.NumberFormat('ja-JP',{maximumFractionDigits:n>=100?0:n>=10?1:2}).format(n);
  }
  function formatTierNumber(base,tier) {
    const n = base/TIERS[tier].factor;
    if (n===0) return '0';
    if(n>=1e4)return formatNumber(n);
    if(n>=10)return n.toLocaleString('ja-JP',{maximumFractionDigits:1});
    if(n>=1)return n.toFixed(2).replace(/\.0+$/,'');
    return n>=.001?n.toFixed(3):n.toExponential(2).replace('e-','×10^-');
  }
  function validPayload(raw){
    try {
      const s=JSON.parse(raw);
      if(!s || s.version!==1 || !Number.isFinite(s.clay) || s.clay<0 || !Number.isFinite(s.lifetime)||s.lifetime<0 || s.clay>s.lifetime+0.01 ||
        !Number.isSafeInteger(s.clicks)||s.clicks<0 || !Array.isArray(s.buildings)||s.buildings.length!==FACILITIES.length||
        !s.buildings.every(x=>Number.isSafeInteger(x)&&x>=0&&x<=1e7) || !Array.isArray(s.upgrades)||
        !s.upgrades.every(x=>typeof x==='string'&&UPGRADE_BY_ID.has(x)) || !Array.isArray(s.achievements)||
        !Number.isFinite(s.lastSaved)||s.lastSaved<0) return null;
      s.upgrades=Array.from(new Set(s.upgrades));
      s.achievements=s.achievements.filter(id=>ACHIEVEMENTS.some(a=>a.id===id));
      s.boostUntil=Number.isFinite(s.boostUntil)?s.boostUntil:0;
      s.bonusAt=Number.isFinite(s.bonusAt)?s.bonusAt:now()+60000;
      s.bonusUntil=Number.isFinite(s.bonusUntil)?s.bonusUntil:0;
      s.reducedMotion=!!s.reducedMotion;
      return s;
    }catch{return null}
  }
  function loadSaved(){
    let main=null,backup=null;
    try{main=localStorage.getItem(SAVE_KEY);backup=localStorage.getItem(BACKUP_KEY)}
    catch{volatileMode=true;showToast('ストレージを利用できません。ゲームは遊べますが、セーブはJSONに書き出してください。');return 'volatile'}
    if(!main && !backup)return 'new';
    const parsedMain=main?validPayload(main):null;
    const parsedBack=backup?validPayload(backup):null;
    if(parsedMain||parsedBack){
      state=parsedMain||parsedBack;
      if(!parsedMain)showToast('予備セーブから復旧しました。');
      const age=Math.max(0,Math.min(MAX_OFFLINE_MS,now()-state.lastSaved));
      if(age>5000){
        const income=getCpsAt(state,Math.max(now(),state.boostUntil+1))*age/1000*.25;
        if(Number.isFinite(income)){
          state.clay+=income;state.lifetime+=income;
          const mins=Math.floor(age/60000);
          if(income>0)queueMicrotask(()=>showToast(`オフライン生産：+${formatNumber(income)} 粘土換算（約${mins}分）`));
        }
      }
      state.lastSaved=now();
      return parsedMain?'loaded':'recovered';
    }
    return 'corrupt';
  }
  function save(){
    if(gameLocked)return false;
    if(volatileMode){el.saveStatus.textContent='● 保存不可（JSONで退避）';el.saveStatus.classList.add('warn');return false;}
    try{
      const existing=localStorage.getItem(SAVE_KEY);
      const previousValid=existing?validPayload(existing):null;
      if(previousValid)localStorage.setItem(BACKUP_KEY,existing);
      state.lastSaved=now();
      localStorage.setItem(SAVE_KEY,JSON.stringify(state));
      el.saveStatus.textContent='● セーブ済み';el.saveStatus.classList.remove('warn');
      lastAutosave=now();return true;
    }catch{
      el.saveStatus.textContent='● セーブ失敗';el.saveStatus.classList.add('warn');return false;
    }
  }
  function markDirty(){if(volatileMode){el.saveStatus.textContent='● 保存不可（JSONで退避）';el.saveStatus.classList.add('warn');return;}el.saveStatus.textContent='● オートセーブ';el.saveStatus.classList.remove('warn')}
  function upgradeOwned(id){return state.upgrades.includes(id)}
  function unlockedUpgrade(u,s=state){return u.kind==='facility'?s.buildings[u.facility]>=u.need:s.lifetime>=u.need}
  function getCpsAt(s,t){
    const stage= getTier(s.lifetime);
    let result=0;
    for(const f of FACILITIES){
      if(s.buildings[f.id]===0)continue;
      let mult=1;
      for(let j=0;j<FACILITY_MILESTONES.length;j++)if(s.upgrades.includes(`f-${f.id}-${j}`))mult*=2;
      result+=f.cps*s.buildings[f.id]*mult;
    }
    const globalBonus=GLOBAL_LEVELS.reduce((a,_,j)=>a*(s.upgrades.includes(`g-${j}`)?1.6:1),1);
    const boosted=t<s.boostUntil?7:1;
    return result*Math.pow(1.50,stage)*globalBonus*boosted;
  }
  function getCps(){return getCpsAt(state,now())}
  function getClickPower(){
    let power=Math.pow(2,CLICK_LEVELS.reduce((n,_,j)=>n+(upgradeOwned(`c-${j}`)?1:0),0));
    power *= Math.pow(1.22,getTier(state.lifetime));
    return power;
  }
  function costFor(f,n=1,owned=state.buildings[f.id]){
    const r=1.15;
    return Math.ceil(f.baseCost * Math.pow(r,owned) * (Math.pow(r,n)-1)/(r-1));
  }
  function awardAchievements(silent=false){
    const unlocked=[];
    for(const a of ACHIEVEMENTS){if(!state.achievements.includes(a.id) && a.test(state)){state.achievements.push(a.id);unlocked.push(a)}}
    if(unlocked.length && !silent)showToast(`実績解除：${unlocked[0].name}${unlocked.length>1?` ほか${unlocked.length-1}件`:''}`);
  }
  function gain(amount){if(!Number.isFinite(amount)||amount<=0)return;state.clay+=amount;state.lifetime+=amount;awardAchievements(true);markDirty()}
  function tap(){
    if(gameLocked)return;
    const amount=getClickPower();gain(amount);state.clicks++;
    awardAchievements();
    renderStats();
    if(!state.reducedMotion){
      el.clayButton.classList.add('pressed');setTimeout(()=>el.clayButton.classList.remove('pressed'),75);
      const b=document.createElement('span');b.className='particle';b.textContent=`+${formatNumber(amount)}`;
      b.style.left=`${46+(Math.random()-.5)*37}%`;b.style.top=`${40+(Math.random()-.5)*28}%`;
      b.style.setProperty('--dx',`${Math.round((Math.random()-.5)*90)}px`);b.style.setProperty('--dy',`${Math.round(-60-Math.random()*56)}px`);
      el.particles.append(b);setTimeout(()=>b.remove(),760);
    }
  }
  function purchaseFacility(id){
    if(gameLocked)return;
    const f=FACILITIES[id];if(!f)return;
    const cost=costFor(f,buyAmount);
    if(state.clay+1e-9<cost)return;
    state.clay=Math.max(0,state.clay-cost);state.buildings[id]+=buyAmount;
    awardAchievements();renderStats();renderShop();markDirty();
  }
  function purchaseUpgrade(id){
    const u=UPGRADE_BY_ID.get(id);
    if(gameLocked||!u||upgradeOwned(id)||!unlockedUpgrade(u)||state.clay+1e-9<u.cost)return;
    state.clay=Math.max(0,state.clay-u.cost);state.upgrades.push(id);
    showToast(`${u.name} を購入！`);renderStats();renderShop();markDirty();
  }
  function renderStats(){
    const tier=getTier(state.lifetime);
    el.amount.textContent=formatTierNumber(state.clay,tier);
    el.tierName.textContent=TIERS[tier].name;
    el.rawAmount.textContent=`粘土換算：${formatNumber(state.clay)} / 1 ${TIERS[tier].name} = ${formatNumber(TIERS[tier].factor)} 粘土`;
    el.cps.textContent=formatNumber(getCps())+' /s';
    el.clickPower.textContent='+'+formatNumber(getClickPower());
    el.lifetime.textContent=formatNumber(state.lifetime);
    el.tierCounter.textContent=String(tier+1).padStart(2,'0')+' / '+TIERS.length;
    if(tier===TIERS.length-1){
      el.nextTier.textContent='最終形態「純反物質」に到達';el.nextTarget.textContent='以降も無限に生産可能';
      el.tierProgressLabel.textContent='MAX';el.tierFill.style.width='100%';el.tierProgress.setAttribute('aria-valuenow','100');
    }else{
      const prev=TIERS[tier].factor;const target=TIERS[tier+1].factor;
      const fraction=Math.min(1,Math.max(0,(Math.log(Math.max(1,state.lifetime))-Math.log(prev))/(Math.log(target)-Math.log(prev))));
      const percentage=Math.floor(fraction*100);
      el.nextTier.textContent=TIERS[tier+1].name;el.nextTarget.textContent=`累計 ${formatNumber(target)} で解禁`;
      el.tierProgressLabel.textContent=`${percentage}%`;el.tierFill.style.width=`${percentage}%`;
      el.tierProgress.setAttribute('aria-valuenow',String(percentage));
    }
    if(tier!==lastTier){const announce=lastTier>=0;paintClay(tier);lastTier=tier;if(announce)showToast(`進化！ ${TIERS[tier].name} が生産可能になりました`)}
    el.boost.hidden=now()>=state.boostUntil;
    if(!el.boost.hidden)el.boostTimer.textContent=String(Math.ceil((state.boostUntil-now())/1000));
    const bonusVisible=state.bonusUntil>now();el.bonus.hidden=!bonusVisible;
    if(activeTab==='upgrades')el.upgradeDot.hidden=true;
    else el.upgradeDot.hidden=!UPGRADES.some(u=>unlockedUpgrade(u)&&!upgradeOwned(u.id)&&state.clay>=u.cost);
  }
  function paletteFor(tier){
    if(tier>=23)return ['#8a4b86','#e8a6d5','#fff2fb','#f4da82'];
    if(tier>=19)return ['#365b59','#72d5bb','#ccfff2','#b0eac1'];
    if(tier>=13)return ['#554477','#9172d1','#ded0ff','#81b5f1'];
    if(tier>=9)return ['#345776','#5aa1d2','#b5e6fc','#a4d9ff'];
    if(tier>=5)return ['#3e6a6b','#57afb0','#b8efda','#89d8d5'];
    if(tier>=3)return ['#80514d','#b96e59','#e8ae89','#e9ba96'];
    return ['#76514b','#af7158','#e3a67c','#f5d19a'];
  }
  function paintClay(tier){
    const canvas=el.sprite,ctx=canvas.getContext('2d');
    if(!ctx)return;
    const [shadow,base,highlight,spark]=paletteFor(tier);ctx.clearRect(0,0,24,24);
    const mask=[];
    for(let y=0;y<24;y++){
      mask[y]=[];
      for(let x=0;x<24;x++){
        const shape=(Math.pow((x-11.5)/9.7,2)+Math.pow((y-12.3)/8.7,2))<1;
        const rough=(x+y)%8===0 && (x<4||x>19||y<5||y>19);
        mask[y][x]=shape&&!rough;
      }
    }
    for(let y=2;y<23;y++)for(let x=2;x<23;x++){
      if(!mask[y][x])continue;
      const boundary=!mask[y+1]?.[x]||!mask[y-1]?.[x]||!mask[y][x+1]||!mask[y][x-1];
      const noise=((x*23+y*19+tier*13)%17);
      ctx.fillStyle=boundary||noise<3?shadow:(x+y<21||noise>14)?highlight:base;
      ctx.fillRect(x,y,1,1);
    }
    for(let i=0;i<Math.min(2+Math.floor(tier/2),14);i++){
      const x=5+((i*11+tier*7)%14),y=5+((i*7+tier*11)%14);
      if(mask[y]?.[x]){ctx.fillStyle=spark;ctx.fillRect(x,y,1,1);if(tier>5&&i%3===0){ctx.fillRect(x+1,y,1,1);ctx.fillRect(x,y+1,1,1)}}
    }
    if(tier>=17){
      ctx.fillStyle='#f7e3fc';ctx.fillRect(2,4,2,1);ctx.fillRect(3,3,1,3);ctx.fillRect(21,18,1,3);ctx.fillRect(20,19,3,1);
    }
  }
  function showToast(message){
    el.toast.textContent=message;el.toast.hidden=false;
    if(toastTimer)clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>{el.toast.hidden=true;toastTimer=null},2800);
  }
  const safe=(value)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function setTab(name){
    if(gameLocked)return;
    activeTab=name;
    document.querySelectorAll('.tab').forEach(b=>{const selected=b.dataset.tab===name;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});
    renderShop();
  }
  function renderShop(){
    if(gameLocked)return;
    if(activeTab==='buildings'){
      let html=`<div class="shop-title"><span>粘土生産施設</span><small>まとめ買い：${[1,10,100].map(n=>`<button class="small-button" data-bulk="${n}" style="padding:4px 6px;min-height:25px;${buyAmount===n?'background:#f4c88a':''}">×${n}</button>`).join(' ')}</small></div>`;
      const visible=FACILITIES.filter((f,i)=>i<=2||state.buildings[i]>0||state.lifetime>=f.baseCost*.25||state.clay>=f.baseCost);
      html+=visible.map(f=>{
        const cost=costFor(f,buyAmount);const enough=state.clay>=cost;
        return `<article class="building-row ${enough?'affordable':''}"><div class="pixel-small" aria-hidden="true">${safe(f.symbol)}</div><div class="building-info"><div class="building-name">${safe(f.name)}</div><div class="building-sub">${safe(f.desc)}<br>+${formatNumber(f.cps)} / 秒・台（基本値）</div><div class="building-price ${enough?'can':''}">費用 ${formatNumber(cost)} 粘土</div><span class="owned">所有 ${formatNumber(state.buildings[f.id])} 台</span></div><button class="build-button" data-buy="${f.id}" ${enough?'':'disabled'} aria-label="${safe(f.name)} を${buyAmount}台購入">×${buyAmount}<br>購入</button></article>`;
      }).join('');
      const next=FACILITIES.find(f=>!visible.includes(f));
      if(next)html+=`<div class="empty-state">次の設備は累計 ${formatNumber(next.baseCost*.25)} 粘土から表示されます</div>`;
      el.panel.innerHTML=html;
    }else if(activeTab==='upgrades'){
      const up=UPGRADES.filter(u=>unlockedUpgrade(u)&&!upgradeOwned(u.id)).sort((a,b)=>(state.clay>=b.cost)-(state.clay>=a.cost)||a.cost-b.cost);
      let html=`<div class="shop-title"><span>永久強化</span><small>購入済み ${state.upgrades.length} / ${UPGRADES.length}</small></div>`;
      html+=up.length?up.map(u=>{
        const enough=state.clay>=u.cost;
        return `<article class="upgrade-row ${enough?'affordable':''}"><div class="pixel-small" aria-hidden="true">${u.symbol}</div><div class="upgrade-info"><div class="building-name">${safe(u.name)}</div><div class="building-sub">${safe(u.desc)}</div><div class="building-price ${enough?'can':''}">${formatNumber(u.cost)} 粘土</div></div><button class="upgrade-buy" data-upgrade="${safe(u.id)}" ${enough?'':'disabled'}>強化</button></article>`;
      }).join(''):'<div class="empty-state">新しい強化は条件を達成すると解禁されます。<br>生産と施設購入を進めよう！</div>';
      el.panel.innerHTML=html;
    }else if(activeTab==='achievements'){
      el.panel.innerHTML=`<div class="shop-title"><span>研究・実績の記録</span><span class="achievements-count">${state.achievements.length} / ${ACHIEVEMENTS.length} 完了</span></div>`+
        ACHIEVEMENTS.map(a=>`<article class="achievement-row ${state.achievements.includes(a.id)?'done':''}"><div class="pixel-small">${state.achievements.includes(a.id)?'★':'?'}</div><div class="achievement-info"><div class="building-name">${safe(a.name)}</div><div class="building-sub">${safe(a.desc)}</div></div></article>`).join('');
    }else if(activeTab==='settings'){
      el.panel.innerHTML=`<div class="shop-title"><span>ゲーム設定</span><small>ver ${VERSION}</small></div>
        <section class="settings-section"><h3>セーブとバックアップ</h3><p>セーブはこのゲーム専用の領域に保存されます。ほかのツールボックスデータや「文明の種」と混ざりません。10秒ごとの自動保存と予備セーブがあります。</p><div class="settings-buttons"><button class="small-button" data-action="save">今すぐセーブ</button><button class="small-button" data-action="export">JSONを書き出す</button><button class="small-button" data-action="import">JSONを読み込む</button></div></section>
        <section class="settings-section"><h3>表示設定</h3><label><input type="checkbox" id="reduced-motion" ${state.reducedMotion?'checked':''}>タップ時の演出を軽量化</label></section>
        <section class="settings-section"><h3>進行と仕様</h3><p>圧縮倍率は各段階につき9倍。生産・購入ともに内部では「粘土換算」で一元管理され、表示される粘土が進化しても資源は分裂しません。ボーナス粘土は時間限定で出現します。放置生産は最大8時間、通常速度の25%です。</p></section>
        <section class="settings-section"><h3>セーブデータの初期化</h3><p>現在の進行を消して最初から始めます。実行前に確認が表示されます。</p><button class="danger-button" data-action="reset">進行を初期化</button></section>`;
    }
  }
  function checkBonus(t){
    if(state.bonusUntil>0&&t>state.bonusUntil){state.bonusUntil=0;state.bonusAt=t+60000+Math.random()*90000}
    if(!state.bonusUntil&&t>=state.bonusAt){state.bonusUntil=t+20000;markDirty()}
  }
  function claimBonus(){
    if(gameLocked||now()>state.bonusUntil)return;
    state.bonusUntil=0;state.bonusAt=now()+60000+Math.random()*90000;
    if(Math.random()<.5){
      const amount=Math.max(30,getCps()*75,getClickPower()*20);
      gain(amount);showToast(`✦ ボーナス粘土！ +${formatNumber(amount)}`);
    }else{state.boostUntil=now()+30000;showToast('✦ フィーバー！ 30秒間生産速度 ×7')}
    renderStats();renderShop();
  }
  function showModal(title,body,actions){
    el.modalTitle.textContent=title;
    el.modalBody.innerHTML=body;
    el.modalActions.replaceChildren();
    for(const a of actions){const btn=document.createElement('button');btn.className=a.danger?'danger-button':'small-button';btn.textContent=a.label;btn.addEventListener('click',()=>{el.shade.hidden=true;a.action?.()});el.modalActions.append(btn)}
    el.shade.hidden=false;
  }
  function resetGame(){
    showModal('最初から始めますか？','<p>現在の進行、施設、強化、実績を初期化します。復元したい場合は、先にJSONを書き出してください。</p>',[
      {label:'キャンセル'},
      {label:'初期化する',danger:true,action:()=>{
        try{localStorage.removeItem(SAVE_KEY);localStorage.removeItem(BACKUP_KEY)}catch{};
        state=freshState();lastTier=-1;renderStats();renderShop();save();showToast('ゲームを初期化しました。');
      }}
    ]);
  }
  function exportSave(){
    if(!save()&&!volatileMode)return showToast('セーブに失敗したため書き出せません。');
    const blob=new Blob([JSON.stringify({game:'clay-clicker',version:1,state},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='clay-clicker-save.json';
    document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
    showToast('セーブデータを書き出しました。');
  }
  function importSave(file){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const payload=JSON.parse(reader.result);
        if(payload.game!=='clay-clicker'||payload.version!==1)throw Error('game');
        const imported=validPayload(JSON.stringify(payload.state));
        if(!imported)throw Error('state');
        showModal('セーブデータを読み込みますか？','<p>現在のゲーム進行を読み込むデータで置き換えます。念のため先に現在のデータを書き出してください。</p>',[
          {label:'キャンセル'},
          {label:'読み込む',action:()=>{
            state=imported;state.lastSaved=now();state.bonusUntil=0;state.bonusAt=now()+65000;
            gameLocked=false;el.clayButton.disabled=false;document.querySelectorAll('.tab').forEach(t=>t.disabled=false);
            lastTier=-1;awardAchievements(true);renderStats();setTab('buildings');save();showToast('セーブデータを読み込みました。');
          }}
        ]);
      }catch{showToast('対応していない、または破損したJSONです。現在のデータは変更されません。')}
    };
    reader.onerror=()=>showToast('ファイルの読み込みに失敗しました。');
    reader.readAsText(file);el.file.value='';
  }
  function showCorruptScreen(){
    gameLocked=true;el.clayButton.disabled=true;document.querySelectorAll('.tab').forEach(t=>t.disabled=true);
    el.panel.innerHTML='<div class="shop-title">セーブの確認が必要です</div><div class="empty-state">セーブデータを正常に読み込めませんでした。<br>進行を保護するため、新しいセーブで上書きしていません。</div><div class="settings-buttons"><button class="small-button" id="recover-import">JSONセーブから復旧</button><button class="danger-button" id="recover-reset">新規に始める</button></div>';
    el.saveStatus.textContent='● セーブ保護中';el.saveStatus.classList.add('warn');
    $('recover-import').onclick=()=>el.file.click();
    $('recover-reset').onclick=()=>showModal('新規ゲームを開始','<p>破損したセーブデータが失われます。復旧できるJSONがない場合にのみ実行してください。</p>',[
      {label:'キャンセル'},{label:'開始する',danger:true,action:()=>{
        try{localStorage.removeItem(SAVE_KEY);localStorage.removeItem(BACKUP_KEY)}catch{};
        gameLocked=false;state=freshState();el.clayButton.disabled=false;document.querySelectorAll('.tab').forEach(t=>t.disabled=false);
        lastTier=-1;setTab('buildings');renderStats();save();
      }}
    ]);
  }
  function gameTick(){
    const t=now();let elapsed=Math.max(0,t-lastFrame);lastFrame=t;
    if(!gameLocked){
      if(elapsed>0){
        const effectiveMs=Math.min(elapsed,MAX_OFFLINE_MS);
        const factor=elapsed>10000?.25:1;
        const earned=getCpsAt(state,t)*effectiveMs/1000*factor;
        if(Number.isFinite(earned)&&earned>0)gain(earned);
      }
      checkBonus(t);
      if(t-lastStatsPaint>=140){renderStats();lastStatsPaint=t}
      if(t-lastShopPaint>=950){if(activeTab==='buildings'||activeTab==='upgrades')renderShop();lastShopPaint=t}
      if(t-lastAutosave>=10000)save();
    }
  }
  function bootstrap(){
    el.home.hidden=new URLSearchParams(location.search).get('toolbox')!=='1';
    if(!el.home.hidden)document.body.classList.add('in-toolbox');
    const status=loadSaved();
    if(status==='corrupt'){showCorruptScreen()}
    else{lastTier=-1;awardAchievements(true);renderStats();renderShop();if(status==='new')save();if(status==='volatile')markDirty()}
    el.clayButton.addEventListener('click',tap);
    el.bonus.addEventListener('click',claimBonus);
    document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>setTab(t.dataset.tab)));
    el.panel.addEventListener('click',event=>{
      const target=event.target.closest('button');if(!target||target.disabled)return;
      if(target.dataset.bulk) {buyAmount=Number(target.dataset.bulk);renderShop()}
      else if(target.dataset.buy!==undefined)purchaseFacility(Number(target.dataset.buy));
      else if(target.dataset.upgrade)purchaseUpgrade(target.dataset.upgrade);
      else if(target.dataset.action==='save')showToast(save()?'セーブしました。':'セーブに失敗しました。');
      else if(target.dataset.action==='export')exportSave();
      else if(target.dataset.action==='import')el.file.click();
      else if(target.dataset.action==='reset')resetGame();
    });
    el.panel.addEventListener('change',event=>{
      if(event.target.id==='reduced-motion'){state.reducedMotion=event.target.checked;markDirty()}
    });
    el.file.addEventListener('change',event=>importSave(event.target.files?.[0]));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)save();else lastFrame=Math.min(lastFrame,now())});
    window.addEventListener('pagehide',save);
    window.setInterval(gameTick,200);
    window.__clayClickerDiagnostics=Object.freeze({getSnapshot:()=>({clay:state.clay,lifetime:state.lifetime,cps:getCps(),tier:getTier(state.lifetime),facilities:state.buildings.length,saveKey:SAVE_KEY})});
  }
  bootstrap();
})();
