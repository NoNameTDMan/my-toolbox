/**
 * My Toolbox v1.1.5
 * Created: 2026-11-09
 * Author: Personal project / ChatGPT (prototype)
 * Zero-dependency PWA. Text data stays in localStorage; photos use IndexedDB. Backups include both.
 *
 * NEW TOOLS: Add an item to TOOLS, then implement its screen in pageContent().
 * Existing storage and navigation are kept separate from the screen structure.
 */
(() => {
  'use strict';

  const STORE_KEY = 'my-toolbox-data-v1';
  // An installed module is a normal, editable game entry (not an extra tool tile).
  // The flag prevents re-adding it if the user removes its entry.
  const CIVILIZATION_ID = 'builtin-civilization-v1';
  const CIVILIZATION_URL = './game-player.html?game=civilization';
  const civilizationEntry = () => ({
    id:CIVILIZATION_ID,name:'文明の種',url:CIVILIZATION_URL,
    icon:'🎮',iconKey:'game',iconImage:'',kind:'game',
    category:'内蔵ゲーム',folder:'',favorite:false,browser:'system'
  });
  // A second self-contained game; its files and save keys are not owned by Toolbox.
  const CLAY_ID = 'builtin-clay-clicker-v1';
  const CLAY_URL = './games/clay-clicker/index.html?toolbox=1';
  const clayEntry = () => ({
    id:CLAY_ID,name:'粘土クリッカー',url:CLAY_URL,
    icon:'🎮',iconKey:'game',iconImage:'',kind:'game',
    category:'内蔵ゲーム',folder:'',favorite:false,browser:'system'
  });
  const TODAY = new Date().toISOString();
  // Calendar dates are LOCAL dates. Avoid toISOString().slice(0, 10) in Japan.
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const isDateKey = value => { if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);const x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d;};
  const eventTimeLabel = event => event.allDay ? '終日' : `${event.start}–${event.end}`;
  const sortedEvents = date => eventsOn(date).sort((a,b)=>Number(b.allDay)-Number(a.allDay) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title));

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const uid = () => (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)));
  const counts = items => ({done:items.filter(x=>x.done).length, total:items.length});
  const shortDate = iso => { try {return new Date(iso).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'});}catch{return '';} };
  const wrap = (value,max) => esc(String(value||'').length > max ? String(value).slice(0,max)+'…' : value);

  // Flat monochrome vector icons. Colors follow light/dark CSS variables.
  const ICONS = {
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    link:'<path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    cart:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 2h3l2.4 12.4a2 2 0 0 0 2 1.6h10a2 2 0 0 0 2-1.6L22 7H5"/>',
    check:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
    note:'<path d="M12 20h9M3 20l4.8-1 12-12a2 2 0 0 0-3-3l-12 12L3 20z"/><path d="m15 6 3 3"/>',
    photo:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 16-5.5-5.5L5 21"/>',
    game:'<path d="M6.8 9h10.4a4 4 0 0 1 3.9 3l1.1 5a3 3 0 0 1-4.8 3L15 18H9l-2.4 2A3 3 0 0 1 1.8 17l1.1-5a4 4 0 0 1 3.9-3Z"/><path d="M7 13v4M5 15h4M17 14h.01M19 16h.01"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 1 1.7-2 2-1.7-1a8 8 0 0 1-2.3.9L14 21h-4l-.4-2.4a8 8 0 0 1-2.3-.9l-1.7 1-2-2 1-1.7a8 8 0 0 1-.9-2.3L1 12l2.7-.7a8 8 0 0 1 .9-2.3l-1-1.7 2-2 1.7 1a8 8 0 0 1 2.3-.9L10 3h4l.4 2.4a8 8 0 0 1 2.3.9l1.7-1 2 2-1 1.7a8 8 0 0 1 .9 2.3L23 12l-2.7.7a8 8 0 0 1-.9 2.3Z"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a16 16 0 0 1 0 18M12 3a16 16 0 0 0 0 18"/>',
    play:'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
    map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
    star:'<path d="m12 2 3.1 6.5 7.2.9-5.2 5 .9 7.1L12 18l-6 3.5.9-7.1-5.2-5 7.2-.9z"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    bookmark:'<path d="M6 4h12v17l-6-4-6 4z"/>',
    camera:'<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11H3V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>',
    music:'<path d="M9 18V5l12-2v13M9 8l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="16" rx="3" ry="2"/>',
    book:'<path d="M12 6a9 9 0 0 0-9-2v15a9 9 0 0 1 9 2 9 9 0 0 1 9-2V4a9 9 0 0 0-9 2zM12 6v15"/>',
    cloud:'<path d="M7 18a5 5 0 0 1-1-10 7 7 0 0 1 13 2 4 4 0 0 1-1 8z"/>',
    heart:'<path d="M20 5a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7z"/>',
    bolt:'<path d="m13 2-9 11h7l-1 9 10-12h-7z"/>',
    folder:'<path d="M3 5h7l2 3h9v11H3z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    calculator:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8v4H8zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
    search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    external:'<path d="M12 4h8v8M20 4l-9 9"/><path d="M20 14v6H4V4h6"/>',
    upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    'arrow-up':'<path d="M12 20V4m-7 7 7-7 7 7"/>',
    'arrow-down':'<path d="M12 4v16m-7-7 7 7 7-7"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    trash:'<path d="M4 6h16M9 6V4h6v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
    cube:'<path d="m12 2 9 5-9 5-9-5 9-5zM3 7v10l9 5 9-5V7M12 12v10"/>',
    timetable:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'
  };
  const ICON_CHOICES = ['link','globe','game','play','music','photo','camera','calendar','cart','check','note','bookmark','star','map','book','cloud','heart','bolt','folder','clock','calculator','search','bell','grid','list','home','cube','timetable'];
  const svgIcon=(key,extra='')=>`<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="line-icon ${extra}">${ICONS[key]||ICONS.link}</svg>`;
  const legacyIcon=(value,fallback='link')=>{
    if(ICONS[value])return value;
    const map={'📅':'calendar','🔗':'link','🛒':'cart','✅':'check','📝':'note','📋':'list','🌐':'globe','▶️':'play','✳️':'grid','🗺️':'map','🏠':'home','⚙️':'settings','🎮':'game','📷':'camera','🎵':'music','⭐':'star','🔖':'bookmark','🔎':'search'};
    return map[value]||fallback;
  };
  const imageDataOk=s=>typeof s==='string' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length<95000;
  const tile=(key='link',color='blue',data='')=>`<span class="icon-tile tile-${/^(blue|mint|purple|peach|gray)$/.test(color)?color:'gray'}" aria-hidden="true">${imageDataOk(data)?`<img src="${data}" alt="" class="custom-link-icon">`:svgIcon(legacyIcon(key))}</span>`;
  const toolIcon={calendar:'calendar',links:'link',apps:'grid',games:'game',photos:'photo',lists:'list',notes:'note',settings:'settings',home:'home',timetable:'timetable',cube:'cube'};

  const TOOLS = [
    {id:'timetable', name:'時間割', desc:'月〜金の授業と教室を管理', icon:'timetable', color:'blue'},
    {id:'calendar', name:'マイカレンダー', desc:'予定を管理・Googleへ転記', icon:'calendar', color:'blue'},
    {id:'links', name:'リンク', desc:'よく使うWebサイトを開く', icon:'link', color:'purple'},
    {id:'apps', name:'アプリ', desc:'アプリの起動リンク', icon:'grid', color:'blue'},
    {id:'games', name:'ゲーム', desc:'ゲームの起動リンク', icon:'game', color:'purple'},
    {id:'lists', listId:'tasks', name:'チェックリスト', desc:'TODOと買い物を一緒に管理', icon:'check', color:'mint'},
    {id:'notes', name:'クイックメモ', desc:'思いつきをすぐに記録', icon:'note', color:'peach'},
    {id:'habits', name:'毎日やること', desc:'3つの習慣を毎日チェック', icon:'check', color:'mint'},
    {id:'photos', name:'写真保管庫', desc:'写真を端末内に保存', icon:'photo', color:'mint'}
  ];

  // Shared weekday class records: one class ID can occupy multiple weekdays at the SAME period.
  const WEEKDAYS=['月','火','水','木','金'];
  const TIME_RE=/^([01]\d|2[0-3]):[0-5]\d$/;
  function defaultPeriodTimes(){return [['09:00','10:30'],['10:40','12:10'],['13:00','14:30'],['14:40','16:10'],['16:20','17:50'],['18:00','19:30'],['19:40','20:20'],['20:30','21:10'],['21:20','22:00'],['22:10','22:40'],['22:45','23:10'],['23:15','23:45']].map(([start,end])=>({start,end}));}

  // 54 facelets in U R F D L B face order. Positive y is UP; positive z is FRONT.
  const CUBE_FACES={
    U:{n:[0,1,0],right:[1,0,0],down:[0,0,1],axis:1,sign:1},
    R:{n:[1,0,0],right:[0,0,-1],down:[0,-1,0],axis:0,sign:1},
    F:{n:[0,0,1],right:[1,0,0],down:[0,-1,0],axis:2,sign:1},
    D:{n:[0,-1,0],right:[1,0,0],down:[0,0,-1],axis:1,sign:-1},
    L:{n:[-1,0,0],right:[0,0,1],down:[0,-1,0],axis:0,sign:-1},
    B:{n:[0,0,-1],right:[-1,0,0],down:[0,-1,0],axis:2,sign:-1}
  };
  const CUBE_ORDER=Object.keys(CUBE_FACES);
  const solvedCube=()=>CUBE_ORDER.flatMap(face=>Array(9).fill(face));
  const dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0);
  const stickerCoord=(face,row,col)=>{const f=CUBE_FACES[face];return {pos:f.n.map((n,i)=>n+f.right[i]*(col-1)+f.down[i]*(row-1)),normal:f.n};};
  const stickerKey=(pos,normal)=>`${pos.join(',')}|${normal.join(',')}`;
  const stickerSlots=CUBE_ORDER.flatMap(face=>Array.from({length:9},(_,k)=>stickerCoord(face,Math.floor(k/3),k%3)));
  const cubeIndex=new Map(stickerSlots.map((v,i)=>[stickerKey(v.pos,v.normal),i]));
  function rotateAxis(vec,axis,q){const [x,y,z]=vec;const sign=q>0?1:-1;return axis===0?[x,-sign*z,sign*y]:axis===1?[sign*z,y,-sign*x]:[-sign*y,sign*x,z];}
  function turnCube(stickers,face,dir=1){
    const f=CUBE_FACES[face];if(!f)return stickers;
    let output=stickers.slice();const quarters=dir===2?2:1,sign=(dir===-1?1:-1)*f.sign;
    for(let turn=0;turn<quarters;turn++){
      const next=output.slice();
      for(let i=0;i<54;i++){
        const slot=stickerSlots[i];if(slot.pos[f.axis]!==f.sign)continue;
        const pos=rotateAxis(slot.pos,f.axis,sign),normal=rotateAxis(slot.normal,f.axis,sign);
        const destination=cubeIndex.get(stickerKey(pos,normal));
        if(destination===undefined)throw Error('Cube move mapping failed');
        next[destination]=output[i];
      }
      output=next;
    }
    return output;
  }
  const cubeIsSolved=stickers=>CUBE_ORDER.every((face,index)=>stickers.slice(index*9,index*9+9).every(x=>x===stickers[index*9]));
  const CUBE_PALETTE={U:'#f1f4f9',R:'#eb5662',F:'#48a475',D:'#f5ce56',L:'#f2a35c',B:'#5386d9'};
  const cubeFacelet=(color)=>`<span class="cube-sticker" style="--sticker-color:${CUBE_PALETTE[color]||CUBE_PALETTE.U}" aria-hidden="true"></span>`;
  const cubeFace=(stickers,face)=>{const i=CUBE_ORDER.indexOf(face)*9;return Array.from({length:9},(_,j)=>cubeFacelet(stickers[i+j])).join('');};

  function defaultData(){
    return {
      version:7,
      links:[
        civilizationEntry(),
        clayEntry(),
        {id:uid(),name:'Google',url:'https://www.google.com/',icon:'🌐',iconKey:'globe',kind:'web',category:'検索',favorite:true},
        {id:uid(),name:'YouTube',url:'https://www.youtube.com/',icon:'▶️',iconKey:'play',kind:'web',category:'動画',favorite:true},
        {id:uid(),name:'ChatGPT',url:'https://chatgpt.com/',icon:'✳️',iconKey:'grid',kind:'web',category:'ツール',favorite:true},
        {id:uid(),name:'Google マップ',url:'https://maps.google.com/',icon:'🗺️',iconKey:'map',kind:'web',category:'地図',favorite:false}
      ],
      lists:[
        {id:'tasks', name:'チェックリスト',icon:'✅',iconKey:'check',builtin:true,items:[
          {id:uid(),title:'アプリの操作を試してみる',done:false,category:'todo'},
          {id:uid(),title:'追加したい機能をメモする',done:false,category:'todo'},
          {id:uid(),title:'牛乳',done:false,category:'shopping'},
          {id:uid(),title:'卵',done:false,category:'shopping'},
          {id:uid(),title:'パン',done:true,category:'shopping'}
        ]}
      ],
      events:[],
      timetable:{periods:defaultPeriodTimes().slice(0,6),classes:[]},
      cube:{stickers:solvedCube(),history:[],moveCount:0},
      habits:{items:[{id:uid(),title:'',done:false},{id:uid(),title:'',done:false},{id:uid(),title:'',done:false}],day:'',history:{}},
      notes:[{id:uid(),title:'ここから始めよう',body:'このメモはサンプルです。\n\n「＋」ボタンから、思いついたアイデアを書き留めてみましょう。リンクやリストも自由に追加できます。',updatedAt:TODAY}],
      prefs:{appName:'My Toolbox',appIconKey:'grid',appIconImage:'',theme:'light',onboard:true,defaultBrowser:'safari',searchBrowser:'safari',searchEngine:'google',homeSections:[],hiddenSections:[],photoAlbums:[],civilizationAdded:true,clayAdded:true}
    };
  }
  const BROWSERS=[['system','端末の既定'],['safari','Safari（試験的）'],['chrome','Chrome'],['firefox','Firefox'],['edge','Edge']];
  const validBrowser=(value,fallback='system')=>BROWSERS.some(([key])=>key===value)?value:fallback;
  const browserSelect=(name,value='system',includeInherit=false)=>`<select class="select" name="${name}" aria-label="開くブラウザ">${(includeInherit?[['inherit','設定に従う'],...BROWSERS]:BROWSERS).map(([key,title])=>`<option value="${key}" ${key===value?'selected':''}>${title}</option>`).join('')}</select>`;
  const HOME_SECTIONS=[['today','今日の予定・TODO'],['search','Web検索'],['habits','毎日やること'],['tools','ツールボックス'],['favorites','お気に入り'],['recent','最近のメモ']];
  function normalize(raw){
    if(!raw || typeof raw !== 'object' || !Array.isArray(raw.links) || !Array.isArray(raw.lists) || !Array.isArray(raw.notes)) throw Error('バックアップの形式が正しくありません。');
    const links=raw.links.slice(0,2000).map(x=>({id:String(x.id||uid()),name:String(x.name||'無題').slice(0,150),url:String(x.url||'').slice(0,3000),icon:String(x.icon||'🔗').slice(0,8),iconKey:legacyIcon(x.iconKey||x.icon,(x.kind==='app'?'game':'link')),iconImage:imageDataOk(x.iconImage)?x.iconImage:'',kind:['app','game'].includes(x.kind)?x.kind:'web',category:String(x.category||'').slice(0,100),folder:String(x.folder||'').slice(0,100),favorite:!!x.favorite,browser:['inherit','system','safari','chrome','firefox','edge'].includes(x.browser)?x.browser:'inherit'}));
    // Migrate old toolbox data without touching existing links or their ordering.
    // A previously deleted bundled entry must remain deleted after subsequent loads.
    const civilizationAdded=!!raw.prefs?.civilizationAdded || links.some(x=>x.id===CIVILIZATION_ID);
    if(!civilizationAdded)links.push(civilizationEntry());
    // One-time migration: add Clay Clicker to old installs, never duplicate an
    // existing manual registration, and respect subsequent user deletion.
    const clayAlreadyListed=links.some(x=>x.id===CLAY_ID || /(?:^|\/)games\/clay-clicker\/index\.html(?:\?toolbox=1)?$/.test(x.url));
    const clayAdded=!!raw.prefs?.clayAdded || clayAlreadyListed;
    if(!clayAdded)links.push(clayEntry());
    const lists=raw.lists.slice(0,300).map(x=>({id:String(x.id||uid()),name:String(x.name||'リスト').slice(0,120),icon:String(x.icon||'📋').slice(0,8),iconKey:legacyIcon(x.iconKey||x.icon,'list'),builtin:x.id==='tasks',items:Array.isArray(x.items)?x.items.slice(0,10000).map(item=>({id:String(item.id||uid()),title:String(item.title||'').slice(0,500),done:!!item.done,category:item.category==='shopping'?'shopping':'todo',due:isDateKey(item.due)?item.due:'',repeatAnchor:isDateKey(item.repeatAnchor)?item.repeatAnchor:(isDateKey(item.due)?item.due:''),repeat:['none','daily','weekly','monthly','3days'].includes(item.repeat)?item.repeat:'none',completedDates:Array.isArray(item.completedDates)?item.completedDates.filter(isDateKey).slice(-500):[]})):[]}));
    // Migrate v0.1–v0.4's two built-in lists into one, without dropping entries.
    // Distinct category tags retain each item's original TODO/shopping meaning.
    const unified=lists.find(x=>x.id==='tasks') || {id:'tasks',name:'チェックリスト',icon:'✅',iconKey:'check',builtin:true,items:[]};
    unified.name='チェックリスト';unified.iconKey='check';unified.builtin=true;
    const seen=new Set(unified.items.map(item=>item.id));
    for(const legacy of lists.filter(x=>x.id==='shopping'||x.id==='todo')){
      for(const item of legacy.items){
        const id=seen.has(item.id)?uid():item.id;seen.add(id);
        unified.items.push({...item,id,category:legacy.id});
      }
    }
    const retainedLists=lists.filter(x=>!['shopping','todo','tasks'].includes(x.id));
    retainedLists.unshift(unified);
    const rawPeriods=Array.isArray(raw.timetable?.periods)?raw.timetable.periods.slice(0,12):defaultPeriodTimes().slice(0,6);
    const periods=(rawPeriods.length?rawPeriods:defaultPeriodTimes().slice(0,6)).map((p,i)=>({start:TIME_RE.test(p.start)&&TIME_RE.test(p.end)&&p.start<p.end?p.start:(defaultPeriodTimes()[i]?.start||'09:00'),end:TIME_RE.test(p.start)&&TIME_RE.test(p.end)&&p.start<p.end?p.end:(defaultPeriodTimes()[i]?.end||'10:30')}));
    const classes=[];const taken=new Set();
    for(const c of (Array.isArray(raw.timetable?.classes)?raw.timetable.classes.slice(0,500):[])){
      const period=Number(c.period);if(!Number.isInteger(period)||period<1||period>periods.length)continue;
      const days=[...new Set((Array.isArray(c.days)?c.days:[]).map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=4))];
      if(!days.length||days.some(d=>taken.has(`${d}-${period}`)))continue;
      days.forEach(d=>taken.add(`${d}-${period}`));
      classes.push({id:String(c.id||uid()).slice(0,90),days,period,subject:String(c.subject||'授業').slice(0,120),room:String(c.room||'').slice(0,120),note:String(c.note||'').slice(0,700)});
    }
    const timetable={periods,classes};
    const cubeRaw=raw.cube||{};const cubeValid=Array.isArray(cubeRaw.stickers)&&cubeRaw.stickers.length===54&&CUBE_ORDER.every(ch=>cubeRaw.stickers.filter(x=>x===ch).length===9);
    const cube={stickers:cubeValid?cubeRaw.stickers.slice():solvedCube(),history:Array.isArray(cubeRaw.history)?cubeRaw.history.filter(m=>/^[URFDLB](?:2|'|)$/.test(m)).slice(-500):[],moveCount:Math.max(0,Math.min(100000,Number(cubeRaw.moveCount)||0)),scramble:String(cubeRaw.scramble||'').slice(0,250)};
    const notes=raw.notes.slice(0,2000).map(x=>({id:String(x.id||uid()),title:String(x.title||'無題').slice(0,150),body:String(x.body||'').slice(0,300000),updatedAt:String(x.updatedAt||TODAY)}));
    // v0.1/v0.2 backups have no events; preserve their data on migration.
    const events=(Array.isArray(raw.events)?raw.events:[]).slice(0,3000).map(x=>({
      id:String(x.id||uid()).slice(0,100),
      title:String(x.title||'無題の予定').slice(0,150),
      date:String(x.date||''),
      allDay:!!x.allDay,
      start:String(x.start||'09:00').slice(0,5),
      end:String(x.end||'10:00').slice(0,5),
      location:String(x.location||'').slice(0,250),
      description:String(x.description||'').slice(0,3000),repeat:['none','daily','weekly','monthly','3days','yearly'].includes(x.repeat)?x.repeat:'none',repeatUntil:isDateKey(x.repeatUntil)?x.repeatUntil:'',remind: [0,5,10,15,30,60].includes(Number(x.remind))?Number(x.remind):0
    })).filter(x=>isDateKey(x.date) && (x.allDay || (/^([01]\d|2[0-3]):[0-5]\d$/.test(x.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.end) && x.end>x.start)));
    const habitRaw=raw.habits&&typeof raw.habits==='object'?raw.habits:{};
    const history=Object.fromEntries(Object.entries(habitRaw.history&&typeof habitRaw.history==='object'?habitRaw.history:{}).filter(([day])=>isDateKey(day)).slice(-500).map(([day,entry])=>[day,{items:Array.isArray(entry?.items)?entry.items.slice(0,3).map(x=>({title:String(x.title||'').slice(0,100),done:!!x.done})):[]} ]));
    const habits={items:Array.from({length:3},(_,i)=>({id:String(habitRaw.items?.[i]?.id||uid()),title:String(habitRaw.items?.[i]?.title||'').slice(0,100),done:!!habitRaw.items?.[i]?.done})),day:isDateKey(habitRaw.day)?habitRaw.day:'',history};
    if(habits.day&&!history[habits.day])history[habits.day]={items:habits.items.map(x=>({title:x.title,done:x.done}))};
    return {version:7,links,lists:retainedLists,notes,events,habits,timetable,cube,prefs:{appName:String(raw.prefs?.appName||'My Toolbox').slice(0,32),appIconKey:legacyIcon(raw.prefs?.appIconKey||'grid','grid'),appIconImage:imageDataOk(raw.prefs?.appIconImage)?raw.prefs.appIconImage:'',theme:['light','dark','system'].includes(raw.prefs?.theme)?raw.prefs.theme:'light',onboard:!!raw.prefs?.onboard,toolOrder:Array.isArray(raw.prefs?.toolOrder)?raw.prefs.toolOrder.filter(x=>typeof x==='string'):[],linkOrder:Array.isArray(raw.prefs?.linkOrder)?raw.prefs.linkOrder.filter(x=>typeof x==='string'):[],bottomNav:Array.isArray(raw.prefs?.bottomNav)?raw.prefs.bottomNav.filter(x=>typeof x==='string'):[],folders:{web:Array.isArray(raw.prefs?.folders?.web)?raw.prefs.folders.web.filter(x=>typeof x==='string'):[],app:Array.isArray(raw.prefs?.folders?.app)?raw.prefs.folders.app.filter(x=>typeof x==='string'):[],game:Array.isArray(raw.prefs?.folders?.game)?raw.prefs.folders.game.filter(x=>typeof x==='string'):[]},photoAlbums:Array.isArray(raw.prefs?.photoAlbums)?raw.prefs.photoAlbums.filter(x=>typeof x==='string').slice(0,200):[],defaultBrowser:validBrowser(raw.prefs?.defaultBrowser,'safari'),searchBrowser:validBrowser(raw.prefs?.searchBrowser,'safari'),searchEngine:['google','duckduckgo','bing'].includes(raw.prefs?.searchEngine)?raw.prefs.searchEngine:'google',homeSections:Array.isArray(raw.prefs?.homeSections)?raw.prefs.homeSections.filter(x=>typeof x==='string'):[],hiddenSections:Array.isArray(raw.prefs?.hiddenSections)?raw.prefs.hiddenSections.filter(x=>typeof x==='string'):[],civilizationAdded:true,clayAdded:true}};
  }
  let state;
  let storageAvailable=true;
  let dataLoadError=false;
  try {
    const saved=localStorage.getItem(STORE_KEY);
    const previous=localStorage.getItem(STORE_KEY+'-last-good');
    let storedValue=saved;
    if(!storedValue&&previous){const candidate=JSON.parse(previous);if(candidate&&Array.isArray(candidate.links)&&Array.isArray(candidate.lists))storedValue=previous;}
    state=storedValue?normalize(JSON.parse(storedValue)):defaultData();
    try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(writeError){storageAvailable=false;console.warn('Local storage write failed',writeError);}
  } catch(error) {
    state=defaultData();
    storageAvailable=false;dataLoadError=true;
    console.warn('Existing data could not be read; protecting stored bytes',error);
  }
  const ui={folderWeb:'__all__',folderApp:'__all__',folderGame:'__all__',gameSearch:'',page:'home',listId:'tasks',taskFilter:'all',linkSearch:'',appSearch:'',noteSearch:'',photoSearch:'',photoAlbum:'__all__',globalSearch:'',habitMonth:dateKey().slice(0,7),drawerOpen:false,selectedDate:dateKey(),calendarMonth:dateKey().slice(0,7),cubeYaw:-31,cubePitch:-24,cubeNet:false};
  // Navigation history stays in memory; existing v1 saved data remains unchanged.
  const navigationStack=[];
  const getList=id=>state.lists.find(x=>x.id===id);
  // A habit day runs from 04:00 to 03:59 in the device's local timezone.
  const habitDay=(now=new Date())=>{const d=new Date(now);d.setHours(d.getHours()-4);return dateKey(d);};
  function ensureHabitDay(){
    if(!state.habits)state.habits={items:Array.from({length:3},()=>({id:uid(),title:'',done:false})),day:'',history:{}};
    if(!state.habits.history)state.habits.history={};
    const day=habitDay();if(state.habits.day===day)return false;
    if(state.habits.day && !state.habits.history[state.habits.day])state.habits.history[state.habits.day]={items:state.habits.items.map(x=>({title:x.title,done:x.done}))};
    state.habits.day=day;state.habits.items.forEach(x=>x.done=false);
    recordHabitDay();return true;
  }
  function recordHabitDay(){
    const habits=state.habits;if(!habits?.day)return;
    habits.history=habits.history||{};
    habits.history[habits.day]={items:habits.items.map(x=>({title:x.title,done:x.done}))};
    const dates=Object.keys(habits.history).sort();for(const old of dates.slice(0,-450))delete habits.history[old];
  }
  const asLocalDate=k=>new Date(`${k}T12:00:00`);
  const nextDate=(key,n=1)=>dateKey(new Date(asLocalDate(key).setDate(asLocalDate(key).getDate()+n)));
  const dayDiff=(a,b)=>Math.round((Date.UTC(...a.split('-').map((x,i)=>i===1?Number(x)-1:Number(x)))-Date.UTC(...b.split('-').map((x,i)=>i===1?Number(x)-1:Number(x))))/86400000);
  const recurrenceDate=(from,repeat,anchor=from)=>{
    if(!isDateKey(from))return '';
    const d=asLocalDate(from);
    if(repeat==='daily')d.setDate(d.getDate()+1);
    else if(repeat==='3days')d.setDate(d.getDate()+3);
    else if(repeat==='weekly')d.setDate(d.getDate()+7);
    else if(repeat==='monthly'){
      const day=Number((isDateKey(anchor)?anchor:from).slice(8));
      d.setDate(1);
      for(let i=0;i<12;i++){
        d.setMonth(d.getMonth()+1);
        if(day<=new Date(d.getFullYear(),d.getMonth()+1,0).getDate()){d.setDate(day);break;}
      }
    }else if(repeat==='yearly'){
      const origin=asLocalDate(isDateKey(anchor)?anchor:from),mon=origin.getMonth(),day=origin.getDate();
      d.setDate(1);
      for(let i=0;i<8;i++){
        d.setFullYear(d.getFullYear()+1);d.setMonth(mon);
        if(day<=new Date(d.getFullYear(),mon+1,0).getDate()){d.setDate(day);break;}
      }
    }else return '';
    return dateKey(d);
  };
  function eventOccursOn(event,day){
    if(day<event.date || (event.repeatUntil&&day>event.repeatUntil))return false;
    const freq=event.repeat||'none';if(freq==='none')return day===event.date;
    const days=dayDiff(day,event.date);
    if(freq==='daily')return true;if(freq==='weekly')return days%7===0;if(freq==='3days')return days%3===0;
    const d=asLocalDate(day),first=asLocalDate(event.date),years=d.getFullYear()-first.getFullYear(),months=years*12+d.getMonth()-first.getMonth();
    if(freq==='monthly')return months>=0 && d.getDate()===first.getDate();
    if(freq==='yearly')return years>=0&&d.getMonth()===first.getMonth()&&d.getDate()===first.getDate();
    return false;
  }
  const eventsOn=day=>state.events.filter(x=>eventOccursOn(x,day)).map(x=>({...x,date:day}));
  const taskDueOn=day=>getList('tasks')?.items.filter(x=>x.category==='todo'&&!x.done&&x.due===day)||[];
  const taskDueSoon=()=>getList('tasks')?.items.filter(x=>x.category==='todo'&&!x.done&&x.due&&x.due<=dateKey())||[];
  ensureHabitDay();
  const save=()=>{if(dataLoadError){showToast('旧データを保護中です。バックアップの復元を利用してください。');return false;}try{const old=localStorage.getItem(STORE_KEY);if(old){try{const test=JSON.parse(old);if(test&&Array.isArray(test.links)&&Array.isArray(test.lists))localStorage.setItem(STORE_KEY+'-last-good',old);}catch(_){}}localStorage.setItem(STORE_KEY,JSON.stringify(state));storageAvailable=true;return true;}catch(error){storageAvailable=false;showToast('保存できませんでした。設定を確認してください。');return false;}};
  const mutate=fn=>{fn();save();render();};
  let toastTimer;
  function showToast(message){const node=$('#toast');node.textContent=message;node.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),2300);}
  const iconTile=(icon,color='purple',data='')=>tile(icon,color,data);
  function launcherIcon(link,color='blue'){
    if(!imageDataOk(link.iconImage)){
      const src=link.id===CIVILIZATION_ID?'./games/civilization/icon-192.png':
        link.id===CLAY_ID?'./games/clay-clicker/icon.svg':null;
      if(src)return `<span class="icon-tile tile-${color}"><img src="${src}" alt="" class="custom-link-icon"></span>`;
    }
    return iconTile(link.iconKey||link.icon,color,link.iconImage);
  }
  const builtinGameLabel=link=>
    (link.id===CIVILIZATION_ID&&link.url===CIVILIZATION_URL)||
    (link.id===CLAY_ID&&link.url===CLAY_URL);
  const pageHeading=(title,desc)=>`<div class="topbar"><div><p class="kicker"><span class="brand-icon-mini" aria-hidden="true">${imageDataOk(state.prefs.appIconImage)?`<img src="${state.prefs.appIconImage}" alt="">`:svgIcon(state.prefs.appIconKey||'grid')}</span>${esc(state.prefs.appName||'My Toolbox')} · 1.1.4</p><h1>${esc(title)}</h1></div><div class="header-actions"><button type="button" class="circle-button menu-trigger" data-action="toggle-drawer" aria-label="クイックメニューを開く" aria-haspopup="dialog" aria-expanded="${ui.drawerOpen}">☰</button></div></div>${desc?`<p class="page-intro">${esc(desc)}</p>`:''}`;
  const empty=(icon,message)=>`<div class="empty"><div class="empty-icon">${icon}</div>${message}</div>`;
  const listStats = id => {const list=getList(id);return list?counts(list.items):{done:0,total:0};};
  const countPending = id => {const s=listStats(id);return s.total-s.done;};

  function agendaRows(date,limit=999){
    const entries=sortedEvents(date);
    if(!entries.length)return `<div class="agenda-empty">予定はまだありません。<button type="button" data-action="add-event" data-date="${esc(date)}">＋ 予定を追加</button></div>${taskDueOn(date).length?`<div class="agenda-tasks"><b>この日が期限のTODO</b>${taskDueOn(date).map(x=>`<button class="tiny-link" data-action="edit-task" data-id="${esc(x.id)}">${esc(x.title)} ›</button>`).join('')}</div>`:''}`;
    return `${entries.slice(0,limit).map(event=>`<div class="agenda-row">
      <span class="agenda-time">${esc(eventTimeLabel(event))}</span>
      <button type="button" class="agenda-main" data-action="edit-event" data-id="${esc(event.id)}"><strong>${esc(event.title)}</strong>${event.location?`<small>${esc(event.location)}</small>`:''}</button>
      <button type="button" class="agenda-external" data-action="google-event" data-id="${esc(event.id)}" data-date="${esc(date)}" title="Googleカレンダーに追加" aria-label="${esc(event.title)}をGoogleカレンダーで登録">↗</button>
    </div>`).join('')}${entries.length>limit?`<button class="tiny-link" data-action="calendar-date" data-date="${esc(date)}">ほか ${entries.length-limit} 件を見る ›</button>`:''}${taskDueOn(date).length?`<div class="agenda-tasks"><b>この日が期限のTODO</b>${taskDueOn(date).slice(0,5).map(x=>`<button type="button" class="tiny-link" data-action="edit-task" data-id="${esc(x.id)}">${esc(x.title)} ›</button>`).join('')}</div>`:''}`;
  }
  function todayPanel(){
    const date=dateKey();
    const todo=getList('tasks')?.items.filter(x=>!x.done && x.category!=='shopping' && (!x.due||x.due<=date))||[];
    const today=new Date().toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
    return `<section class="today-panel" aria-label="今日の予定とTODO">
      <div class="today-title"><div><span class="today-date">${esc(today)}</span></div><button type="button" class="today-cal" data-action="calendar-date" data-date="${date}">カレンダー ›</button></div>
      <div class="today-block"><div class="today-block-head"><strong class="icon-heading">${svgIcon('calendar')} 今日の予定</strong><button type="button" data-action="add-event" data-date="${date}">＋ 予定</button></div>${agendaRows(date,3)}</div>
      <div class="today-block"><div class="today-block-head"><strong class="icon-heading">${svgIcon('check')} TODO <span class="today-count">${todo.length}</span></strong><button type="button" data-action="go" data-page="lists" data-list="tasks">すべて見る ›</button></div>
      ${todo.length?todo.slice(0,5).map(x=>`<div class="today-todo"><button type="button" class="check-button" data-action="toggle-item" data-list="tasks" data-id="${esc(x.id)}" aria-label="完了にする">✓</button><span>${esc(x.title)}${x.due?` <small class="due-label">${x.due<date?'期限超過':'今日まで'}</small>`:''}</span></div>`).join('')+(todo.length>5?`<button class="tiny-link" data-action="go" data-page="lists" data-list="tasks">あと ${todo.length-5} 件 ›</button>`:''):'<p class="today-empty">未完了のTODOはありません。</p>'}</div>
    </section>`;
  }
  function habitCard(){
    const entries=state.habits.items.filter(x=>x.title.trim());
    const completed=entries.length===3&&entries.every(x=>x.done);
    return `<section class="today-block habit-block ${completed?'habit-complete':''}" aria-label="毎日やること">
      <div class="today-block-head"><strong class="icon-heading">${svgIcon('check')} 毎日やること <span class="today-count">${entries.filter(x=>x.done).length}/3</span></strong><button type="button" data-action="go" data-page="habits">編集 ›</button></div>
      <div class="habit-content">${entries.length?state.habits.items.map(x=>x.title.trim()?`<div class="today-todo habit-row ${x.done?'habit-done':''}"><button type="button" class="check-button ${x.done?'checked':''}" data-action="toggle-habit" data-id="${esc(x.id)}" aria-pressed="${x.done}" aria-label="${esc(x.title)}を${x.done?'未完了':'完了'}にする">${x.done?'✓':''}</button><span>${esc(x.title)}</span></div>`:'').join(''):'<p class="today-empty">「毎日やること」から3つの習慣を設定できます。</p>'}
      </div>${completed?`<div class="habit-success-overlay" role="status">${svgIcon('check')}<strong>今日の目標、すべて達成！</strong><span>3 / 3 完了</span></div>`:''}
      <p class="habit-reset-note">毎日 午前4:00にチェックをリセット</p>
    </section>`;
  }
  function habitHistory(){
    const [year,month]=ui.habitMonth.split('-').map(Number),first=new Date(year,month-1,1),offset=(first.getDay()+6)%7,days=new Date(year,month,0).getDate();
    const records=state.habits.history||{},today=habitDay();
    const calendar=Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>{const n=i-offset+1;if(n<1||n>days)return '<span></span>';const day=`${ui.habitMonth}-${String(n).padStart(2,'0')}`;const items=records[day]?.items||[],filled=items.filter(x=>x.title?.trim()),num=filled.filter(x=>x.done).length,complete=filled.length===3&&num===3;return `<div class="habit-day ${complete?'fully-done':num?'partly-done':''} ${day===today?'current':''}" title="${esc(day)}: ${num}/${filled.length}件完了"><span>${n}</span>${items.length?`<small>${num}/3</small>`:''}</div>`;}).join('');
    const completeDays=Object.entries(records).filter(([k,r])=>k<=today&&r.items?.filter(x=>x.title?.trim()).length===3&&r.items.every(x=>x.done)).map(([k])=>k).sort();
    let streak=0,day=today;for(let i=0;i<450;i++){if(completeDays.includes(day)){streak++;day=nextDate(day,-1);}else if(i===0){day=nextDate(day,-1);}else break;}
    const monthDays=Object.entries(records).filter(([k])=>k.startsWith(ui.habitMonth)&&k<=today),monthFinished=monthDays.filter(([,r])=>r.items?.filter(x=>x.title?.trim()).length===3&&r.items.every(x=>x.done)).length;
    return `<section class="card habit-history"><div class="section-heading"><h2>達成履歴</h2><span class="streak">${streak}日連続達成</span></div><div class="stats-row"><span>今月の全達成 <b>${monthFinished}日</b></span><span>記録日数 <b>${monthDays.length}日</b></span></div><div class="cal-month-bar"><button type="button" class="cal-arrow" data-action="habit-shift" data-step="-1">‹</button><h3>${year}年${month}月</h3><button type="button" class="cal-arrow" data-action="habit-shift" data-step="1">›</button></div><div class="habit-calendar">${['月','火','水','木','金','土','日'].map(x=>`<strong>${x}</strong>`).join('')}${calendar}</div><p class="folder-hint">濃い色は3項目すべて達成、薄い色は一部達成。1日は午前4:00に切り替わります。今月の達成率（記録日基準）：${monthDays.length?Math.round(100*monthFinished/monthDays.length):0}%</p></section>`;
  }
  function habits(){
    return `${pageHeading('毎日やること','毎日続けたいことを3つ設定できます。チェックは午前4時にリセットされます。')}
      <section class="card habit-settings"><h2>毎日の3つの習慣</h2><p class="folder-hint">空欄の項目はホームに表示されません。3つ設定してすべて完了すると達成メッセージが表示されます。</p>
      <form data-form="habits">${state.habits.items.map((x,i)=>`<label class="habit-edit-row"><span>${i+1}</span><input class="field" name="habit${i}" maxlength="100" placeholder="例：読書を10分する" value="${esc(x.title)}"></label>`).join('')}<button class="primary-btn" type="submit">保存する</button></form></section>
      <div class="card habit-preview"><h2>今日の進捗</h2>${habitCard()}</div>${habitHistory()}`;
  }
  function home(){
    const favorites=state.links.filter(x=>x.favorite).slice(0,4);
    const orderedTools=[...TOOLS].sort((a,b)=>{const order=state.prefs.toolOrder||[];const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi);});
    const recent=state.notes.slice().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))[0];
    const sections={
      today:todayPanel(),
      search:`<section class="home-web"><form data-form="web-search" class="web-search-form"><span aria-hidden="true">${svgIcon('search')}</span><input class="field" name="query" enterkeyhint="search" autocomplete="off" placeholder="Webで検索" aria-label="Web検索のキーワード" required><button class="primary-btn" type="submit">検索</button></form><button type="button" class="tiny-link" data-action="go" data-page="search">${svgIcon('search')} 保存した項目を探す ›</button></section>`,
      habits:habitCard(),
      tools:`<div class="section-heading"><h2>ツールボックス</h2><button class="tiny-link" data-action="reorder-tools">並べ替え</button></div><div class="tool-grid">${orderedTools.map(t=>`<button type="button" class="tool-card" data-action="go" data-page="${t.id}" ${t.listId?`data-list="${t.listId}"`:''}><span class="tool-icon tile-${t.color}" aria-hidden="true">${svgIcon(t.icon)}</span><div><div class="tool-name">${t.name}</div><div class="tool-description">${t.desc}</div></div></button>`).join('')}</div>`,
      favorites:`<div class="section-heading"><h2>お気に入り</h2><span class="favorite-nav"><button class="tiny-link" data-action="go" data-page="links">リンク ›</button><button class="tiny-link" data-action="go" data-page="apps">アプリ ›</button></span></div>${favorites.length?`<div class="quick-links">${favorites.map(x=>`<button type="button" class="quick-card" data-link-id="${esc(x.id)}" data-action="open-link" data-id="${esc(x.id)}">${launcherIcon(x,'gray')}<span style="min-width:0"><div class="name">${esc(x.name)}</div><div class="meta">${esc(builtinGameLabel(x)?'内蔵ゲーム':urlLabel(x.url))}</div></span></button>`).join('')}</div>`:empty(svgIcon('bookmark'),'リンク・アプリの登録画面でお気に入りを設定できます。')}`,
      recent:`<div class="section-heading"><h2>最近のメモ</h2><button class="tiny-link" data-action="go" data-page="notes">一覧を見る ›</button></div>${recent?`<button type="button" class="note-peek" data-action="edit-note" data-id="${esc(recent.id)}"><div class="note-title">${esc(recent.title)}</div><div class="note-body">${esc(recent.body||'本文なし')}</div></button>`:empty(svgIcon('note'),'まだメモがありません。')}`
    };
    const order=HOME_SECTIONS.map(x=>x[0]).sort((a,b)=>{const prefs=state.prefs.homeSections||[];return (prefs.indexOf(a)<0?999:prefs.indexOf(a))-(prefs.indexOf(b)<0?999:prefs.indexOf(b));});
    return `${pageHeading('ホーム')}${!storageAvailable?'<div class="feature-tip"><p>保存データを読み込めませんでした。旧データを上書きしないよう保存を停止しています。設定からバックアップを復元するか、バックアップファイルを確保してご確認ください。</p></div>':''}${order.filter(id=>!(state.prefs.hiddenSections||[]).includes(id)).map(id=>sections[id]).join('')}`;
  }
  function shiftCalendarMonth(step){
    const [cy,cm]=ui.calendarMonth.split('-').map(Number),next=new Date(cy,cm-1+step,1);
    ui.calendarMonth=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;
    ui.selectedDate=`${ui.calendarMonth}-01`;render();
  }
  function calendar(){
    const [y,m]=ui.calendarMonth.split('-').map(Number);
    const first=new Date(y,m-1,1),offset=first.getDay();
    const count=new Date(y,m,0).getDate();
    const days=['日','月','火','水','木','金','土'];
    const cells=Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>{
      const num=i-offset+1;
      if(num<1 || num>count)return '<span class="cal-cell cal-blank" aria-hidden="true"></span>';
      const date=`${ui.calendarMonth}-${String(num).padStart(2,'0')}`;
      const events=eventsOn(date).length;const tasks=taskDueOn(date).length;
      return `<button type="button" class="cal-cell ${i%7===0?'cal-sunday':i%7===6?'cal-saturday':''} ${date===ui.selectedDate?'selected':''} ${date===dateKey()?'is-today':''}" data-action="calendar-select" data-date="${date}" aria-label="${num}日、${events}件の予定、${tasks}件のTODO" ${date===ui.selectedDate?'aria-pressed="true"':''}><span class="cal-daynum">${num}</span>${events||tasks?`<span class="cal-event-marker" aria-hidden="true">${events?'•'.repeat(Math.min(events,3)):''}${tasks?' ▪':''}</span>`:'<span class="cal-event-marker" aria-hidden="true">&nbsp;</span>'}</button>`;
    }).join('');
    const selected=new Date(`${ui.selectedDate}T12:00:00`).toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'long'});
    return `${pageHeading('マイカレンダー','予定はこのアプリ内で管理。大事な予定だけGoogleカレンダーに登録できます。')}
      <section class="card calendar-card">
        <div class="cal-month-bar"><button type="button" class="cal-arrow" data-action="calendar-shift" data-month="-1" aria-label="前月">‹</button><h2>${y}年 ${m}月</h2><div><button type="button" class="cal-today-btn" data-action="calendar-today">今日</button><button type="button" class="cal-arrow" data-action="calendar-shift" data-month="1" aria-label="翌月">›</button></div></div>
        <div class="calendar-swipe-zone" aria-label="左右にスワイプして月を切り替え"><div class="cal-weekdays">${days.map((d,i)=>`<span class="${i===0?'cal-sunday':i===6?'cal-saturday':''}">${d}</span>`).join('')}</div>
        <div class="cal-grid">${cells}</div></div>
      </section>
      <section class="calendar-agenda"><div class="section-heading"><h2>${esc(selected)} の予定</h2><button type="button" class="tiny-link" data-action="add-event" data-date="${esc(ui.selectedDate)}">＋ 追加</button></div>
        <div class="card agenda-card">${agendaRows(ui.selectedDate)}</div>
      </section>
      <div class="feature-tip"><span>${svgIcon('external')}</span><p><b>Googleカレンダーへの登録</b><br>予定の ↗ ボタンを押すと入力済みの登録画面が開きます。内容を確認して「保存」してください。自動同期ではないため、後からの変更は双方に反映されません。</p></div>`;
  }

  function timetableCell(day,period){return state.timetable.classes.find(c=>c.period===period&&c.days.includes(day));}
  function timetable(){
    const config=state.timetable,periods=config.periods;
    const header=`<div class="tt-row tt-head"><div class="tt-period-head">時限</div>${WEEKDAYS.map(d=>`<div class="tt-day-head">${d}</div>`).join('')}</div>`;
    const rows=periods.map((p,i)=>{
      const period=i+1;
      return `<div class="tt-row"><div class="tt-time"><b>${period}限</b><small>${esc(p.start)}<br>${esc(p.end)}</small></div>${WEEKDAYS.map((day,d)=>{
        const c=timetableCell(d,period);
        return c?`<button class="tt-cell tt-filled" type="button" data-action="timetable-edit" data-id="${esc(c.id)}" aria-label="${day}${period}限 ${esc(c.subject)} ${esc(c.room)}"><b>${esc(c.subject)}</b><small>${esc(c.room||'教室未設定')}</small>${c.days.length>1?`<span class="tt-linked" title="ほかの曜日と共有">${svgIcon('link')}</span>`:''}</button>`:
        `<button class="tt-cell tt-empty" type="button" data-action="timetable-add" data-day="${d}" data-period="${period}" aria-label="${day}${period}限に授業を登録"><span>＋</span></button>`;
      }).join('')}</div>`;
    }).join('');
    return `${pageHeading('時間割','月曜から金曜の授業を管理。複数曜日にリンクした授業は、どちらから編集しても同じ内容に更新されます。')}
      <section class="card timetable-card"><div class="section-heading"><h2>${svgIcon('timetable')} 週間時間割</h2><button type="button" class="secondary-btn" data-action="timetable-config">時限・時間を設定</button></div>
      <div class="tt-scroll" aria-label="月曜日から金曜日の時間割">${header}${rows}</div><p class="folder-hint">空欄をタップして登録。授業がある枠をタップすると編集できます。リンクマークの授業は同じデータを複数曜日で共有しています。</p></section>
      <section class="card tt-info"><h2>曜日のリンクについて</h2><p>授業登録画面で「月・木」または「火・金」を選ぶと、同じ時限の2枠が連動します。授業名・教室・メモを変更すると両方に反映されます。</p></section>`;
  }
  function timetableConfigModal(){
    const config=state.timetable;
    const defaults=defaultPeriodTimes();
    modal('時限数と開始・終了時刻',`<form data-form="period-config"><div class="form-group"><label>1日の時限数（月〜金共通）</label><select class="select" name="periodCount" id="period-count">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i+1===config.periods.length?'selected':''}>${i+1}限</option>`).join('')}</select></div>
      <div class="tt-periods-form">${Array.from({length:12},(_,i)=>{const p=config.periods[i]||defaults[i]||{start:'09:00',end:'10:30'};return `<div class="tt-period-setting" data-period-row="${i+1}" ${i>=config.periods.length?'hidden':''}><b>${i+1}限</b><label>開始<input class="field" name="start${i+1}" type="time" value="${esc(p.start)}"></label><label>終了<input class="field" name="end${i+1}" type="time" value="${esc(p.end)}"></label></div>`;}).join('')}</div><p class="folder-hint">時限数を減らした場合、削除対象となる時限の授業は確認のうえ削除されます。</p><button class="primary-btn" type="submit">設定を保存</button></form>`);
  }
  function timetableClassModal(id,dayArg=0,periodArg=1){
    const existing=state.timetable.classes.find(x=>x.id===id);
    const day=Number(dayArg),period=Number(periodArg);
    const days=existing?.days||[Math.max(0,Math.min(4,day))];
    const activePeriod=existing?.period||Math.max(1,Math.min(state.timetable.periods.length,period));
    modal(existing?'授業を編集':'授業を登録',`<form data-form="timetable-class" ${existing?`data-id="${esc(existing.id)}"`:''}>
      <div class="form-group"><label>授業名</label><input class="field" name="subject" maxlength="120" required placeholder="例：線形代数学" value="${esc(existing?.subject||'')}"></div>
      <div class="form-group"><label>教室</label><input class="field" name="room" maxlength="120" placeholder="例：A棟 302" value="${esc(existing?.room||'')}"></div>
      <div class="form-group"><label>時限</label><select class="select" name="period">${state.timetable.periods.map((_,i)=>`<option value="${i+1}" ${activePeriod===i+1?'selected':''}>${i+1}限（${esc(state.timetable.periods[i].start)}〜${esc(state.timetable.periods[i].end)}）</option>`).join('')}</select></div>
      <div class="form-group"><label>登録する曜日（同じ授業としてリンク）</label><div class="tt-day-choices">${WEEKDAYS.map((label,i)=>`<label class="tt-day-choice"><input type="checkbox" name="day" value="${i}" ${days.includes(i)?'checked':''}><span>${label}</span></label>`).join('')}</div>
      <div class="tt-pair-buttons"><button type="button" class="secondary-btn" data-action="timetable-pair" data-pair="0,3">月・木を選択</button><button type="button" class="secondary-btn" data-action="timetable-pair" data-pair="1,4">火・金を選択</button></div><small>複数曜日を選ぶと1件の授業として保存し、どの曜日からも共通の内容を編集できます。</small></div>
      <div class="form-group"><label>メモ（任意）</label><textarea class="text-area" name="note" rows="2" maxlength="700" placeholder="担当教員・持ち物など">${esc(existing?.note||'')}</textarea></div>
      <div class="modal-footer">${existing?`<button class="danger-btn" type="button" data-action="timetable-delete" data-id="${esc(existing.id)}">削除</button>`:''}<button class="primary-btn" type="submit">${existing?'変更を保存':'授業を登録'}</button></div></form>`);
  }
  function cubeGame(){
    const stickers=state.cube.stickers,solved=cubeIsSolved(stickers);
    const physical=CUBE_ORDER.map(face=>`<div class="rubiks-face face-${face}">${cubeFace(stickers,face)}</div>`).join('');
    const net=CUBE_ORDER.map(face=>`<div class="net-face net-${face}"><b>${face}</b><div class="net-squares">${cubeFace(stickers,face)}</div></div>`).join('');
    return `${pageHeading('ルービックキューブ','3×3×3のキューブ。シャッフルして、6面の回転操作で自分の力で揃えましょう。')}
      <section class="card cube-card"><div class="cube-status"><span class="${solved?'cube-status-done':'cube-status-mixed'}">${solved?'6面完成！':'挑戦中'}</span><small>${Number(state.cube.moveCount)||0} 手</small></div>
      <div class="rubiks-stage" aria-label="3Dキューブ。ドラッグすると見える向きが変わります" data-cube-rotate><div class="rubiks-body" style="transform:rotateX(${ui.cubePitch}deg) rotateY(${ui.cubeYaw}deg)">${physical}</div></div>
      <p class="cube-hint">キューブを指でドラッグすると向きが変わります。回転ボタンで面を動かせます。</p>
      <div class="cube-top-controls"><button class="secondary-btn" data-action="cube-scramble">${svgIcon('bolt')} シャッフル</button><button class="secondary-btn" data-action="cube-undo" ${state.cube.history.length?'':'disabled'}>${svgIcon('arrow-up')} 1手戻す</button><button class="secondary-btn" data-action="cube-reset">揃え直す</button></div>
      <div class="cube-turns">${CUBE_ORDER.map(face=>`<div class="cube-turn-group"><span class="cube-face-label">${face}</span><button data-action="cube-turn" data-move="${face}" aria-label="${face}面を時計回り">${face} ↻</button><button data-action="cube-turn" data-move="${face}'" aria-label="${face}面を反時計回り">${face} ↺</button><button data-action="cube-turn" data-move="${face}2" aria-label="${face}面を180度回転">180°</button></div>`).join('')}</div>
      <div class="cube-footer"><button class="tiny-link" data-action="cube-net">${ui.cubeNet?'展開図を閉じる':'6面の展開図を見る'} ›</button>${ui.cubeNet?`<div class="cube-net">${net}</div>`:''}<p class="folder-hint">記号：U=上、D=下、L=左、R=右、F=前、B=後。↻ は面の正面から見て時計回り。シャッフルは完成状態から25手で生成されます。</p>${state.cube.scramble?`<p class="cube-scramble">前回のシャッフル：${esc(state.cube.scramble)}</p>`:''}</div></section>`;
  }
  function cubeMove(move,remember=true){
    const face=move[0],dir=move.endsWith('2')?2:move.endsWith("'")?-1:1;
    if(!CUBE_FACES[face])return;
    state.cube.stickers=turnCube(state.cube.stickers,face,dir);
    if(remember){state.cube.history.push(move);state.cube.history=state.cube.history.slice(-500);state.cube.moveCount++;}
  }
  function cubeScramble(){
    const suffixes=['',"'",'2'],moves=[];
    const values=new Uint32Array(50);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(values);else for(let i=0;i<values.length;i++)values[i]=Math.floor(Math.random()*0xffffffff);
    let previous='';
    for(let i=0;i<25;i++){const choices=CUBE_ORDER.filter(f=>f!==previous);const face=choices[values[i*2]%choices.length];previous=face;moves.push(face+suffixes[values[i*2+1]%3]);}
    state.cube.stickers=solvedCube();state.cube.history=[];state.cube.moveCount=0;
    moves.forEach(move=>cubeMove(move,false));state.cube.scramble=moves.join(' ');
    save();render();showToast('25手でシャッフルしました。');
  }
  function applyBrand(){
    const brand=state.prefs.appName||'My Toolbox';document.title=brand;
    const apple=document.querySelector('meta[name="apple-mobile-web-app-title"]');if(apple)apple.content=brand;
    const image=state.prefs.appIconImage;
    const icon=imageDataOk(image)?image:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="27" fill="#253655"/><g transform="translate(18,18) scale(3.8)" fill="none" stroke="#d4e5ff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${ICONS[state.prefs.appIconKey]||ICONS.grid}</g></svg>`)}`;
    const favicon=document.querySelector('link[rel="icon"]');if(favicon)favicon.href=icon;
    const topIcon=document.querySelector('.brand-icon-mini');if(topIcon)topIcon.innerHTML=imageDataOk(image)?`<img src="${image}" alt="">`:svgIcon(state.prefs.appIconKey||'grid');
  }
  function appBrandModal(){
    const key=state.prefs.appIconKey||'grid';
    modal('アプリ名とアイコン',`<form data-form="app-brand"><div class="form-group"><label>アプリの表示名</label><input class="field" name="appName" maxlength="32" required value="${esc(state.prefs.appName||'My Toolbox')}"></div>${iconPicker(key)}
      <div class="form-group"><label>好きな画像を設定する（任意）</label><input class="field" type="file" id="brand-icon-file" accept="image/*"><div class="icon-image-preview" id="brand-image-preview">${imageDataOk(state.prefs.appIconImage)?`<img src="${state.prefs.appIconImage}" alt="アプリアイコン">`:svgIcon(key)}<button type="button" class="secondary-btn" data-action="brand-icon-clear">画像を解除</button></div><input type="hidden" name="appIconImage" id="brand-icon-image" value="${imageDataOk(state.prefs.appIconImage)?state.prefs.appIconImage:''}"></div><button type="submit" class="primary-btn">名前とアイコンを保存</button></form><p class="folder-hint">PWA内のアイコンはすぐに変わりますが、Safariの「ホーム画面に追加」で使う画像は、サイトが公開する apple-touch-icon から取得されます。アイコンを選んで保存したら、下の「サイト更新用ZIP」を作成し、GitHub Pagesで公開中のリポジトリへ、ZIPを展開してファイルを上書きアップロードしてください。Safariで公開サイトを開き、ホーム画面に追加すると指定アイコンが使われます（iOSのキャッシュにより再追加が必要な場合があります）。操作前にデータをバックアップしてください。</p><button type="button" class="secondary-btn" data-action="brand-export">ホーム画面用のサイト更新ZIPを作成</button>`);
  }
  async function readBrandFile(file){
    if(!file)return;if(!file.type.startsWith('image/')||file.size>12*1024*1024){showToast('12MB以下の画像を選んでください。');return;}
    try{
      // Keep significantly more detail than the old 90px thumbnail while ensuring
      // the image stays within the existing localStorage validation limit.
      const data=await new Promise((resolve,reject)=>{
        const img=new Image(),url=URL.createObjectURL(file);
        img.onload=async()=>{
          try{
            const c=document.createElement('canvas');c.width=c.height=384;
            const ctx=c.getContext('2d');if(!ctx)throw Error('canvas');
            ctx.fillStyle='#eaf3ff';ctx.fillRect(0,0,384,384);
            const side=Math.min(img.naturalWidth,img.naturalHeight);
            ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,384,384);
            // WebP is typically much smaller for detailed app icons on iOS.
            // Fall back to JPEG, lowering quality only if storage requires it.
            let selected='';
            for(const type of ['image/webp','image/jpeg']){
              for(const q of [.88,.78,.66,.52,.38]){
                const blob=await new Promise(res=>c.toBlob(res,type,q));
                if(!blob || (type==='image/webp'&&blob.type!=='image/webp'))continue;
                const value=await blobDataURL(blob);
                if(imageDataOk(value)){selected=value;break;}
              }
              if(selected)break;
            }
            if(!selected)throw Error('too large');resolve(selected);
          }catch(error){reject(error);}finally{URL.revokeObjectURL(url);}
        };
        img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('image read'));};
        img.src=url;
      });
      const field=$('#brand-icon-image'),preview=$('#brand-image-preview');if(!field||!preview)return;
      field.value=data;preview.querySelector('img,svg')?.remove();
      preview.insertAdjacentHTML('afterbegin',`<img src="${data}" alt="新しいアイコン">`);
    }catch{showToast('アイコン画像を読み込めませんでした。');}
  }


  // Export a complete ready-to-redeploy site ZIP. This is required because installed
  // Home Screen icons are taken from static manifest / apple-touch-icon assets.
  function zipStore(entries){
    const encoder=new TextEncoder(),local=[],central=[];let offset=0;
    function header(length,fn){const data=new Uint8Array(length),view=new DataView(data.buffer);fn(view);return data;}
    function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1) ^ ((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
    for(const [name,bytes] of entries){
      const filename=encoder.encode(name),size=bytes.length,crc=crc32(bytes);
      const h=header(30,v=>{v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc,true);v.setUint32(18,size,true);v.setUint32(22,size,true);v.setUint16(12,0x0021,true);v.setUint16(26,filename.length,true);});
      local.push(h,filename,bytes);
      const c=header(46,v=>{v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint32(16,crc,true);v.setUint32(20,size,true);v.setUint32(24,size,true);v.setUint16(14,0x0021,true);v.setUint16(28,filename.length,true);v.setUint32(42,offset,true);});
      central.push(c,filename);offset+=h.length+filename.length+size;
    }
    const centralLength=central.reduce((a,part)=>a+part.length,0),end=header(22,v=>{v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralLength,true);v.setUint32(16,offset,true);});
    return new Blob([...local,...central,end],{type:'application/zip'});
  }
  async function brandedPng(size){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvasを利用できません');
    const picture=new Image();
    const src=imageDataOk(state.prefs.appIconImage)?state.prefs.appIconImage:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="26" fill="#253655"/><g transform="translate(19,19) scale(3.75)" fill="none" stroke="#d4e5ff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[state.prefs.appIconKey]||ICONS.grid}</g></svg>`)}`;
    await new Promise((resolve,reject)=>{picture.onload=resolve;picture.onerror=reject;picture.src=src;});
    ctx.fillStyle='#253655';ctx.fillRect(0,0,size,size);
    const scale=Math.max(size/picture.naturalWidth,size/picture.naturalHeight),w=picture.naturalWidth*scale,h=picture.naturalHeight*scale;
    ctx.drawImage(picture,(size-w)/2,(size-h)/2,w,h);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG作成エラー')),'image/png'));
    return new Uint8Array(await blob.arrayBuffer());
  }
  async function exportBrandPackage(){
    if(!confirm('最新のアプリ名・アイコンでサイト更新用ZIPを作りますか？ 使用中の端末データは、更新前に必ずJSONバックアップを保存してください。'))return;
    try{
      const files=['index.html','app.js','styles.css','sw.js','README.md'];
      const texts=await Promise.all(files.map(async name=>{const response=await fetch('./'+name,{cache:'no-store'});if(!response.ok)throw Error(name+'の取得に失敗');return await response.text();}));
      const brand=state.prefs.appName||'My Toolbox',nameHtml=esc(brand);
      const manifestResponse=await fetch('./manifest.webmanifest',{cache:'no-store'});if(!manifestResponse.ok)throw Error('manifestを取得できません');
      const manifest=await manifestResponse.json();manifest.name=brand;manifest.short_name=brand.slice(0,25);
      const stamp=Date.now().toString(36);
      texts[0]=texts[0].replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*("\s*\/>)/,(_,a,b)=>a+nameHtml+b)
        .replace(/<title>[^<]*<\/title>/,`<title>${nameHtml}</title>`)
        .replace(/(rel="apple-touch-icon"[^>]*href="[^"?]+)(?:\?[^"]*)?("[^>]*>)/,(_,a,b)=>a+'?brand='+stamp+b)
        .replace(/(rel="icon"[^>]*href="[^"?]+)(?:\?[^"]*)?("[^>]*>)/,(_,a,b)=>a+'?brand='+stamp+b);
      manifest.icons=manifest.icons.map(icon=>({...icon,src:icon.src.replace(/\?.*$/,'')+'?brand='+stamp}));
      // A different cache name forces the existing service worker to refresh static icon assets.
      texts[3]=texts[3].replace(/(const CACHE_VERSION = ')[^']+(';)/,(_,a,b)=>a+`v1.1.5-github-pages-brand-${stamp}`+b);
      const encode=new TextEncoder(),entries=files.map((name,i)=>[name,encode.encode(texts[i])]);
      entries.push(['manifest.webmanifest',encode.encode(JSON.stringify(manifest,null,2))]);
      entries.push(['.nojekyll',new Uint8Array(0)]);
      // Do not lose the integrated game when exporting a custom-icon website ZIP.
      // Copy the CURRENT published files, so game updates remain independently replaceable.
      const bundledText=['recovery.html','SAFE_GAME_FIX.md','INTEGRATION_GUIDE.md','game-player.html','games/civilization/index.html','games/civilization/game.js','games/civilization/style.css','games/civilization/manifest.webmanifest','games/civilization/README.md',
        'games/clay-clicker/index.html','games/clay-clicker/game.js','games/clay-clicker/style.css',
        'games/clay-clicker/icon.svg'];
      const bundledImages=['games/civilization/icon-180.png','games/civilization/icon-192.png','games/civilization/icon-512.png'];
      for(const path of bundledText){const response=await fetch('./'+path,{cache:'no-store'});if(!response.ok)throw Error(path+'の取得に失敗');entries.push([path,encode.encode(await response.text())]);}
      for(const path of bundledImages){const response=await fetch('./'+path,{cache:'no-store'});if(!response.ok)throw Error(path+'の取得に失敗');entries.push([path,new Uint8Array(await response.arrayBuffer())]);}
      for(const [file,size] of [['icons/icon-192.png',192],['icons/icon-512.png',512],['icons/apple-touch-icon.png',180],['icons/icon-1024.png',1024]])entries.push([file,await brandedPng(size)]);
      const zip=zipStore(entries),url=URL.createObjectURL(zip),a=document.createElement('a');a.href=url;a.download='my-toolbox-custom-home-icon.zip';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
      showToast('サイト更新用ZIPを保存しました。');
    }catch(error){console.warn(error);showToast('ZIPを作成できません。GitHub Pagesの公開URLで開いてお試しください。');}
  }

  function urlLabel(url){try{const u=new URL(url);return u.hostname||u.protocol.replace(':','');}catch{return url;}}
  const folderField=kind=>kind==='web'?'folderWeb':kind==='game'?'folderGame':'folderApp';
  const searchField=kind=>kind==='web'?'linkSearch':kind==='game'?'gameSearch':'appSearch';
  function knownFolders(kind){
    const saved=state.prefs.folders?.[kind]||[];
    const fromItems=state.links.filter(x=>x.kind===kind).map(x=>x.folder).filter(Boolean);
    return [...new Set([...saved,...fromItems])];
  }
  function launcher(kind){
    const currentFolder=ui[folderField(kind)],q=ui[searchField(kind)].toLowerCase();
    const all=state.links.filter(x=>x.kind===kind);
    const folders=knownFolders(kind);
    const filtered=all.filter(x=>(currentFolder==='__all__'||(x.folder||'')===(currentFolder==='__uncategorized__'?'':currentFolder)) && [x.name,x.url,x.category].join(' ').toLowerCase().includes(q)).sort((a,b)=>{const order=state.prefs.linkOrder||[];const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi);});
    const title=kind==='web'?'リンク':kind==='game'?'ゲーム':'アプリ';
    const desc=kind==='web'?'よく使うWebサイトをまとめて開けます。':kind==='game'?'ゲームを起動するリンクを管理します。':'アプリの起動リンクを管理します。';
    return `${pageHeading(title,desc)}
    ${kind==='game'?`<section class="card built-in-game"><div class="section-heading"><h2>${svgIcon('cube')} 内蔵ゲーム</h2><span class="tagline">オフライン対応</span></div><button type="button" class="builtin-game-card" data-action="go" data-page="cube"><span class="icon-tile tile-blue">${svgIcon('cube')}</span><span><b>3×3×3 ルービックキューブ</b><small>回転・シャッフル・自力で解く</small></span><span aria-hidden="true">›</span></button></section>`:''}
    <div class="toolbar"><input class="search-input" data-search="${kind==='web'?'link':kind==='game'?'game':'app'}" type="search" placeholder="${title}を検索" aria-label="${title}を検索" value="${esc(ui[searchField(kind)])}"><button class="primary-btn" data-action="add-link" data-kind="${kind}">＋ 登録</button></div>
    <div class="folder-strip"><button class="folder-chip ${currentFolder==='__all__'?'selected':''}" data-action="select-folder" data-kind="${kind}" data-folder="__all__">すべて</button>${folders.map(f=>`<button class="folder-chip ${currentFolder===f?'selected':''}" data-action="select-folder" data-kind="${kind}" data-folder="${esc(f)}">${svgIcon('folder')} ${esc(f)}</button>`).join('')}<button class="folder-chip" data-action="new-folder" data-kind="${kind}">＋ フォルダ</button><button class="folder-chip ${currentFolder==='__uncategorized__'?'selected':''}" data-action="select-folder" data-kind="${kind}" data-folder="__uncategorized__">未分類</button></div>
    <p class="folder-hint">「すべて」は全項目、「未分類」はフォルダ未設定の項目を表示します。</p><button class="tiny-link" data-action="reorder-links" data-kind="${kind}" data-folder="${esc(currentFolder)}">順序変更</button>
    ${filtered.length?`<div class="link-list">${filtered.map(link=>`<div class="link-card" data-link-id="${esc(link.id)}">
      <button type="button" class="link-open" data-action="open-link" data-id="${esc(link.id)}">${launcherIcon(link,kind==='web'?'purple':'blue')}<span style="min-width:0;width:100%"><div class="card-name">${esc(link.name)}</div><div class="card-url">${esc(builtinGameLabel(link)?'内蔵ゲーム · オフライン対応':urlLabel(link.url))}</div></span></button>
      <div class="link-actions"><button type="button" data-action="favorite-link" data-id="${esc(link.id)}" aria-label="お気に入り切替" class="${link.favorite?'favorite':''}">${link.favorite?'★ お気に入り':'☆ お気に入り'}</button><button type="button" data-action="edit-link" data-id="${esc(link.id)}">編集 ›</button></div>
    </div>`).join('')}</div>`:empty(svgIcon(kind==='game'?'game':'search'),'このフォルダには登録がありません。＋ から追加できます。')}`;
  }
  function links(){return launcher('web');}
  function apps(){return launcher('app');}
  function games(){return launcher('game');}
  function lists(){
    if(!getList(ui.listId))ui.listId='tasks';
    const list=getList(ui.listId),isTasks=list.id==='tasks';
    const done=counts(list.items),pct=done.total?Math.round(done.done/done.total*100):0;
    const items=isTasks && ui.taskFilter!=='all'?list.items.filter(item=>item.category===ui.taskFilter):list.items;
    const kindLabel=category=>category==='shopping'?'買い物':'TODO';
    return `${pageHeading('マイリスト','TODOと買い物を一つのチェックリストで管理。別の目的のリストも増やせます。')}
      <div class="list-switch">${state.lists.map(x=>`<button type="button" class="pill ${ui.listId===x.id?'active':''}" data-action="list-select" data-id="${esc(x.id)}">${svgIcon(x.iconKey||legacyIcon(x.icon,'list'))} ${esc(x.name)}</button>`).join('')}<button type="button" class="pill" data-action="add-list">＋ 新規</button></div>
      <section class="card">
        <div class="list-header"><div><h2>${svgIcon(list.iconKey||legacyIcon(list.icon,'list'))} ${esc(list.name)}</h2><p class="list-subtitle">${done.total} 件中 ${done.done} 件完了</p></div>${!list.builtin?`<button type="button" class="secondary-btn" data-action="edit-list" data-id="${esc(list.id)}">編集</button>`:''}</div>
        <div class="progress-line"><div style="width:${pct}%"></div></div>
        ${isTasks?`<div class="task-filters" aria-label="種類で絞り込む">${[['all','すべて'],['todo','TODO'],['shopping','買い物']].map(([value,label])=>`<button type="button" class="task-filter ${ui.taskFilter===value?'active':''}" data-action="task-filter" data-filter="${value}" aria-pressed="${ui.taskFilter===value}">${label}</button>`).join('')}</div>`:''}
        <form data-form="item" data-list-id="${esc(list.id)}" class="add-row task-add-row">
          ${isTasks?`<select class="select task-category-select" name="category" aria-label="追加する項目の種類"><option value="todo" ${ui.taskFilter!=='shopping'?'selected':''}>TODO</option><option value="shopping" ${ui.taskFilter==='shopping'?'selected':''}>買い物</option></select>`:''}
          <input class="field" name="title" required maxlength="500" placeholder="項目を入力" aria-label="新しいリスト項目" autocomplete="off"><button class="primary-btn" type="submit">追加</button>
        </form>
        ${isTasks?`<div class="task-advanced"><button type="button" class="tiny-link" data-action="edit-task">＋ 期限・繰り返しを指定してTODOを追加</button></div>`:''}
        <div class="mini-list" style="margin-top:15px">${items.length?items.map(item=>`<div class="check-row ${item.done?'done':''}">
          <button type="button" class="check-button ${item.done?'checked':''}" data-action="toggle-item" data-list="${esc(list.id)}" data-id="${esc(item.id)}" aria-label="${item.done?'未完了に戻す':'完了にする'}">✓</button>
          <span class="task-title">${esc(item.title)}${item.due?`<small class="due-label">${item.due<dateKey()?'期限超過 · ':''}${esc(item.due)}${item.repeat&&item.repeat!=='none'?' · 繰り返し':''}</small>`:''}</span>${isTasks?`<button type="button" class="item-move" data-action="edit-task" data-id="${esc(item.id)}" aria-label="項目の編集">${svgIcon('note')}</button>`:''}<button class="item-move" type="button" data-action="item-up" data-list="${esc(list.id)}" data-id="${esc(item.id)}" aria-label="上に移動">${svgIcon('arrow-up')}</button><button class="item-move" type="button" data-action="item-down" data-list="${esc(list.id)}" data-id="${esc(item.id)}" aria-label="下に移動">${svgIcon('arrow-down')}</button>${isTasks?`<span class="task-kind ${item.category==='shopping'?'is-shopping':'is-todo'}">${kindLabel(item.category)}</span>`:''}<button class="ghost-btn" type="button" data-action="delete-item" data-list="${esc(list.id)}" data-id="${esc(item.id)}" aria-label="削除">×</button>
        </div>`).join(''):empty(svgIcon('list'),isTasks?'該当する項目はありません。上の入力欄から追加できます。':'項目はまだありません。上の入力欄から追加してください。')}</div>
        ${done.done?`<button type="button" class="tiny-link" style="margin-top:8px" data-action="clear-completed" data-list="${esc(list.id)}">完了した ${done.done} 件を削除</button>`:''}
      </section>`;
  }
  function notes(){
    const q=ui.noteSearch.toLowerCase();
    const filtered=state.notes.filter(x=>(x.title+' '+x.body).toLowerCase().includes(q)).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
    return `${pageHeading('クイックメモ','買い物のアイデアや、次に追加したい機能のメモにも。')}
      <div class="toolbar"><input class="search-input" type="search" data-search="note" placeholder="メモを検索" aria-label="メモを検索" value="${esc(ui.noteSearch)}"><button class="primary-btn" data-action="add-note">＋ 新規メモ</button></div>
      <div class="notes-grid">${filtered.length?filtered.map(note=>`<article class="note-card" data-note-id="${esc(note.id)}"><div class="note-top"><div><h3>${esc(note.title)}</h3></div><button type="button" class="ghost-btn" data-action="edit-note" data-id="${esc(note.id)}">編集 ›</button></div>
        <p>${esc(note.body||'本文なし')}</p><div class="note-bottom"><span>更新 ${esc(shortDate(note.updatedAt))}</span><button type="button" class="ghost-btn" data-action="delete-note" data-id="${esc(note.id)}">削除</button></div></article>`).join(''):empty(svgIcon('note'),'メモがまだありません。＋ から追加しましょう。')}</div>`;
  }
  // Photos live in IndexedDB, not localStorage. Binary image data is never uploaded.
  const PHOTO_DB = 'my-toolbox-photos-v1';
  let photoDBPromise;
  let photoEntries=[];
  let photoThumbnails=[];
  let photoLoadCounter=0;
  let viewerURL=null;
  function photoDB(){
    if(!('indexedDB' in window))return Promise.reject(Error('この環境では写真保存を利用できません。'));
    if(!photoDBPromise){photoDBPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(PHOTO_DB,1);
      req.onupgradeneeded=()=>req.result.createObjectStore('photos',{keyPath:'id'});
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||Error('写真の保存領域を開けません。'));
    }).catch(error=>{photoDBPromise=null;throw error;});}
    return photoDBPromise;
  }
  async function photoAll(){
    const db=await photoDB();return new Promise((resolve,reject)=>{
      const req=db.transaction('photos','readonly').objectStore('photos').getAll();
      req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);
    });
  }
  async function photoGet(id){const db=await photoDB();return new Promise((resolve,reject)=>{const req=db.transaction('photos','readonly').objectStore('photos').get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function photoPut(record){const db=await photoDB();return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(record);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  async function photoDelete(id){const db=await photoDB();return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  async function photoReplace(records){const db=await photoDB();return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');const store=tx.objectStore('photos');store.clear();records.forEach(record=>store.put(record));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  function photoCanvas(file,maxSide=1600,quality=.82){
    return new Promise((resolve,reject)=>{
      const img=new Image();const url=URL.createObjectURL(file);
      img.onload=()=>{
        try{
          const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
          const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
          canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
          canvas.toBlob(blob=>{URL.revokeObjectURL(url);blob?resolve(blob):reject(Error('画像を変換できません。JPEG/PNG画像でお試しください。'));},'image/jpeg',quality);
        }catch(error){URL.revokeObjectURL(url);reject(error);}
      };
      img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('写真を読み取れません。JPEG/PNG画像でお試しください。'));};
      img.src=url;
    });
  }
  async function photoAddFiles(files){
    if(!files?.length)return;
    let added=0;
    for(const file of Array.from(files).slice(0,30)){
      if(!file.type.startsWith('image/'))continue;
      try{
        const blob=await photoCanvas(file);
        const thumb=await photoCanvas(blob,360,.7);
        await photoPut({id:uid(),name:file.name.replace(/\.[^.]+$/,'').slice(0,140)||'写真',createdAt:new Date().toISOString(),album:ui.photoAlbum==='__all__'||ui.photoAlbum==='__uncategorized__'?'':ui.photoAlbum,tags:[],caption:'',blob,thumb});added++;
      }catch(error){alert('画像「'+file.name+'」を保存できませんでした。\n'+error.message);}
    }
    await refreshPhotos();showToast(added+'枚の写真を保存しました。');
  }
  function photoURLClear(){for(const url of photoThumbnails)URL.revokeObjectURL(url);photoThumbnails=[];}
  async function refreshPhotos(){
    const sequence=++photoLoadCounter;
    const target=$('#photo-gallery');if(!target)return;
    try{
      const records=(await photoAll()).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
      if(sequence!==photoLoadCounter||ui.page!=='photos'||!$('#photo-gallery'))return;
      photoURLClear();photoEntries=records;
      const q=ui.photoSearch.trim().toLowerCase(),filtered=records.filter(r=>[r.name,r.caption,...(r.tags||[])].join(' ').toLowerCase().includes(q)&&(ui.photoAlbum==='__all__'||(r.album||'')===(ui.photoAlbum==='__uncategorized__'?'':ui.photoAlbum)));
      target.innerHTML=filtered.length?`<div class="photo-grid">${filtered.map(rec=>{
        const src=URL.createObjectURL(rec.thumb||rec.blob);photoThumbnails.push(src);
        return `<button type="button" class="photo-card" data-action="view-photo" data-id="${esc(rec.id)}" data-photo-id="${esc(rec.id)}"><img src="${src}" loading="lazy" alt="${esc(rec.name)}"><span>${esc(rec.name)}</span></button>`;
      }).join('')}</div>`:empty('写真','写真がまだありません。上の「写真を追加」で保存できます。');
      $('#photo-count').textContent=records.length+'枚保存中';
    }catch(error){target.innerHTML=`<div class="photo-warning">写真を読み込めませんでした。Safariの通常モードと端末の空き容量を確認してください。</div>`;}
  }
  async function openPhoto(id){
    try{
      const rec=await photoGet(id);if(!rec)return showToast('写真が見つかりません。');
      if(viewerURL)URL.revokeObjectURL(viewerURL);
      viewerURL=URL.createObjectURL(rec.blob);
      modal('写真を見る',`<div class="photo-viewer"><button type="button" class="primary-btn" data-action="fullscreen-photo" aria-label="全画面で表示">⛶ 全画面で表示</button><img data-photo-full alt="${esc(rec.name)}" src="${viewerURL}"><h3>${esc(rec.name)}</h3><p>${esc(new Date(rec.createdAt).toLocaleString('ja-JP'))}</p><p>${esc(rec.caption||'')}${rec.tags?.length?`<span class="tagline">${rec.tags.map(x=>'#'+esc(x)).join(' ')}</span>`:''}</p><div class="photo-viewer-actions"><button class="secondary-btn" data-action="photo-meta" data-id="${esc(id)}">整理・タグ</button><button class="secondary-btn" data-action="rename-photo" data-id="${esc(id)}">名前を変更</button><button class="danger-btn" data-action="delete-photo" data-id="${esc(id)}">削除</button></div></div>`);
      showFullscreenPhoto();
    }catch(error){showToast('写真を表示できませんでした。');}
  }
  function showFullscreenPhoto(){
    const src=$('[data-photo-full]')?.src;if(!src)return;
    const overlay=document.createElement('div');overlay.className='photo-fullscreen';overlay.id='photo-fullscreen';
    overlay.innerHTML=`<button type="button" class="photo-fullscreen-close" data-action="close-fullscreen" aria-label="閉じる">${svgIcon('x')} 閉じる</button><div class="photo-zoom-stage"><img src="${src}" alt="写真の全画面表示" draggable="false"></div><button type="button" class="photo-fullscreen-details" data-action="close-fullscreen">詳細・編集</button>`;
    document.body.appendChild(overlay);
    document.body.classList.add('photo-fullscreen-open');photoScale=1;photoOffsetX=0;photoOffsetY=0;
  }
  function closeFullscreenPhoto(){document.getElementById('photo-fullscreen')?.remove();document.body.classList.remove('photo-fullscreen-open');}
  function photos(){return `${pageHeading('写真保管庫','お気に入りの写真を端末内に保存して、いつでも確認できます。')}
    <div class="toolbar"><input class="search-input" data-search="photo" type="search" placeholder="写真名・タグで検索" aria-label="写真名で検索" value="${esc(ui.photoSearch)}"><button type="button" class="primary-btn" data-action="add-photo">＋ 写真を追加</button></div>
    <div class="folder-strip"><button class="folder-chip ${ui.photoAlbum==='__all__'?'selected':''}" data-action="photo-filter" data-album="__all__">すべて</button>${(state.prefs.photoAlbums||[]).map(a=>`<button class="folder-chip ${ui.photoAlbum===a?'selected':''}" data-action="photo-filter" data-album="${esc(a)}">${svgIcon('folder')} ${esc(a)}</button>`).join('')}<button class="folder-chip" data-action="photo-album-add">＋ アルバム</button><button class="folder-chip" data-action="photo-album-manage">管理</button><button class="folder-chip ${ui.photoAlbum==='__uncategorized__'?'selected':''}" data-action="photo-filter" data-album="__uncategorized__">未分類</button></div>
    <div class="photo-meta"><span id="photo-count">読み込み中…</span><span>保存先：この端末</span></div>
    <div id="photo-gallery"><div class="agenda-empty">写真を読み込んでいます…</div></div>
    <div class="feature-tip"><span>${svgIcon('bookmark')}</span><p>写真は端末内のIndexedDBに保存します。元の写真アプリの画像は削除しません。端末のデータ消去で失われる場合があるため、設定から写真を含むバックアップを取ってください。</p></div>
    <input id="photo-files" type="file" accept="image/*" multiple hidden>`;}

  function searchScreen(){
    return `${pageHeading('全体検索','予定、TODO、リンク、メモ、写真をまとめて検索します。')}<div class="card search-card"><input class="search-input" data-search="global" type="search" placeholder="探したい言葉" value="${esc(ui.globalSearch)}" aria-label="ツールボックス内を検索" autocomplete="off"><p class="folder-hint">入力すると保存済みの項目を検索します。Web検索とは別の機能です。</p></div><div id="global-results" class="search-results"><p class="folder-hint">キーワードを入力してください。</p></div>`;
  }
  let searchSequence=0;
  async function renderGlobalResults(){
    const target=$('#global-results');if(!target)return;
    const seq=++searchSequence,q=ui.globalSearch.trim().toLowerCase();if(!q){target.innerHTML='<p class="folder-hint">キーワードを入力してください。</p>';return;}
    const results=[];
    for(const x of state.links)if([x.name,x.category,x.folder,x.url].join(' ').toLowerCase().includes(q))results.push(['link',x.id,x.name,x.kind==='web'?'リンク':x.kind==='game'?'ゲーム':'アプリ']);
    for(const x of state.notes)if([x.title,x.body].join(' ').toLowerCase().includes(q))results.push(['note',x.id,x.title,'メモ']);
    for(const x of state.timetable.classes)if([x.subject,x.room,x.note].join(' ').toLowerCase().includes(q))results.push(['timetable',x.id,x.subject,'時間割']);
    for(const x of state.events)if([x.title,x.description,x.location].join(' ').toLowerCase().includes(q))results.push(['event',x.id,x.title,'予定']);
    for(const list of state.lists)for(const x of list.items)if(x.title.toLowerCase().includes(q))results.push(['task',list.id+':'+x.id,x.title,list.name]);
    try{for(const x of await photoAll())if([x.name,x.album,x.caption,...(x.tags||[])].join(' ').toLowerCase().includes(q))results.push(['photo',x.id,x.name,'写真']);}catch{}
    if(seq!==searchSequence||ui.page!=='search')return;
    target.innerHTML=results.length?results.slice(0,100).map(([type,id,title,kind])=>`<button type="button" class="search-result" data-action="search-open" data-type="${esc(type)}" data-id="${esc(id)}"><span class="search-result-kind">${esc(kind)}</span><strong>${esc(title)}</strong><span>›</span></button>`).join(''):empty(svgIcon('search'),'一致する項目はありません。');
  }
  function settings(){
    return `${pageHeading('設定','見た目やデータを管理できます。')}
    <section class="settings-group"><p class="settings-title">アプリのカスタマイズ</p><div class="card"><div class="setting-row"><div class="brand-setting"><span class="brand-icon-mini">${imageDataOk(state.prefs.appIconImage)?`<img src="${state.prefs.appIconImage}" alt="">`:svgIcon(state.prefs.appIconKey||'grid')}</span><div><b>${esc(state.prefs.appName||'My Toolbox')}</b><small>名前・アイコンを自由に変更</small></div></div><button class="secondary-btn" data-action="brand-edit">編集</button></div><p class="folder-hint">PWA内の表示名はすぐ反映されます。既にiPhoneのホーム画面に配置したアイコンには、サイトの再デプロイや再追加が必要になる場合があります。</p></div></section>
    <section class="settings-group"><p class="settings-title">外観</p><div class="card"><div class="setting-row"><div><b>カラーテーマ</b><small>好みに合わせて切り替え</small></div><select class="select" data-setting="theme" aria-label="カラーテーマ"><option value="light" ${state.prefs.theme==='light'?'selected':''}>ライト</option><option value="dark" ${state.prefs.theme==='dark'?'selected':''}>ダーク</option><option value="system" ${state.prefs.theme==='system'?'selected':''}>端末に合わせる</option></select></div></div></section>
    <section class="settings-group"><p class="settings-title">ホーム画面</p><div class="card"><div class="setting-row"><div><b>表示・並び順をカスタマイズ</b><small>必要な項目だけを表示し、順番を変更します</small></div><button type="button" class="secondary-btn" data-action="home-layout">編集</button></div></div></section>
    <section class="settings-group"><p class="settings-title">Web検索・外部ブラウザ</p><div class="card"><div class="setting-row"><div><b>リンクの既定ブラウザ</b><small>リンクごとに別の設定も可能</small></div>${browserSelect('defaultBrowser',state.prefs.defaultBrowser)}</div><div class="setting-row"><div><b>Web検索に使うブラウザ</b><small>ホームの検索バーに適用</small></div>${browserSelect('searchBrowser',state.prefs.searchBrowser)}</div><div class="setting-row"><div><b>Web検索エンジン</b></div><select name="searchEngine" class="select">${[['google','Google'],['duckduckgo','DuckDuckGo'],['bing','Bing']].map(([v,label])=>`<option value="${v}" ${(state.prefs.searchEngine||'google')===v?'selected':''}>${label}</option>`).join('')}</select></div><p class="folder-hint">iOSの仕様上、外部アプリの起動は必ずしも成功しません。Safari指定は試験的なURL方式です。既定ブラウザ設定が最も安定しています。</p></div></section>
    <section class="settings-group"><p class="settings-title">通知とリマインダー</p><div class="card"><p class="folder-hint">開いている間は開始前に通知します。閉じた状態の自動通知は静的PWAだけでは実現できません。予定の「カレンダーファイルを保存」から端末のカレンダーへ追加すれば、端末の通知を利用できます。</p><button type="button" class="secondary-btn" data-action="notification-enable">通知の許可を確認</button></div></section>
    <section class="settings-group"><p class="settings-title">下部ショートカット</p><div class="card"><p class="folder-hint">下部に表示する5つのツールを選択できます。重複はできません。</p><div class="nav-settings">${[0,1,2,3,4].map(i=>`<label class="nav-setting-row"><span>${i+1}番目</span><select class="select" data-nav-slot="${i}">${[['home','ホーム'],['calendar','予定'],['timetable','時間割'],['cube','キューブ'],['links','リンク'],['apps','アプリ'],['games','ゲーム'],['lists','リスト'],['notes','メモ'],['photos','写真'],['habits','習慣'],['search','検索'],['settings','設定']].map(([id,label])=>`<option value="${id}" ${((state.prefs.bottomNav?.length===5?state.prefs.bottomNav:['home','calendar','links','apps','lists'])[i]===id)?'selected':''}>${label}</option>`).join('')}</select></label>`).join('')}</div></div></section>
    <section class="settings-group"><p class="settings-title">ジェスチャー操作</p><div class="card"><div class="setting-row"><div><b>右端 → 左へスワイプ</b><small>クイックアクセスメニューを開く。右上の ☰ でも開けます。</small></div></div><div class="setting-row"><div><b>左 → 右へスワイプ</b><small>画面の端でなくても、一つ前のアプリ内画面へ戻れます。ホームでは何も起こりません。</small></div></div><div class="setting-row"><div><b>メニュー上で右へスワイプ</b><small>クイックアクセスメニューを閉じる。</small></div></div></div></section>
    <section class="settings-group"><p class="settings-title">データとバックアップ</p><div class="card">
      <div class="setting-row"><div><b>バックアップを書き出す</b><small>予定・リンク・リスト・メモ・写真をJSONに保存（写真が多いと大容量）</small></div><button class="secondary-btn" data-action="backup">保存</button></div>
      <div class="setting-row"><div><b>バックアップを読み込む</b><small>現在の内容が置き換わります</small></div><button class="secondary-btn" data-action="import">読込</button></div>
      <div class="setting-row"><div><b>データ救出（読み取り専用）</b><small>消えたように見える保存データを確認・書き出し</small></div><a href="./recovery.html" class="secondary-btn" style="text-decoration:none">開く</a></div>
      <div class="setting-row"><div><b>デモデータに初期化</b><small>写真も含めて全削除します</small></div><button class="danger-btn" data-action="reset">初期化</button></div>
    </div></section>
    <section class="settings-group"><p class="settings-title">このアプリについて</p><div class="card"><div class="setting-row"><div><b>My Toolbox v1.1.5</b><small>HTML / CSS / JavaScript / Service Worker<br>無料で動作する個人用PWAの試作品</small></div></div><div class="setting-row"><div><b>カレンダーとGoogle連携</b><small>予定は端末に保存。Googleへの転記は登録画面から手動で確定します。Google側の予定取得・双方向同期はありません。</small></div></div><div class="setting-row"><div><b>データの保存先</b><small>予定やメモはlocalStorage、写真はIndexedDBに保存。クラウド同期はありません。</small></div></div><div class="setting-row"><div><b>アプリ・ゲームへのリンク</b><small>Universal Linkや公式のアプリURLが必要です。OSやアプリ側の制限で開けない場合があります。</small></div></div><div class="setting-row"><div><b>機能の追加</b><small>「マイリスト」ではリストを自由に増やせます。新しい種類のツールはコード追加で拡張できます。</small></div></div></div></section>
    <div class="feature-tip"><span>${svgIcon('bookmark')}</span><p>ログインやサーバーへのデータ送信機能はありません。Web公開した場合も、メモの内容が自動で公開されるわけではありません。ただしブラウザデータの消去に備え、バックアップを取ってください。</p></div>
    <input type="file" id="import-file" accept=".json,application/json" hidden>`;
  }
  function pageContent(){switch(ui.page){case 'calendar':return calendar();case 'timetable':return timetable();case 'cube':return cubeGame();case 'links':return links();case 'apps':return apps();case 'games':return games();case 'lists':return lists();case 'notes':return notes();case 'photos':return photos();case 'habits':return habits();case 'search':return searchScreen();case 'settings':return settings();default:return home();}}
  function drawerMarkup(){
    const entries=[
      ['home',null,'home','ホーム','トップ画面に移動'],
      ['calendar',null,'calendar','マイカレンダー','予定の追加・確認'],
      ['timetable',null,'timetable','時間割','授業と教室の確認'],
      ['links',null,'link','リンク','Webサイトへアクセス'],
      ['apps',null,'grid','アプリ','登録したアプリを起動'],
      ['games',null,'game','ゲーム','登録したゲームを起動'],
      ['cube',null,'cube','ルービックキューブ','内蔵ゲーム'],
      ['lists','tasks','check','チェックリスト','TODOと買い物をまとめて管理'],
      ['notes',null,'note','クイックメモ','保存したメモ'],
      ['search',null,'search','全体検索','保存した項目をまとめて探す'],
      ['photos',null,'photo','写真保管庫','保存した写真を見る'],
      ['settings',null,'settings','設定','表示・データ管理']
    ];
    const custom=state.lists.filter(x=>!x.builtin).slice(0,8);
    const entry=([page,listId,icon,label,desc])=>{
      const active=ui.page===page && (page!=='lists' || ui.listId===listId);
      return `<button type="button" class="drawer-link ${active?'active':''}" data-action="go" data-page="${page}" ${listId?`data-list="${esc(listId)}"`:''} ${active?'aria-current="page"':''}><span class="drawer-link-icon" aria-hidden="true">${svgIcon(legacyIcon(icon,'list'))}</span><span class="drawer-link-copy"><b>${esc(label)}</b><small>${esc(desc)}</small></span><span class="drawer-chevron" aria-hidden="true">›</span></button>`;
    };
    return `<div class="drawer-scrim ${ui.drawerOpen?'shown':''}" data-action="close-drawer" aria-hidden="true"></div>
      <aside id="quick-drawer" class="quick-drawer ${ui.drawerOpen?'open':''}" role="dialog" aria-modal="true" aria-label="クイックアクセスメニュー" ${ui.drawerOpen?'':'inert aria-hidden="true"'}>
        <div class="drawer-heading"><div><p class="drawer-kicker">${esc(state.prefs.appName||'My Toolbox')}</p><h2>クイックアクセス</h2></div><button type="button" class="drawer-dismiss" data-action="close-drawer" aria-label="メニューを閉じる">×</button></div>
        <p class="drawer-helper">右手で使いやすい、いつでも開けるメニュー。</p>
        <div class="drawer-scroll"><p class="drawer-section">ページ</p><div class="drawer-links">${entries.map(entry).join('')}</div>
        ${custom.length?`<p class="drawer-section">マイリスト</p><div class="drawer-links">${custom.map(x=>entry(['lists',x.id,x.icon,x.name,'カスタムリスト'])).join('')}</div>`:''}</div>
        <div class="drawer-bottom"><button type="button" class="drawer-new" data-action="quick-add">＋ すばやく追加</button><p>メニュー上で右へスワイプすると閉じられます。</p></div>
      </aside>`;
  }
  function render(){
    if(ensureHabitDay())save();
    applyBrand();
    const active=state.prefs.theme==='system'?(window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'):state.prefs.theme;
    document.documentElement.dataset.theme=active;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',active==='dark'?'#101522':'#f7f8fc');
    const navOptions=[['home','home','ホーム'],['calendar','calendar','予定'],['timetable','timetable','時間割'],['cube','cube','キューブ'],['links','link','リンク'],['apps','grid','アプリ'],['games','game','ゲーム'],['lists','check','リスト'],['notes','note','メモ'],['photos','photo','写真'],['habits','check','習慣'],['search','search','検索'],['settings','settings','設定']];
    const navIds=(state.prefs.bottomNav?.length===5 && new Set(state.prefs.bottomNav).size===5 && state.prefs.bottomNav.every(id=>navOptions.some(x=>x[0]===id)))?state.prefs.bottomNav:['home','calendar','links','apps','lists'];
    const nav=navIds.map(id=>navOptions.find(x=>x[0]===id));
    const fabAction={timetable:'timetable-add',calendar:'add-event',links:'add-web',apps:'add-app',games:'add-game',lists:'add-list',notes:'add-note',photos:'add-photo'}[ui.page];
    const fabLabel={timetable:'授業を追加',calendar:'予定を追加',links:'リンクを追加',apps:'アプリを追加',games:'ゲームを追加',lists:'リストを追加',notes:'メモを追加',photos:'写真を追加'}[ui.page];
    $('#app').innerHTML=`<main id="main-content">${pageContent()}</main>${fabAction?`<button type="button" class="fab" data-action="${fabAction}" aria-label="${fabLabel}" title="${fabLabel}">＋</button>`:''}<nav class="bottom-nav" aria-label="メインメニュー">${nav.map(([page,icon,label])=>`<button type="button" class="nav-item ${ui.page===page?'active':''}" data-action="go" data-page="${page}" ${ui.page===page?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${svgIcon(icon)}</span><span>${label}</span></button>`).join('')}</nav>${drawerMarkup()}`;
    document.body.classList.toggle('drawer-open',ui.drawerOpen);
    for(const node of [$('#main-content'),$('.bottom-nav'),$('.fab')])if(node)node.inert=ui.drawerOpen;
    if(ui.page==='photos')refreshPhotos();if(ui.page==='search')renderGlobalResults();
  }
  function setDrawer(open,focus=true){
    if(ui.drawerOpen===open)return;
    ui.drawerOpen=open;
    // Update the drawer in place so unsaved text in list input fields survives.
    $('.drawer-scrim')?.classList.toggle('shown',open);
    const drawer=$('#quick-drawer');
    if(drawer){
      drawer.classList.toggle('open',open);
      drawer.inert=!open;
      drawer.setAttribute('aria-hidden',String(!open));
    }
    document.body.classList.toggle('drawer-open',open);
    for(const node of [$('#main-content'),$('.bottom-nav'),$('.fab')])if(node)node.inert=open;
    $('.menu-trigger')?.setAttribute('aria-expanded',String(open));
    if(focus){(open?$('#quick-drawer .drawer-dismiss'):$('.menu-trigger'))?.focus({preventScroll:true});}
  }
  function navigate(page,listId,record=true){
    const nextPage=['home','calendar','timetable','cube','links','apps','games','lists','notes','photos','habits','search','settings'].includes(page)?page:'home';
    const nextList=listId||ui.listId;
    const changes=nextPage!==ui.page || (nextPage==='lists' && nextList!==ui.listId);
    if(changes && record)navigationStack.push({page:ui.page,listId:ui.listId});
    // Keep history limited for long-running PWA sessions.
    if(navigationStack.length>80)navigationStack.shift();
    ui.page=nextPage;ui.listId=nextList;ui.drawerOpen=false;
    render();window.scrollTo({top:0,behavior:'instant'});if(nextPage!=='photos'){photoLoadCounter++;photoURLClear();}if(nextPage==='search')renderGlobalResults();
  }
  function goBack(){
    if(ui.drawerOpen){setDrawer(false);return;}
    if($('#modal-root .modal-overlay')){closeModal();return;}
    if(!navigationStack.length)return;
    const previous=navigationStack.pop();
    navigate(previous.page,previous.listId,false);
  }

  function modal(title,body){
    $('#modal-root').innerHTML=`<div class="modal-overlay" role="presentation" data-action="modal-overlay"><div class="modal-panel" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${esc(title)}</h2><button type="button" class="ghost-btn" data-action="close-modal" aria-label="閉じる">×</button></div>${body}</div></div>`;
    // Avoid automatic keyboard opening and iOS viewport zoom on modal open.
  }
  function closeModal(){pendingImport=null;const reorderOpen=!!$('#modal-root .reorder-list');closeFullscreenPhoto();$('#modal-root').innerHTML='';if(reorderOpen)render();if(viewerURL){URL.revokeObjectURL(viewerURL);viewerURL=null;}}
  function quickAdd(){if(ui.drawerOpen)setDrawer(false,false);modal('何を追加しますか？',`<div style="display:grid;gap:9px">${[
    ['timetable-add','timetable','時間割に授業を追加'],['add-event','calendar','カレンダーに予定を追加'],['add-web','link','Webサイトを登録'],['add-app','grid','アプリを登録'],['add-game','game','ゲームを登録'],['add-photo','photo','写真を保存'],['quick-item-shopping','cart','チェックリストに買い物を追加'],['quick-item-todo','check','チェックリストにTODOを追加'],['add-note','note','メモを作成'],['add-list','list','新しいリストを作成']
  ].map(([action,icon,label])=>`<button type="button" class="quick-card" data-action="${action}" style="padding:14px 16px">${iconTile(icon,'gray')}<span class="name">${label}</span><span class="muted" style="margin-left:auto">›</span></button>`).join('')}</div>`);}
  function homeLayoutModal(){
    const ids=HOME_SECTIONS.map(x=>x[0]),order=(state.prefs.homeSections?.length?state.prefs.homeSections:ids).filter(x=>ids.includes(x));for(const x of ids)if(!order.includes(x))order.push(x);
    const hidden=state.prefs.hiddenSections||[];
    modal('ホームの構成を変更',`<p class="folder-hint">表示のオン・オフと順番を変更します。保存は自動です。</p><div class="reorder-list">${order.map(id=>`<div class="reorder-row"><span>${esc(HOME_SECTIONS.find(x=>x[0]===id)?.[1]||id)}</span><button type="button" data-action="home-order" data-id="${id}" data-step="-1" aria-label="上へ">${svgIcon('arrow-up')}</button><button type="button" data-action="home-order" data-id="${id}" data-step="1" aria-label="下へ">${svgIcon('arrow-down')}</button><button type="button" data-action="home-toggle" data-id="${id}" aria-label="表示切替" class="visibility-button">${hidden.includes(id)?'非表示':'表示中'}</button></div>`).join('')}</div><button type="button" class="primary-btn" data-action="close-modal">完了</button>`);
  }
  function reorderModal(type,kind='',folder=''){
    const items=type==='tools'?TOOLS:state.links.filter(x=>x.kind===kind && (folder==='__all__'||(x.folder||'')===(folder==='__uncategorized__'?'':folder)));
    const key=type==='tools'?'toolOrder':'linkOrder',ids=state.prefs[key]||[];
    const sorted=items.slice().sort((a,b)=>(ids.indexOf(a.id)<0?999:ids.indexOf(a.id))-(ids.indexOf(b.id)<0?999:ids.indexOf(b.id)));
    modal('表示順序を変更',`<p class="folder-hint">上下の矢印で並び替えられます。変更は自動保存されます。</p><div class="reorder-list">${sorted.map(x=>`<div class="reorder-row"><span>${esc(x.name)}</span><button type="button" data-action="move-order" data-type="${type}" data-kind="${kind}" data-folder="${esc(folder)}" data-id="${esc(x.id)}" data-step="-1">${svgIcon('arrow-up')}</button><button type="button" data-action="move-order" data-type="${type}" data-kind="${kind}" data-folder="${esc(folder)}" data-id="${esc(x.id)}" data-step="1">${svgIcon('arrow-down')}</button></div>`).join('')}</div>`);
  }
  function iconPicker(key='link'){
    return `<div class="form-group"><label>アイコンを選択</label><input type="hidden" name="iconKey" id="selected-icon" value="${esc(legacyIcon(key))}">
      <div class="icon-picker">${ICON_CHOICES.map(choice=>`<button type="button" class="icon-option ${choice===key?'selected':''}" data-action="choose-icon" data-icon="${choice}" aria-label="${choice} アイコンを選択" aria-pressed="${choice===key}">${svgIcon(choice)}</button>`).join('')}</div></div>`;
  }
  function linkModal(id,defaultKind=ui.page==='games'?'game':ui.page==='apps'?'app':'web'){
    const link=state.links.find(x=>x.id===id);
    const key=link?.iconKey||legacyIcon(link?.icon||'link');
    modal(link?'登録内容を編集':(defaultKind==='game'?'ゲームを登録':defaultKind==='app'?'アプリを登録':'リンクを登録'),`<form data-form="link" ${link?`data-id="${esc(link.id)}"`:''}>
      <div class="form-group"><label for="link-name">表示名</label><input class="field" id="link-name" name="name" maxlength="150" required placeholder="例：好きなゲーム" value="${esc(link?.name||'')}"></div>
      <div class="form-group"><label for="link-kind">種類</label><select class="select" id="link-kind" name="kind"><option value="web" ${(link?.kind||defaultKind)==='web'?'selected':''}>Webサイト</option><option value="app" ${(link?.kind||defaultKind)==='app'?'selected':''}>アプリ</option><option value="game" ${(link?.kind||defaultKind)==='game'?'selected':''}>ゲーム</option></select></div>
      <div class="form-group"><label for="link-url">開くURL / 対応アプリのリンク</label><input class="field" id="link-url" name="url" required maxlength="3000" inputmode="url" placeholder="https://... または game://..." value="${esc(link?.url||'')}"><small>まずはゲームの公式サイトやUniversal Linkを推奨。アプリ専用URLスキームは対応するアプリに限り動作します。アプリの名前だけでは起動できません。対応リンクがなければiOSショートカットで「アプリを開く」を作り、shortcuts://run-shortcut?name=ショートカット名 を登録してください。</small></div>
      ${iconPicker(key)}
      <div class="form-group"><label for="link-icon-file">自分の画像をアイコンに設定（任意）</label><input type="file" class="field" id="link-icon-file" accept="image/*"><small>正方形に近い画像を推奨。端末内に縮小保存されます。</small><div id="link-image-preview" class="icon-image-preview">${imageDataOk(link?.iconImage)?`<img src="${link.iconImage}" alt="現在のアイコン画像">`:svgIcon(key)}<button type="button" class="secondary-btn" data-action="clear-link-image">画像を解除</button></div><input type="hidden" id="link-icon-image" name="iconImage" value="${imageDataOk(link?.iconImage)?link.iconImage:''}"></div>
      <div class="form-group"><label for="link-folder">フォルダ（空欄は未分類）</label><input class="field" id="link-folder" name="folder" list="link-folder-options" maxlength="100" placeholder="例：ゲーム / 仕事 / お気に入り" value="${esc(link?.folder||'')}"><datalist id="link-folder-options">${knownFolders(link?.kind||defaultKind).map(f=>`<option value="${esc(f)}"></option>`).join('')}</datalist></div>
      <div class="form-group"><label>外部ブラウザ（Webリンクのみ）</label>${browserSelect('browser',link?.browser||'inherit',true)}<small>Safari指定はiOSの非公開URL形式を利用する試験的機能です。Chromeなどは対象アプリが必要です。</small></div>
      <div class="form-group"><label for="link-category">カテゴリ（任意）</label><input class="field" id="link-category" name="category" maxlength="100" placeholder="例：ゲーム" value="${esc(link?.category||'')}"></div>
      <div class="form-group"><label class="check-label"><input type="checkbox" name="favorite" ${link?.favorite?'checked':''}> ホームのお気に入りに表示する</label></div>
      <div class="modal-footer">${link?`<button type="button" class="danger-btn" data-action="delete-link" data-id="${esc(link.id)}">削除</button>`:''}<button type="submit" class="primary-btn">${link?'変更を保存':'登録する'}</button></div>
    </form>`);
  }
  async function readIconFile(file){
    if(!file)return;
    if(!file.type.startsWith('image/')||file.size>12*1024*1024){showToast('12MB以下の画像を選択してください。');return;}
    try{
      const blob=await photoCanvas(file,90,.76);
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
      if(!imageDataOk(data))throw Error('アイコン画像が大きすぎます。');
      const field=$('#link-icon-image'),preview=$('#link-image-preview');
      if(!field||!preview)return;
      field.value=data;preview.querySelector('img,svg')?.remove();preview.insertAdjacentHTML('afterbegin',`<img src="${data}" alt="選択した画像">`);showToast('アイコン画像を設定しました。保存して確定してください。');
    }catch(error){showToast('画像を設定できませんでした（形式または容量をご確認ください）。');}
  }
  function taskModal(id){
    const task=getList('tasks')?.items.find(x=>x.id===id);
    modal(task?'TODOを編集':'TODOを追加',`<form data-form="task-edit" ${task?`data-id="${esc(id)}"`:''}>
      <div class="form-group"><label>内容</label><input class="field" name="title" maxlength="500" required value="${esc(task?.title||'')}"></div>
      <div class="form-group"><label>期限（任意）</label><input class="field" type="date" name="due" value="${esc(task?.due||'')}"></div>
      <div class="form-group"><label>繰り返し</label><select class="select" name="repeat">${[['none','繰り返さない'],['daily','毎日'],['3days','3日ごと'],['weekly','毎週'],['monthly','毎月']].map(([v,l])=>`<option value="${v}" ${(task?.repeat||'none')===v?'selected':''}>${l}</option>`).join('')}</select><small>繰り返しを選んだ場合、期限は必須です。完了すると次の期限へ自動的に進みます。毎月31日など存在しない日付はスキップします。</small></div>
      <div class="modal-footer"><button type="button" class="secondary-btn" data-action="close-modal">キャンセル</button><button type="submit" class="primary-btn">保存</button></div>
    </form>`);
  }
  function nextTaskDate(task){
    const now=dateKey();let next=recurrenceDate(task.due,task.repeat,task.repeatAnchor||task.due);
    for(let i=0;i<1000&&next&&next<=now;i++)next=recurrenceDate(next,task.repeat,task.repeatAnchor||task.due);
    return next||task.due;
  }
  function noteModal(id){
    const note=state.notes.find(x=>x.id===id);
    modal(note?'メモを編集':'メモを作成',`<form data-form="note" ${note?`data-id="${esc(note.id)}"`:''}>
      <div class="form-group"><label for="note-title">タイトル</label><input class="field" id="note-title" name="title" maxlength="150" required placeholder="例：いつか追加したい機能" value="${esc(note?.title||'')}"></div>
      <div class="form-group"><label for="note-body">本文</label><textarea class="text-area" id="note-body" name="body" rows="7" placeholder="自由に書いてください">${esc(note?.body||'')}</textarea></div>
      <div class="modal-footer"><button type="button" class="secondary-btn" data-action="close-modal">キャンセル</button><button type="submit" class="primary-btn">保存する</button></div>
    </form>`);
  }
  function listModal(id){
    const list=id?getList(id):null;
    modal(list?'リストを編集':'リストを追加',`<form data-form="list" ${list?`data-id="${esc(list.id)}"`:''}>
      <div class="form-group"><label for="list-name">リストの名前</label><input class="field" id="list-name" name="name" maxlength="120" required placeholder="例：旅行の持ち物" value="${esc(list?.name||'')}"></div>
      ${iconPicker(list?.iconKey||legacyIcon(list?.icon||'list','list'))}
      <div class="modal-footer">${list?`<button type="button" class="danger-btn" data-action="delete-list" data-id="${esc(list.id)}">削除</button>`:''}<button type="submit" class="primary-btn">保存する</button></div>
    </form>`);
  }

  function eventModal(id,date=ui.selectedDate){
    const rec=state.events.find(e=>e.id===id);
    const day=rec?.date||(isDateKey(date)?date:dateKey());
    modal(rec?'予定を編集':'予定を追加',`<form data-form="event" ${rec?`data-id="${esc(rec.id)}"`:''}>
      <div class="form-group"><label for="event-title">予定のタイトル</label><input id="event-title" class="field" name="title" maxlength="150" required placeholder="例：歯科の予約" value="${esc(rec?.title||'')}"></div>
      <div class="form-group"><label for="event-date">日付</label><input id="event-date" class="field" type="date" name="date" required value="${esc(day)}"></div>
      <div class="form-group"><label class="calendar-checkbox"><input type="checkbox" name="allDay" data-event-allday ${rec?.allDay?'checked':''}> 終日（時刻を指定しない）</label></div>
      <div class="time-grid"><div class="form-group"><label for="event-start">開始</label><input id="event-start" class="field" type="time" name="start" value="${esc(rec?.start||'09:00')}" ${rec?.allDay?'disabled':''} data-time-field required></div><div class="form-group"><label for="event-end">終了</label><input id="event-end" class="field" type="time" name="end" value="${esc(rec?.end||'10:00')}" ${rec?.allDay?'disabled':''} data-time-field required></div></div>
      <div class="form-group"><label for="event-repeat">繰り返し</label><select class="select" name="repeat" id="event-repeat">${[['none','繰り返さない'],['daily','毎日'],['3days','3日ごと'],['weekly','毎週'],['monthly','毎月'],['yearly','毎年']].map(([v,l])=>`<option value="${v}" ${(rec?.repeat||'none')===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="form-group"><label for="event-repeat-until">繰り返し終了日（任意）</label><input type="date" class="field" id="event-repeat-until" name="repeatUntil" value="${esc(rec?.repeatUntil||'')}"></div>
      <div class="form-group"><label for="event-remind">開始前の通知</label><select class="select" name="remind" id="event-remind">${[[0,'通知しない'],[5,'5分前'],[10,'10分前'],[15,'15分前'],[30,'30分前'],[60,'1時間前']].map(([v,l])=>`<option value="${v}" ${Number(rec?.remind||0)===v?'selected':''}>${l}</option>`).join('')}</select><small>アプリ起動中のみ通知します。閉じた状態の自動通知はサーバーが必要です。カレンダーへ書き出して端末の通知を利用する方法もあります。</small></div>
      <div class="form-group"><label for="event-location">場所（任意）</label><input id="event-location" class="field" name="location" maxlength="250" placeholder="例：大学・会議室" value="${esc(rec?.location||'')}"></div>
      <div class="form-group"><label for="event-description">詳細（任意）</label><textarea id="event-description" class="text-area" name="description" maxlength="3000" rows="3" placeholder="補足や持ち物など">${esc(rec?.description||'')}</textarea></div>
      <div class="modal-footer">${rec?`<button type="button" class="danger-btn" data-action="delete-event" data-id="${esc(rec.id)}">削除</button>`:''}<button type="submit" class="primary-btn">${rec?'変更を保存':'予定を登録'}</button></div>
      ${rec?`<button type="button" class="event-google-btn" data-action="google-event" data-id="${esc(rec.id)}">↗ 保存済みの内容をGoogleカレンダーに追加</button><button type="button" class="event-google-btn" data-action="export-ics" data-id="${esc(rec.id)}">${svgIcon('calendar')} カレンダーファイルを保存（端末通知用）</button>`:''}
    </form>`);
  }
  function calendarExportURL(event){
    const compact = value=>value.replaceAll('-','');
    let dates;
    if(event.allDay){
      const [y,m,d]=event.date.split('-').map(Number);
      const following=dateKey(new Date(y,m-1,d+1));
      dates=`${compact(event.date)}/${compact(following)}`; // exclusive end for all-day events
    } else {
      const asUTC=time=>new Date(`${event.date}T${time}:00`).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
      dates=`${asUTC(event.start)}/${asUTC(event.end)}`;
    }
    const params=new URLSearchParams({action:'TEMPLATE',text:event.title,dates,details:event.description,location:event.location});
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
  function sendEventToGoogle(id,chosenDate){
    const event=state.events.find(e=>e.id===id);
    if(!event)return;
    try{
      const anchor=document.createElement('a');anchor.href=calendarExportURL(chosenDate&&eventOccursOn(event,chosenDate)?{...event,date:chosenDate}:event);anchor.target='_blank';anchor.rel='noopener noreferrer';
      document.body.append(anchor);anchor.click();anchor.remove();
      showToast('Google側で内容を確認し「保存」してください。');
    }catch(error){showToast('Googleカレンダーのリンクを作成できませんでした。');}
  }

  function exportICS(id){
    const item=state.events.find(x=>x.id===id);if(!item)return;
    const stamp=v=>v.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const eText=v=>String(v||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/[,;]/g,x=>'\\'+x);
    let start,end;
    if(item.allDay){start='DTSTART;VALUE=DATE:'+item.date.replaceAll('-','');end='DTEND;VALUE=DATE:'+nextDate(item.date).replaceAll('-','');}
    else {start='DTSTART:'+stamp(new Date(`${item.date}T${item.start}:00`));end='DTEND:'+stamp(new Date(`${item.date}T${item.end}:00`));}
    const rules={daily:'FREQ=DAILY',weekly:'FREQ=WEEKLY',monthly:'FREQ=MONTHLY',yearly:'FREQ=YEARLY','3days':'FREQ=DAILY;INTERVAL=3'};
    const until=item.repeatUntil?`;UNTIL=${item.repeatUntil.replaceAll('-','')}${item.allDay?'':'T235959Z'}`:'';
    const recurrence=rules[item.repeat]?`RRULE:${rules[item.repeat]}${until}\r\n`:'';
    const alarm=item.remind>0&&!item.allDay?`BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${eText(item.title)}\r\nTRIGGER:-PT${item.remind}M\r\nEND:VALARM\r\n`:'';
    const ics=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//My Toolbox//JP\r\nCALSCALE:GREGORIAN\r\nBEGIN:VEVENT\r\nUID:${item.id}@mytoolbox.local\r\nDTSTAMP:${stamp(new Date())}\r\n${start}\r\n${end}\r\nSUMMARY:${eText(item.title)}\r\nLOCATION:${eText(item.location)}\r\nDESCRIPTION:${eText(item.description)}\r\n${recurrence}${alarm}END:VEVENT\r\nEND:VCALENDAR\r\n`;
    const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`MyToolbox-${item.date}.ics`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);showToast('カレンダーファイルを保存しました。端末の予定アプリで読み込んでください。');
  }
  const alertedEvents=new Set();
  function checkReminders(){
    if(document.hidden)return;
    const now=new Date(), day=dateKey(now),minute=now.getHours()*60+now.getMinutes();
    for(const dayOffset of [0,1]){const targetDay=nextDate(day,dayOffset);for(const event of eventsOn(targetDay)){
      if(!event.remind || event.allDay)continue;
      const [h,m]=event.start.split(':').map(Number);const start=asLocalDate(targetDay);start.setHours(h,m,0,0);
      const delta=(start-now)/60000;const key=event.id+':'+targetDay+':'+event.remind;
      if(delta<=event.remind && delta>=0 && !alertedEvents.has(key)){
        alertedEvents.add(key);showToast(`もうすぐ「${event.title}」の予定です（${Math.ceil(delta)}分後）`);
        if('Notification' in window&&Notification.permission==='granted')try{new Notification('My Toolbox 予定',{body:event.title+' の開始が近づいています'});}catch{}
      }
    }}
  }
  function quickItem(category){closeModal();ui.taskFilter=category;navigate('lists','tasks');setTimeout(()=>$('#main-content input[name="title"]')?.focus(),0);}
  function normalizedUrl(v){
    let url=v.trim();if(!url)return null;
    if(!/^[a-z][a-z\d+.-]*:/i.test(url))url='https://'+url;
    if(/^(?:javascript|data|blob|file|about|chrome|intent|itms-services):/i.test(url))return null;
    if(/^https?:/i.test(url)){
      try{const parsed=new URL(url);if(!parsed.hostname)return null;}catch{return null;}
      return url;
    }
    if(/^(?:mailto|tel):/i.test(url))return url;
    // User-provided app deep links are not universally supported by iOS/PWA.
    // Permit conventional schemes but never evaluate JS or accept data/file URIs.
    if(/^[a-z][a-z\d+.-]{1,38}:\/\/[^\s]+$/i.test(url))return url;
    return null;
  }
  function openExternal(url,browser='system'){
    if(!/^https?:\/\//i.test(url)){const a=document.createElement('a');a.href=url;document.body.append(a);a.click();a.remove();return;}
    const chosen=validBrowser(browser),parsed=new URL(url);
    let dest=url;
    if(chosen==='safari' && /^https:$/i.test(parsed.protocol) && /iPhone|iPad|iPod/i.test(navigator.userAgent))dest='x-safari-'+url;
    else if(chosen==='chrome')dest=(parsed.protocol==='https:'?'googlechromes:':'googlechrome:')+url.slice(parsed.protocol.length);
    else if(chosen==='firefox')dest='firefox://open-url?url='+encodeURIComponent(url);
    else if(chosen==='edge')dest=(parsed.protocol==='https:'?'microsoft-edge-https:':'microsoft-edge-http:')+url.slice(parsed.protocol.length);
    // Custom schemes require a direct tap; iOS may block or keep a new tab inside the PWA.
    const a=document.createElement('a');a.href=dest;
    if(dest===url){a.target='_blank';a.rel='noopener noreferrer';}
    document.body.append(a);a.click();a.remove();
  }
  function openLink(id){
    const link=state.links.find(x=>x.id===id);if(!link)return;
    if((link.id===CIVILIZATION_ID && link.url===CIVILIZATION_URL) ||
       (link.id===CLAY_ID && link.url===CLAY_URL)){
      // Same-scope navigation keeps the game in the installed PWA.
      // It does not use the external browser setting or the toolbox gesture handler.
      window.location.assign(new URL(link.url,document.baseURI).href);
      return;
    }
    const url=normalizedUrl(link.url);if(!url){showToast('このURLは開けません。');return;}
    openExternal(url,link.kind==='web'?(link.browser&&link.browser!=='inherit'?link.browser:state.prefs.defaultBrowser):'system');
  }
  function webSearch(query){
    const q=String(query||'').trim();if(!q)return;
    const engine=state.prefs.searchEngine||'google';
    const base=engine==='bing'?'https://www.bing.com/search?q=':engine==='duckduckgo'?'https://duckduckgo.com/?q=':'https://www.google.com/search?q=';
    openExternal(base+encodeURIComponent(q),state.prefs.searchBrowser||'system');
  }

  const blobDataURL=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  async function backup(){
    try{
      const photos=await photoAll();
      const photosExport=[];
      for(const rec of photos)photosExport.push({id:rec.id,name:rec.name,album:rec.album||'',tags:rec.tags||[],caption:rec.caption||'',createdAt:rec.createdAt,blob:await blobDataURL(rec.blob),thumb:await blobDataURL(rec.thumb||rec.blob)});
      const json=JSON.stringify({...state,photos:photosExport,exportedAt:new Date().toISOString()});
      const blob=new Blob([json],{type:'application/json'});
      if(blob.size>90*1024*1024){showToast('バックアップが90MBを超えました。写真を減らして再実行してください。');return;}
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`my-toolbox-backup-${dateKey()}.json`;document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),120000);showToast(`写真${photos.length}枚を含むバックアップを書き出しました。`);
    }catch(error){alert('バックアップに失敗しました。\n'+error.message);}
  }
  function dataURLBlob(text){
    if(!imageDataOk(text) && !(typeof text==='string' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(text) && text.length<20*1024*1024))throw Error('画像データが不正です。');
    const [header,base64]=text.split(',');const mime=header.slice(5).split(';')[0];const raw=atob(base64);const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    return new Blob([bytes],{type:mime});
  }
  let pendingImport=null;
  async function importFile(file){
    if(!file)return;
    if(file.size>100*1024*1024){showToast('100MB以下のJSONファイルを選んでください。');return;}
    try{
      const parsed=JSON.parse(await file.text());const next=normalize(parsed);
      const photos=[];
      if(Array.isArray(parsed.photos)&&parsed.photos.length>1500)throw Error('写真の件数が多すぎます。');
      for(const rec of (Array.isArray(parsed.photos)?parsed.photos:[])){
        if(!rec || !rec.id || !rec.blob)throw Error('写真のバックアップが不正です。');
        photos.push({id:String(rec.id),name:String(rec.name||'写真').slice(0,140),createdAt:String(rec.createdAt||new Date().toISOString()),album:String(rec.album||'').slice(0,100),tags:Array.isArray(rec.tags)?rec.tags.map(x=>String(x).slice(0,40)).slice(0,15):[],caption:String(rec.caption||'').slice(0,500),blob:dataURLBlob(rec.blob),thumb:dataURLBlob(rec.thumb||rec.blob)});
      }
      const summary=`予定 ${next.events.length}件、リンク ${next.links.length}件、リスト ${next.lists.length}個、メモ ${next.notes.length}件、写真 ${photos.length}枚`;
      modal('バックアップ内容を確認',`<p class="folder-hint">${esc(summary)}</p><p class="folder-hint">復元する範囲を選んでください。選んだ範囲の現在のデータは置き換わります。重要なデータは事前にバックアップしてください。</p><div class="context-actions"><button class="primary-btn" data-action="restore-backup" data-scope="all">全データを復元</button><button class="secondary-btn" data-action="restore-backup" data-scope="text">写真以外を復元</button><button class="secondary-btn" data-action="restore-backup" data-scope="photos">写真だけ復元</button><button class="secondary-btn" data-action="close-modal">キャンセル</button></div>`);
      pendingImport={next,photos};
    }catch(error){alert('読み込みに失敗しました。\n'+error.message);}
  }

  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-action]');if(!trigger)return;
    const {action,id,page,list}=trigger.dataset;
    if(action==='modal-overlay'){if(event.target===trigger)closeModal();return;}
    switch(action){
      case 'go':closeModal();navigate(page,list);break;
      case 'timetable-config':timetableConfigModal();break;
      case 'timetable-add':timetableClassModal(null,trigger.dataset.day||0,trigger.dataset.period||1);break;
      case 'timetable-edit':timetableClassModal(id);break;
      case 'timetable-pair':{const form=trigger.closest('form');const values=trigger.dataset.pair.split(',').map(Number);form?.querySelectorAll('input[name="day"]').forEach(x=>{x.checked=values.includes(Number(x.value));});break;}
      case 'timetable-delete':{if(!confirm('この授業を削除しますか？リンクしている全曜日から削除されます。'))break;mutate(()=>state.timetable.classes=state.timetable.classes.filter(c=>c.id!==id));closeModal();showToast('授業を削除しました。');break;}
      case 'cube-turn':{const move=trigger.dataset.move;cubeMove(move);save();render();if(cubeIsSolved(state.cube.stickers))showToast('6面完成！');break;}
      case 'cube-scramble':cubeScramble();break;
      case 'cube-reset':if(confirm('キューブを完成状態に戻しますか？')){state.cube={stickers:solvedCube(),history:[],moveCount:0,scramble:''};save();render();}break;
      case 'cube-undo':{const last=state.cube.history.pop();if(!last)break;const reverse=last.endsWith('2')?last:last.endsWith("'")?last.slice(0,-1):last+"'";cubeMove(reverse,false);state.cube.moveCount=Math.max(0,state.cube.moveCount-1);save();render();break;}
      case 'cube-net':ui.cubeNet=!ui.cubeNet;render();break;
      case 'brand-edit':appBrandModal();break;
      case 'brand-icon-clear':{const form=trigger.closest('form');const image=form?.querySelector('#brand-icon-image');if(!image)break;image.value='';const prev=form.querySelector('#brand-image-preview');prev?.querySelector('img,svg')?.remove();prev?.insertAdjacentHTML('afterbegin',svgIcon(form.querySelector('input[name=iconKey]').value));break;}
      case 'brand-export':exportBrandPackage();break;
      case 'search-open':{const type=trigger.dataset.type,identifier=trigger.dataset.id;
        if(type==='link'){openLink(identifier);}else if(type==='note'){noteModal(identifier);}else if(type==='event'){eventModal(identifier);}else if(type==='timetable'){timetableClassModal(identifier);}else if(type==='task'){const [listId,taskId]=identifier.split(':');if(listId==='tasks')taskModal(taskId);else navigate('lists',listId);}else if(type==='photo'){openPhoto(identifier);}break;}
      case 'home-layout':homeLayoutModal();break;
      case 'home-order':{const ids=HOME_SECTIONS.map(x=>x[0]),order=state.prefs.homeSections?.length?state.prefs.homeSections.slice():ids.slice();for(const x of ids)if(!order.includes(x))order.push(x);const i=order.indexOf(id),j=i+Number(trigger.dataset.step);if(j<0||j>=order.length)break;[order[i],order[j]]=[order[j],order[i]];state.prefs.homeSections=order;save();homeLayoutModal();break;}
      case 'home-toggle':{const hidden=new Set(state.prefs.hiddenSections||[]);if(hidden.has(id))hidden.delete(id);else hidden.add(id);state.prefs.hiddenSections=[...hidden];save();homeLayoutModal();break;}
      case 'toggle-drawer':setDrawer(!ui.drawerOpen);break;
      case 'close-drawer':setDrawer(false);break;
      case 'quick-add':quickAdd();break;
      case 'fullscreen-photo':showFullscreenPhoto();break;
      case 'close-fullscreen':closeFullscreenPhoto();if(!trigger.classList.contains('photo-fullscreen-details'))closeModal();break;
      case 'select-folder':ui[folderField(trigger.dataset.kind)]=trigger.dataset.folder;render();break;
      case 'new-folder':{const name=prompt('フォルダ名を入力してください');if(!name?.trim())break;const folder=name.trim().slice(0,100);if(['__all__','__uncategorized__'].includes(folder)){showToast('そのフォルダ名は使用できません。');break;}const kind=trigger.dataset.kind;if(!state.prefs.folders)state.prefs.folders={web:[],app:[],game:[]};if(!state.prefs.folders[kind])state.prefs.folders[kind]=[];if(!knownFolders(kind).includes(folder))state.prefs.folders[kind].push(folder);ui[folderField(kind)]=folder;save();render();showToast('フォルダを作成しました。項目の編集から移動できます。');break;}
      case 'reorder-tools':reorderModal('tools');break;
      case 'reorder-links':reorderModal('links',trigger.dataset.kind,trigger.dataset.folder);break;
      case 'move-order':{const type=trigger.dataset.type,key=type==='tools'?'toolOrder':'linkOrder';const kind=trigger.dataset.kind,folder=trigger.dataset.folder;const items=type==='tools'?TOOLS:state.links.filter(x=>x.kind===kind && (folder==='__all__'||(x.folder||'')===(folder==='__uncategorized__'?'':folder)));const ids=items.map(x=>x.id);const allIds=type==='tools'?TOOLS.map(x=>x.id):state.links.map(x=>x.id);const order=(state.prefs[key]||[]).slice();for(const x of allIds)if(!order.includes(x))order.push(x);const visible=ids.slice().sort((a,b)=>order.indexOf(a)-order.indexOf(b));const at=visible.indexOf(id),to=at+Number(trigger.dataset.step);if(at<0||to<0||to>=visible.length)break;const first=order.indexOf(visible[at]),second=order.indexOf(visible[to]);[order[first],order[second]]=[order[second],order[first]];state.prefs[key]=order;save();reorderModal(type,kind,folder);break;}
      case 'close-modal':closeModal();break;
      case 'habit-shift':{const [y,m]=ui.habitMonth.split('-').map(Number),d=new Date(y,m-1+Number(trigger.dataset.step),1);ui.habitMonth=dateKey(d).slice(0,7);render();break;}
      case 'toggle-habit':mutate(()=>{const x=state.habits.items.find(x=>x.id===id);if(x&&x.title.trim())x.done=!x.done;recordHabitDay();});break;
      case 'add-event':eventModal(null,trigger.dataset.date);break;
      case 'edit-event':eventModal(id);break;
      case 'delete-event':if(confirm('この予定を削除しますか？')){mutate(()=>state.events=state.events.filter(x=>x.id!==id));closeModal();showToast('予定を削除しました。');}break;
      case 'google-event':sendEventToGoogle(id,trigger.dataset.date);break;
      case 'export-ics':exportICS(id);break;
      case 'calendar-select':ui.selectedDate=trigger.dataset.date;render();break;
      case 'calendar-date':ui.selectedDate=trigger.dataset.date;ui.calendarMonth=ui.selectedDate.slice(0,7);closeModal();navigate('calendar');break;
      case 'calendar-today':ui.selectedDate=dateKey();ui.calendarMonth=ui.selectedDate.slice(0,7);render();break;
      case 'calendar-shift':shiftCalendarMonth(Number(trigger.dataset.month));break;
      case 'add-link':linkModal(null,trigger.dataset.kind||'web');break;
      case 'add-web':linkModal(null,'web');break;
      case 'add-app':linkModal(null,'app');break;
      case 'add-game':linkModal(null,'game');break;
      case 'choose-icon':{const chosen=trigger.dataset.icon,form=trigger.closest('form');if(!ICONS[chosen]||!form)return;form.querySelector('input[name=iconKey]').value=chosen;form.querySelectorAll('.icon-option').forEach(b=>{const yes=b.dataset.icon===chosen;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes?'true':'false');});const preview=form.querySelector('#link-image-preview')||form.querySelector('#brand-image-preview');const imageInput=form.querySelector('#link-icon-image')||form.querySelector('#brand-icon-image');if(preview && imageInput && !imageInput.value){preview.querySelector('svg')?.remove();preview.insertAdjacentHTML('afterbegin',svgIcon(chosen));}break;}
      case 'clear-link-image':{const form=trigger.closest('form');if(!form)break;form.querySelector('#link-icon-image').value='';const preview=form.querySelector('#link-image-preview');preview?.querySelector('img,svg')?.remove();preview?.insertAdjacentHTML('afterbegin',svgIcon(form.querySelector('input[name=iconKey]').value));break;}
      case 'copy-link-url':{const x=state.links.find(x=>x.id===id);if(x){navigator.clipboard?.writeText(x.url).then(()=>showToast('URLをコピーしました。')).catch(()=>{prompt('こちらのURLをコピーしてください',x.url);});}break;}
      case 'duplicate-link':{const original=state.links.find(x=>x.id===id);if(!original)break;mutate(()=>state.links.push({...original,id:uid(),name:(original.name+' コピー').slice(0,150)}));closeModal();showToast('複製しました。');break;}
      case 'move-link-folder':{const original=state.links.find(x=>x.id===id);if(!original)break;modal('フォルダへ移動',`<form data-form="link-move" data-id="${esc(id)}"><div class="form-group"><label>移動先</label><select class="select" name="folder"><option value="">未分類</option>${knownFolders(original.kind).map(x=>`<option value="${esc(x)}" ${(original.folder||'')===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div><button class="primary-btn" type="submit">移動する</button></form>`);break;}
      case 'edit-link':linkModal(id);break;
      case 'open-link':openLink(id);break;
      case 'favorite-link':mutate(()=>{const x=state.links.find(x=>x.id===id);if(x)x.favorite=!x.favorite;});break;
      case 'delete-link':if(confirm('このリンクを削除しますか？')){mutate(()=>state.links=state.links.filter(x=>x.id!==id));closeModal();showToast('リンクを削除しました。');}break;
      case 'list-select':if(id==='tasks')ui.taskFilter='all';navigate('lists',id);break;
      case 'task-filter':if(['all','todo','shopping'].includes(trigger.dataset.filter)){ui.taskFilter=trigger.dataset.filter;render();}break;
      case 'add-list':listModal();break;
      case 'edit-list':listModal(id);break;
      case 'delete-list':if(confirm('このリストとすべての項目を削除しますか？')){mutate(()=>state.lists=state.lists.filter(x=>x.id!==id || x.builtin));ui.listId='tasks';closeModal();render();showToast('リストを削除しました。');}break;
      case 'item-up':case 'item-down':mutate(()=>{const arr=getList(list)?.items;if(!arr)return;const at=arr.findIndex(x=>x.id===id),to=at+(action==='item-up'?-1:1);if(at>=0&&to>=0&&to<arr.length)[arr[at],arr[to]]=[arr[to],arr[at]];});break;
      case 'toggle-item':mutate(()=>{const x=getList(list)?.items.find(x=>x.id===id);if(!x)return;
        if(x.repeat&&x.repeat!=='none'&&x.due){x.completedDates=x.completedDates||[];x.completedDates.push(x.due);x.completedDates=x.completedDates.slice(-500);x.due=nextTaskDate(x);x.done=false;}
        else x.done=!x.done;
      });break;
      case 'edit-task':taskModal(id);break;
      case 'delete-item':mutate(()=>{const x=getList(list);if(x)x.items=x.items.filter(x=>x.id!==id);});break;
      case 'clear-completed':if(confirm('完了した項目を削除しますか？')){mutate(()=>{const x=getList(list);if(x)x.items=x.items.filter(x=>!x.done);});}break;
      case 'photo-filter':ui.photoAlbum=trigger.dataset.album;refreshPhotos();render();break;
      case 'photo-album-manage':{const albums=state.prefs.photoAlbums||[];modal('アルバムの管理',`<div class="context-actions">${albums.length?albums.map(x=>`<div class="reorder-row"><span>${esc(x)}</span><button type="button" data-action="photo-album-rename" data-album="${esc(x)}" aria-label="アルバム名を変更">${svgIcon('note')}</button><button type="button" data-action="photo-album-delete" data-album="${esc(x)}" aria-label="アルバムを削除">${svgIcon('trash')}</button></div>`).join(''):'アルバムはまだありません。'}</div>`);break;}
      case 'photo-album-rename':{const before=trigger.dataset.album,n=prompt('新しいアルバム名',before);if(!n?.trim()||n.trim()===before)break;const after=n.trim().slice(0,100);if(state.prefs.photoAlbums.includes(after)){showToast('同じ名前のアルバムがあります。');break;}photoAll().then(records=>photoReplace(records.map(x=>({...x,album:(x.album||'')===before?after:x.album})))).then(()=>{state.prefs.photoAlbums=state.prefs.photoAlbums.map(x=>x===before?after:x);if(ui.photoAlbum===before)ui.photoAlbum=after;save();closeModal();render();showToast('アルバム名を変更しました。');}).catch(()=>showToast('アルバム名を変更できませんでした。'));break;}
      case 'photo-album-delete':{const album=trigger.dataset.album;if(!confirm('アルバム「'+album+'」を削除しますか？写真自体は削除せず未分類へ移動します。'))break;photoAll().then(records=>photoReplace(records.map(x=>({...x,album:(x.album||'')===album?'':x.album})))).then(()=>{state.prefs.photoAlbums=state.prefs.photoAlbums.filter(x=>x!==album);if(ui.photoAlbum===album)ui.photoAlbum='__all__';save();closeModal();render();showToast('アルバムを削除しました。');}).catch(()=>showToast('アルバムを削除できませんでした。'));break;}
      case 'photo-album-add':{const name=prompt('アルバム名を入力してください');if(!name?.trim())break;const text=name.trim().slice(0,100);if(['__all__','__uncategorized__'].includes(text))break;state.prefs.photoAlbums=state.prefs.photoAlbums||[];if(!state.prefs.photoAlbums.includes(text))state.prefs.photoAlbums.push(text);ui.photoAlbum=text;save();render();break;}
      case 'photo-meta':{photoGet(id).then(rec=>{if(!rec)return;closeModal();modal('写真を整理',`<form data-form="photo-meta" data-id="${esc(id)}"><div class="form-group"><label>写真の名前</label><input class="field" name="name" required value="${esc(rec.name)}"></div><div class="form-group"><label>アルバム</label><input class="field" list="photo-albums-list" name="album" value="${esc(rec.album||'')}" placeholder="空欄は未分類"><datalist id="photo-albums-list">${(state.prefs.photoAlbums||[]).map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist></div><div class="form-group"><label>タグ（カンマ区切り）</label><input class="field" name="tags" value="${esc((rec.tags||[]).join(', '))}"></div><div class="form-group"><label>メモ</label><textarea class="text-area" name="caption">${esc(rec.caption||'')}</textarea></div><button class="primary-btn" type="submit">保存</button></form>`);}).catch(()=>showToast('写真を読み込めませんでした。'));break;}
      case 'add-photo':closeModal();if(ui.page!=='photos')navigate('photos');$('#photo-files')?.click();break;
      case 'view-photo':openPhoto(id);break;
      case 'rename-photo':{const rec=photoEntries.find(x=>x.id===id);if(rec){closeModal();modal('写真の名前を変更',`<form data-form="photo-name" data-id="${esc(id)}"><div class="form-group"><label for="photo-name">名前</label><input id="photo-name" class="field" name="name" maxlength="140" value="${esc(rec.name)}" required></div><div class="modal-footer"><button class="primary-btn" type="submit">保存</button></div></form>`);}break;}
      case 'delete-photo':if(confirm('この写真をツールボックスから削除しますか？')){photoDelete(id).then(()=>{closeModal();refreshPhotos();showToast('写真を削除しました。');}).catch(()=>showToast('写真を削除できませんでした。'));}break;
      case 'add-note':noteModal();break;
      case 'edit-note':noteModal(id);break;
      case 'duplicate-note':{const x=state.notes.find(x=>x.id===id);if(!x)break;mutate(()=>state.notes.unshift({...x,id:uid(),title:(x.title+' コピー').slice(0,150),updatedAt:new Date().toISOString()}));closeModal();showToast('メモを複製しました。');break;}
      case 'delete-note':if(confirm('このメモを削除しますか？')){mutate(()=>state.notes=state.notes.filter(x=>x.id!==id));showToast('メモを削除しました。');}break;
      case 'quick-item-shopping':quickItem('shopping');break;
      case 'quick-item-todo':quickItem('todo');break;
      case 'notification-enable':{if(!('Notification' in window)){showToast('この端末では通知を利用できません。');break;}if(Notification.permission==='granted'){showToast('通知は許可されています。');break;}if(Notification.permission==='denied'){showToast('通知は端末設定から許可してください。');break;}Notification.requestPermission().then(x=>showToast(x==='granted'?'通知を許可しました。':'通知は許可されていません。')).catch(()=>showToast('通知設定を変更できませんでした。'));break;}
      case 'backup':backup();break;
      case 'import':$('#import-file')?.click();break;
      case 'restore-backup':{const data=pendingImport;if(!data)break;const scope=trigger.dataset.scope;pendingImport=null;
        (async()=>{let oldPhotos=null;try{if(scope==='all'||scope==='photos'){oldPhotos=await photoAll();await photoReplace(data.photos);}if(scope==='all'||scope==='text'){const before=state,oldLoadError=dataLoadError;state=data.next;dataLoadError=false;if(!save()){state=before;dataLoadError=oldLoadError;throw Error('文字データを保存できませんでした');}}closeModal();navigate('home');showToast('指定した範囲を復元しました。');}catch(e){if(oldPhotos)await photoReplace(oldPhotos).catch(()=>{});showToast('復元できませんでした。データを確認してください。');}})();break;}
      
      case 'reset':if(confirm('予定・リンク・リスト・メモ・写真をすべて削除して初期化しますか？（元に戻せません）')){photoReplace([]).then(()=>{state=defaultData();dataLoadError=false;save();navigate('home');showToast('初期化しました。');}).catch(()=>showToast('初期化できませんでした。'));}break;
    }
  });

  function quickContextMenu(type,id){
    if(type==='photo'){
      const rec=photoEntries.find(x=>x.id===id);if(!rec)return;
      modal('写真：'+rec.name,`<div class="context-actions"><button class="secondary-btn" data-action="view-photo" data-id="${esc(id)}">写真を表示</button><button class="secondary-btn" data-action="photo-meta" data-id="${esc(id)}">アルバム・タグを編集</button><button class="secondary-btn" data-action="rename-photo" data-id="${esc(id)}">名前を変更</button></div>`);return;
    }
    if(type==='note'){
      const rec=state.notes.find(x=>x.id===id);if(!rec)return;
      modal('メモ：'+rec.title,`<div class="context-actions"><button class="secondary-btn" data-action="edit-note" data-id="${esc(id)}">編集</button><button class="secondary-btn" data-action="duplicate-note" data-id="${esc(id)}">複製</button><button class="danger-btn" data-action="delete-note" data-id="${esc(id)}">削除</button></div>`);return;
    }
    linkContextMenu(id);
  }
  function linkContextMenu(id){
    const rec=state.links.find(x=>x.id===id);if(!rec)return;
    modal('クイック操作：'+rec.name,`<div class="context-actions"><button type="button" class="secondary-btn" data-action="edit-link" data-id="${esc(id)}">編集する</button><button type="button" class="secondary-btn" data-action="duplicate-link" data-id="${esc(id)}">複製する</button><button type="button" class="secondary-btn" data-action="move-link-folder" data-id="${esc(id)}">フォルダへ移動</button><button type="button" class="secondary-btn" data-action="copy-link-url" data-id="${esc(id)}">URLをコピー</button><button type="button" class="secondary-btn" data-action="favorite-link" data-id="${esc(id)}">${rec.favorite?'お気に入りを解除':'お気に入りに登録'}</button></div>`);
  }
  document.addEventListener('contextmenu',e=>{const node=e.target.closest('[data-link-id],[data-photo-id],[data-note-id]');if(!node)return;e.preventDefault();const type=node.dataset.linkId?'link':node.dataset.photoId?'photo':'note';quickContextMenu(type,node.dataset.linkId||node.dataset.photoId||node.dataset.noteId);});
  let longPressTimer=null,longPressStart=null;
  document.addEventListener('touchstart',e=>{const node=e.target.closest('[data-link-id],[data-photo-id],[data-note-id]');if(!node||e.touches.length!==1)return;const t=e.touches[0];longPressStart={x:t.clientX,y:t.clientY,id:node.dataset.linkId||node.dataset.photoId||node.dataset.noteId,type:node.dataset.linkId?'link':node.dataset.photoId?'photo':'note'};clearTimeout(longPressTimer);longPressTimer=setTimeout(()=>{if(!longPressStart)return;suppressClickUntil=performance.now()+600;quickContextMenu(longPressStart.type,longPressStart.id);longPressStart=null;},570);},{passive:true});
  document.addEventListener('touchmove',e=>{if(longPressStart&&e.touches[0]&&Math.hypot(e.touches[0].clientX-longPressStart.x,e.touches[0].clientY-longPressStart.y)>12){clearTimeout(longPressTimer);longPressStart=null;}},{passive:true});
  document.addEventListener('touchend',()=>{clearTimeout(longPressTimer);longPressStart=null;},{passive:true});
  document.addEventListener('touchcancel',()=>{clearTimeout(longPressTimer);longPressStart=null;},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(ensureHabitDay()){save();render();}checkReminders();}});
  window.addEventListener('focus',()=>{if(ensureHabitDay()){save();render();}checkReminders();});
  setInterval(()=>{if(ensureHabitDay()){save();render();}checkReminders();},30000);

  document.addEventListener('submit',event=>{
    const form=event.target.closest('form[data-form]');if(!form)return;
    event.preventDefault();document.activeElement?.blur?.();const f=new FormData(form),kind=form.dataset.form,id=form.dataset.id;
    if(kind==='period-config'){
      const count=Number(f.get('periodCount'));if(!Number.isInteger(count)||count<1||count>12){showToast('1〜12限を選択してください。');return;}
      const periods=[];
      for(let i=1;i<=count;i++){const start=String(f.get('start'+i)||''),end=String(f.get('end'+i)||'');if(!TIME_RE.test(start)||!TIME_RE.test(end)||end<=start){showToast(`${i}限の開始・終了時刻を確認してください。`);return;}periods.push({start,end});}
      const deleting=state.timetable.classes.filter(c=>c.period>count).length;
      if(deleting&&!confirm(`時限数を減らすと${deleting}件の授業が削除されます。続行しますか？`))return;
      mutate(()=>{state.timetable.periods=periods;state.timetable.classes=state.timetable.classes.filter(c=>c.period<=count);});closeModal();showToast('時間割の時限と時間を保存しました。');return;
    }
    if(kind==='timetable-class'){
      const period=Number(f.get('period')),subject=String(f.get('subject')||'').trim(),room=String(f.get('room')||'').trim(),note=String(f.get('note')||'').trim();
      const days=[...new Set(f.getAll('day').map(Number))].filter(n=>Number.isInteger(n)&&n>=0&&n<5);
      if(!subject||!days.length||period<1||period>state.timetable.periods.length){showToast('授業名・曜日・時限を確認してください。');return;}
      const conflicts=state.timetable.classes.filter(c=>c.id!==id&&c.period===period&&c.days.some(day=>days.includes(day)));
      if(conflicts.length){showToast('指定した曜日・時限には既に授業があります。先に移動または削除してください。');return;}
      mutate(()=>{const rec={id:id||uid(),days,period,subject:subject.slice(0,120),room:room.slice(0,120),note:note.slice(0,700)};const index=state.timetable.classes.findIndex(c=>c.id===id);if(index>=0)state.timetable.classes[index]=rec;else state.timetable.classes.push(rec);});closeModal();showToast('リンクした曜日にも授業を保存しました。');return;
    }
    if(kind==='app-brand'){
      const appName=String(f.get('appName')||'').trim().slice(0,32);if(!appName){showToast('名前を入力してください。');return;}
      mutate(()=>{state.prefs.appName=appName;state.prefs.appIconKey=legacyIcon(f.get('iconKey')||'grid','grid');state.prefs.appIconImage=imageDataOk(f.get('appIconImage'))?String(f.get('appIconImage')):'';});closeModal();showToast('アプリ名・アイコンを変更しました。');return;
    }
    if(kind==='link-move'){const x=state.links.find(x=>x.id===id);if(x){mutate(()=>x.folder=String(f.get('folder')||''));closeModal();showToast('フォルダへ移動しました。');}return;}
    if(kind==='web-search'){webSearch(f.get('query'));return;}
    if(kind==='task-edit'){
      const title=String(f.get('title')||'').trim(),due=String(f.get('due')||''),repeat=String(f.get('repeat')||'none');
      if(!title || (due&&!isDateKey(due)) || (repeat!=='none'&&!due)){showToast('内容と期限を確認してください。');return;}
      mutate(()=>{const items=getList('tasks').items;const old=items.find(x=>x.id===id);const rec={id:id||uid(),title:title.slice(0,500),done:old?.done||false,category:'todo',due,repeat,repeatAnchor:(old?.due===due&&old?.repeat===repeat?old.repeatAnchor||due:due),completedDates:old?.completedDates||[]};if(old)Object.assign(old,rec);else items.unshift(rec);});closeModal();showToast('TODOを保存しました。');return;
    }
    if(kind==='habits'){
      mutate(()=>{state.habits.items.forEach((x,i)=>{const title=String(f.get('habit'+i)||'').trim().slice(0,100);if(title!==x.title)x.done=false;x.title=title;});recordHabitDay();});showToast('毎日の習慣を保存しました。');
    }else if(kind==='event'){
      const title=String(f.get('title')||'').trim();
      const date=String(f.get('date')||'');
      const allDay=f.has('allDay');
      const start=allDay?'09:00':String(f.get('start')||'');
      const end=allDay?'10:00':String(f.get('end')||'');
      if(!title || !isDateKey(date) || (isDateKey(String(f.get('repeatUntil')))&&String(f.get('repeatUntil'))<date) || (!allDay && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end<=start))){alert('日付と時刻を確認してください。終了時刻は開始時刻より後にしてください。');return;}
      mutate(()=>{
        const rec={id:id||uid(),title:title.slice(0,150),date,allDay,start,end,location:String(f.get('location')||'').trim().slice(0,250),description:String(f.get('description')||'').slice(0,3000),repeat:String(f.get('repeat')||'none'),repeatUntil:isDateKey(String(f.get('repeatUntil')))?String(f.get('repeatUntil')):'',remind:Number(f.get('remind'))||0};
        const idx=state.events.findIndex(x=>x.id===id);
        if(idx>=0)state.events[idx]=rec;else state.events.push(rec);
        ui.calendarMonth=date.slice(0,7);ui.selectedDate=date;
      });
      closeModal();showToast('マイカレンダーに保存しました。');
    }else if(kind==='link'){
      const name=String(f.get('name')||'').trim();
      const entered=String(f.get('url')||'').trim();
      const url=id===CIVILIZATION_ID&&entered===CIVILIZATION_URL?CIVILIZATION_URL:normalizedUrl(entered);
      if(!name||!url){alert('名前と正しいURLを入力してください。');return;}
      const kind=['web','app','game'].includes(f.get('kind'))?f.get('kind'):'web';
      mutate(()=>{const rec={id:id||uid(),name,url,icon:'🔗',iconKey:legacyIcon(String(f.get('iconKey')||(kind==='app'?'game':'link'))),iconImage:imageDataOk(f.get('iconImage'))?f.get('iconImage'):'',kind,category:String(f.get('category')||'').trim(),folder:String(f.get('folder')||'').trim().slice(0,100),favorite:f.has('favorite'),browser:['inherit',...BROWSERS.map(x=>x[0])].includes(f.get('browser'))?f.get('browser'):'inherit'};const idx=state.links.findIndex(x=>x.id===id);if(idx>=0)state.links[idx]=rec;else state.links.push(rec);});
      closeModal();const targetPage=kind==='game'?'games':kind==='app'?'apps':'links';if(ui.page!==targetPage)navigate(targetPage);else render();showToast(kind==='game'?'ゲームを保存しました。':kind==='app'?'アプリを保存しました。':'リンクを保存しました。');
    }else if(kind==='note'){
      const title=String(f.get('title')||'').trim();if(!title)return;
      mutate(()=>{const rec={id:id||uid(),title,body:String(f.get('body')||''),updatedAt:new Date().toISOString()};const idx=state.notes.findIndex(x=>x.id===id);if(idx>=0)state.notes[idx]=rec;else state.notes.unshift(rec);});closeModal();showToast('メモを保存しました。');
    }else if(kind==='list'){
      const name=String(f.get('name')||'').trim();if(!name)return;
      mutate(()=>{const existing=getList(id);if(existing){existing.name=name;existing.iconKey=legacyIcon(String(f.get('iconKey')||'list'),'list');}else{const next={id:uid(),name,icon:'📋',iconKey:legacyIcon(String(f.get('iconKey')||'list'),'list'),builtin:false,items:[]};state.lists.push(next);ui.listId=next.id;}});closeModal();navigate('lists');showToast('リストを保存しました。');
    }else if(kind==='photo-meta'){
      photoGet(id).then(rec=>{if(!rec)throw Error('写真が見つかりません');rec.name=String(f.get('name')||'写真').trim().slice(0,140);rec.album=String(f.get('album')||'').trim().slice(0,100);rec.tags=String(f.get('tags')||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,15);rec.caption=String(f.get('caption')||'').slice(0,500);return photoPut(rec).then(()=>rec);}).then(rec=>{if(rec.album){state.prefs.photoAlbums=state.prefs.photoAlbums||[];if(!state.prefs.photoAlbums.includes(rec.album))state.prefs.photoAlbums.push(rec.album);save();}closeModal();render();showToast('写真の整理情報を保存しました。');}).catch(()=>showToast('変更できませんでした。'));
    }else if(kind==='photo-name'){
      const name=String(f.get('name')||'').trim();if(!name)return;
      photoGet(id).then(rec=>{if(!rec)throw Error();rec.name=name.slice(0,140);return photoPut(rec);}).then(()=>{closeModal();refreshPhotos();showToast('写真の名前を変更しました。');}).catch(()=>showToast('変更できませんでした。'));
    }else if(kind==='item'){
      const title=String(f.get('title')||'').trim(),list=getList(form.dataset.listId);if(!title||!list)return;
      mutate(()=>list.items.unshift({id:uid(),title,done:false,...(list.id==='tasks'?{category:f.get('category')==='shopping'?'shopping':'todo',due:'',repeatAnchor:'',repeat:'none',completedDates:[]}:{})}));
      $('#main-content input[name="title"]')?.focus();
    }
  });
  document.addEventListener('input',event=>{
    const key=event.target.dataset.search;if(!key)return;
    const newValue=event.target.value,cursor=event.target.selectionStart;
    if(key==='link')ui.linkSearch=newValue;
    if(key==='app')ui.appSearch=newValue;
    if(key==='game')ui.gameSearch=newValue;
    if(key==='note')ui.noteSearch=newValue;
    if(key==='photo'){ui.photoSearch=newValue;refreshPhotos();return;}
    if(key==='global'){ui.globalSearch=newValue;renderGlobalResults();return;}
    render();const next=$(`[data-search="${key}"]`);next?.focus();try{next?.setSelectionRange(cursor,cursor);}catch{}
  });
  document.addEventListener('change',event=>{
    if(event.target.id==='period-count'){
      const count=Number(event.target.value);event.target.closest('form')?.querySelectorAll('[data-period-row]').forEach(row=>row.hidden=Number(row.dataset.periodRow)>count);
    }
    if(event.target.id==='brand-icon-file')readBrandFile(event.target.files?.[0]);
    if(event.target.matches('[data-event-allday]')){
      event.target.closest('form')?.querySelectorAll('[data-time-field]').forEach(input=>input.disabled=event.target.checked);
    }
    if(event.target.matches('[data-nav-slot]')){const slots=Array.from(document.querySelectorAll('[data-nav-slot]'));const chosen=slots.map(x=>x.value);if(new Set(chosen).size!==5){showToast('同じツールは2回設定できません。');render();return;}state.prefs.bottomNav=chosen;save();render();showToast('下部ショートカットを更新しました。');return;}
    if(event.target.dataset.setting==='theme'){state.prefs.theme=event.target.value;save();render();}
    if(['defaultBrowser','searchBrowser','searchEngine'].includes(event.target.name)){state.prefs[event.target.name]=event.target.value;save();showToast('設定を保存しました。');}
    if(event.target.id==='import-file'){const file=event.target.files?.[0];event.target.value='';importFile(file);}
    if(event.target.id==='photo-files')photoAddFiles(event.target.files);
    if(event.target.id==='link-icon-file')readIconFile(event.target.files?.[0]);
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(document.getElementById('photo-fullscreen')){closeFullscreenPhoto();return;}
    if($('#modal-root .modal-overlay'))closeModal();
    else if(ui.drawerOpen)setDrawer(false);
  });
  // Standalone PWA swipe gestures. Only begin at screen edges to avoid
  // hijacking list scrolling, text editing, or ordinary vertical scrolling.
  const SWIPE_EDGE=64;
  const SWIPE_DISTANCE=72;
  let touchGesture=null;
  let suppressClickUntil=0;
  document.addEventListener('click',event=>{
    if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  document.addEventListener('touchstart',event=>{
    touchGesture=null;
    if(event.touches.length!==1 || $('#modal-root .modal-overlay') || document.getElementById('photo-fullscreen'))return;
    if(event.target.closest('input,textarea,select,[contenteditable],.list-switch,.rubiks-stage'))return;
    const touch=event.touches[0];
    const rect=$('#app')?.getBoundingClientRect();
    if(!rect)return;
    const left=touch.clientX-rect.left;
    const right=rect.right-touch.clientX;
    if(left<0 || right<0)return;
    const kind=ui.drawerOpen?'close':(ui.page==='calendar'&&event.target.closest('.calendar-swipe-zone'))?'calendar':right<=SWIPE_EDGE?'open':'back';
    touchGesture={id:touch.identifier,x:touch.clientX,y:touch.clientY,kind,started:performance.now()};
  },{passive:true});
  document.addEventListener('touchcancel',()=>{touchGesture=null;},{passive:true});
  document.addEventListener('touchend',event=>{
    const g=touchGesture;touchGesture=null;
    if(!g)return;
    const touch=Array.from(event.changedTouches).find(t=>t.identifier===g.id);
    if(!touch)return;
    const dx=touch.clientX-g.x,dy=touch.clientY-g.y;
    if(Math.abs(dx)<SWIPE_DISTANCE || Math.abs(dx)<1.4*Math.abs(dy) || performance.now()-g.started>900)return;
    if((g.kind==='open' && dx<0)||(g.kind==='close' && dx>0)||(g.kind==='back' && dx>0)||g.kind==='calendar'){
      suppressClickUntil=performance.now()+320;
      if(g.kind==='calendar'){shiftCalendarMonth(dx<0?1:-1);return;}
      if(g.kind==='open')setDrawer(true,false);
      else if(g.kind==='close')setDrawer(false,false);
      else goBack();
    }
  },{passive:true});
  // Dragging the cube changes camera orientation; rotations use explicit face buttons.
  let cubeDrag=null;
  document.addEventListener('pointerdown',e=>{
    const stage=e.target.closest('.rubiks-stage');if(!stage)return;
    cubeDrag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:ui.cubeYaw,pitch:ui.cubePitch};
    stage.setPointerCapture?.(e.pointerId);
  });
  document.addEventListener('pointermove',e=>{
    if(!cubeDrag||cubeDrag.id!==e.pointerId)return;
    const dx=e.clientX-cubeDrag.x,dy=e.clientY-cubeDrag.y;
    ui.cubeYaw=cubeDrag.yaw+dx*.65;ui.cubePitch=Math.max(-85,Math.min(85,cubeDrag.pitch-dy*.6));
    const body=document.querySelector('.rubiks-body');if(body)body.style.transform=`rotateX(${ui.cubePitch}deg) rotateY(${ui.cubeYaw}deg)`;
  });
  document.addEventListener('pointerup',e=>{if(cubeDrag?.id===e.pointerId)cubeDrag=null;});
  document.addEventListener('pointercancel',e=>{if(cubeDrag?.id===e.pointerId)cubeDrag=null;});
  // Photo-only zoom and pan: two-finger pinch+translation, one-finger pan when zoomed.
  let photoScale=1,photoOffsetX=0,photoOffsetY=0,photoGesture=null,lastPhotoTap=0;
  const photoPoint=t=>({x:t.clientX,y:t.clientY});
  const photoMid=(a,b)=>({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
  const photoDist=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  function photoApply(stage){
    const img=stage?.querySelector('img');if(!img)return;
    // Restrict pan to the visible image, not the entire PWA viewport.
    const bounds=stage.getBoundingClientRect();const natural=img.naturalWidth||bounds.width;const naturalH=img.naturalHeight||bounds.height;
    const fit=Math.min(bounds.width/natural,bounds.height/natural);
    const visibleW=natural*fit*photoScale,visibleH=naturalH*fit*photoScale;
    const maxX=Math.max(0,(visibleW-bounds.width)/2),maxY=Math.max(0,(visibleH-bounds.height)/2);
    photoOffsetX=Math.max(-maxX,Math.min(maxX,photoOffsetX));photoOffsetY=Math.max(-maxY,Math.min(maxY,photoOffsetY));
    img.style.transform=`translate3d(${photoOffsetX}px,${photoOffsetY}px,0) scale(${photoScale})`;
  }
  document.addEventListener('touchstart',e=>{
    const stage=e.target.closest('.photo-zoom-stage');if(!stage)return;
    e.preventDefault();const touches=e.touches;
    if(touches.length===2){photoGesture={type:'pinch',distance:photoDist(touches[0],touches[1]),mid:photoMid(touches[0],touches[1]),scale:photoScale,x:photoOffsetX,y:photoOffsetY};}
    else if(touches.length===1){photoGesture={type:'pan',point:photoPoint(touches[0]),x:photoOffsetX,y:photoOffsetY};}
  },{passive:false});
  document.addEventListener('touchmove',e=>{
    const stage=e.target.closest('.photo-zoom-stage');if(!stage)return;
    e.preventDefault();if(!photoGesture)return;
    if(e.touches.length===2){
      if(photoGesture.type!=='pinch'){photoGesture={type:'pinch',distance:photoDist(e.touches[0],e.touches[1]),mid:photoMid(e.touches[0],e.touches[1]),scale:photoScale,x:photoOffsetX,y:photoOffsetY};return;}
      const mid=photoMid(e.touches[0],e.touches[1]);photoScale=Math.max(1,Math.min(5,photoGesture.scale*photoDist(e.touches[0],e.touches[1])/Math.max(1,photoGesture.distance)));
      photoOffsetX=photoGesture.x+mid.x-photoGesture.mid.x;photoOffsetY=photoGesture.y+mid.y-photoGesture.mid.y;
    }else if(e.touches.length===1&&photoGesture.type==='pan'&&photoScale>1){
      photoOffsetX=photoGesture.x+e.touches[0].clientX-photoGesture.point.x;
      photoOffsetY=photoGesture.y+e.touches[0].clientY-photoGesture.point.y;
    }
    photoApply(stage);
  },{passive:false});
  document.addEventListener('touchend',e=>{
    const stage=e.target.closest('.photo-zoom-stage');if(!stage)return;
    e.preventDefault();
    if(e.touches.length===1){photoGesture={type:'pan',point:photoPoint(e.touches[0]),x:photoOffsetX,y:photoOffsetY};}
    else {photoGesture=null;if(photoScale===1){photoOffsetX=0;photoOffsetY=0;photoApply(stage);}}
    if(e.touches.length===0&&e.changedTouches.length===1){
      const now=performance.now();if(now-lastPhotoTap<310){photoScale=photoScale>1?1:2;photoOffsetX=0;photoOffsetY=0;photoApply(stage);lastPhotoTap=0;}else lastPhotoTap=now;
    }
  },{passive:false});
  document.addEventListener('dblclick',e=>{const stage=e.target.closest('.photo-zoom-stage');if(!stage)return;e.preventDefault();photoScale=photoScale>1?1:2;photoOffsetX=0;photoOffsetY=0;photoApply(stage);});
  window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change',()=>{if(state.prefs.theme==='system')render();});
  render();
  if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')) {
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Service worker registration failed',error)));
  }
})();
