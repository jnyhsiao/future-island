/* 校友角色對話系統：角色、問答樹、導覽與校園護照。
   All replies are pre-written guide content (keyword matched); nothing is sent to a server or an AI service.
   Works with the 3D scene (window.Island3D) and degrades to a plain chat panel on the SVG fallback. */
(function () {
  'use strict';
  const home = document.getElementById('islandHome');
  if (!home) return;
  const I3 = () => window.Island3D || null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- residents ----------
  // 校友靈感角色：顯示名與職業線索取自公開資料；台詞全部是原創教學對話，不是本人發言或代言。
  const R = {
    guide: { name: '陶子', role: '未來嶼主持人｜主持人學姊', emoji: '🎤', color: '#e1b15c', zone: '', pos: [-13, 10.6], ry: .6,
      look: { shirt: '#e2734f', pants: '#2f3a44', hair: 3, style: 4, glasses: true, hold: 'mic' }, start: 'guide.start',
      lines: ['這裡不選秀，不用準備一個感人的夢想。', '「不知道」可以，我們從下一個問題開始。', '先別急著說適不適合，說說妳試過什麼。'] },
    lunch: { name: '小沐', role: '午餐小屋｜早餐電影學姊', emoji: '🍱', color: '#c35c3b', zone: 'lunch', pos: [9.4, -3.2], ry: -.2, view: { theta: -.6, phi: .8 },
      look: { shirt: '#f3e3c3', pants: '#5d6f80', hair: 4, style: 5, hold: 'clap', bag: '#c35c3b' }, start: 'lunch.start',
      lines: ['早餐有電影，午餐有妳的下一步。', '便當要帶，標準答案不用。', '今天不用試鏡，坐下來聊就好。'] },
    planning: { name: '小英', role: '未來羅盤學姊', emoji: '🧭', color: '#7b9066', zone: 'planning', pos: [1.4, -3.1], ry: .5,
      look: { shirt: '#26282c', blazer: '#a9abad', pants: '#26282c', hair: 4, hairColor: '#2e2a27', style: 4, glasses: true, hold: 'book', pet: 'cat' }, start: 'planning.start',
      lines: ['先釐清問題，不急著宣布答案。', '把下一步想清楚，就已經是進度。', '這張表單，允許妳改變想法。'] },
    routes: { name: 'Alice學姊', role: '科系航線｜數學家學姊', emoji: '📐', color: '#5f7f9c', zone: 'routes', pos: [10.4, 11.2], ry: .2,
      look: { shirt: '#6f7f9e', pants: '#3f4752', hair: 3, hairColor: '#6b6560', style: 4, glasses: true, hold: 'board' }, start: 'routes.start',
      lines: ['「大家都選」不是證明。', '先看課表，再看系名。', '一次考試，不足以推出一整個人。'] },
    workshop: { name: '嫺靜', role: '創作工坊｜饒舌創作學姊', emoji: '🎧', color: '#d39a3c', zone: 'workshop', pos: [-3.75, -9.1], ry: .3,
      look: { shirt: '#f6f5f0', pants: '#3a3f47', hair: 4, style: 3, hat: 'headphones', hood: true, hold: 'mic' }, start: 'workshop.start',
      lines: ['先有一版，才有下一版。', '草稿還沒完成，不代表沒有價值。', '小電，先存檔，先不要刪。'] },
    resources: { name: '念華學姊', role: '資源燈塔｜新聞主播學姊', emoji: '🗂️', color: '#2f4f6f', zone: 'resources', pos: [-3.4, 8.5], ry: .4,
      look: { shirt: '#34506e', pants: '#2f3a44', hair: 4, style: 5, blazer: '#f2eee6', hold: 'folder' }, start: 'resources.start',
      lines: ['先不要轉傳，先找原始資料。', '消息有日期，簡章有學年度。', '查不到，就先標記待確認。'] }
  };
  const ZONE_NAME = { lunch: '午餐小屋', planning: '未來羅盤', routes: '科系航線', workshop: '學習工坊', resources: '資源燈塔' };
  const ZONE_OWNER = { lunch: 'lunch', planning: 'planning', routes: 'routes', workshop: 'workshop', resources: 'resources' };

  // ---------- island passport: kept in memory for this visit only; nothing is stored or sent ----------
  const visited = new Set();
  function stamp(zone) {
    if (!ZONE_NAME[zone] || visited.has(zone)) return;
    visited.add(zone);
    renderPassport(zone);
  }
  const unvisited = () => Object.keys(ZONE_NAME).filter(z => !visited.has(z));

  // ---------- options helpers ----------
  const go = (t, who) => ({ t, act: 'goto', who });
  const to = (t, node) => ({ t, to: node });
  const zone = (t, z) => ({ t, act: 'zone', zone: z });
  const link = (t, url) => ({ t, act: 'link', url });
  const BYE = { t: '謝謝，先這樣', act: 'close' };
  const MORE = { t: '我想問別的學姊', act: 'ask' };
  const TOPIC = { guide: '不知道從哪開始 → 陶子', lunch: '午餐預約 → 小沐', planning: '升學規劃表 → 小英', routes: '科系與課程 → Alice學姊', workshop: '準備與作品 → 嫺靜', resources: '官方招生資料 → 念華學姊' };
  const HUB = go('回去找主持人陶子', 'guide');

  // ---------- dialogue nodes (原創教學對話，非本人發言) ----------
  const N = {
    'guide.start': { who: 'guide', say: ['歡迎！我是陶子，今天的未來嶼主持人 🎤', '先說好，這裡沒有評審，也沒有淘汰區。妳可以帶著夢想來，也可以只帶一句「我真的不知道」。我們都接得住。', '今天想從哪裡開始？'],
      opts: [{ t: '第一次來，帶我逛一圈', act: 'tour' }, go('我想跟老師約午餐聊聊', 'lunch'), to('我不知道自己想讀什麼', 'guide.lost'), go('我想找升學官方資料', 'resources'), to('看看我的校園護照', 'guide.passport'), MORE] },
    'guide.lost': { who: 'guide', say: ['「我沒有方向。」好，這是開場，不是結論。', '先把「未來想做什麼」縮小：最近有哪件事，妳明明可以停下來，卻又多做了十分鐘？', '想到了嗎？我幫妳找對的學姊——'],
      opts: [go('想比較課程 → 找 Alice學姊', 'routes'), go('想整理做過的事 → 找嫺靜', 'workshop'), go('直接約老師午餐 → 找小沐', 'lunch'), MORE, BYE] },
    'guide.passport': { who: 'guide', say: () => {
        const left = unvisited();
        if (!left.length) return ['五個章全部蓋滿了！🎉 不過提醒一下：蓋章只代表妳逛過，不代表已經填表或預約成功喔。', '推薦順序：先找小英填好規劃表 → 到工坊跟嫺靜整理要聊什麼 → 去午餐小屋找小沐預約。'];
        return ['妳的校園護照已經蓋了 ' + visited.size + '／5 個章。', '還沒去過：' + left.map(z => ZONE_NAME[z]).join('、') + '。要不要我帶妳去' + ZONE_NAME[left[0]] + '？'];
      },
      opts: () => { const left = unvisited(); return (left.length ? [go('好，帶我去' + ZONE_NAME[left[0]], ZONE_OWNER[left[0]])] : [go('去午餐小屋預約', 'lunch')]).concat([{ t: '帶我逛全校', act: 'tour' }, BYE]); } },
    'lunch.start': { who: 'lunch', say: ['我是小沐 🍱 這裡不拍一整年的早餐，只約一頓能好好說話的午餐。', '今天不用演「已經把未來想清楚的高中生」，說真實的妳就好。'],
      opts: [to('要怎麼預約？', 'lunch.how'), to('可以跟朋友一起去嗎？', 'lunch.pair'), to('哪些時間可以約？', 'lunch.when'), to('要準備什麼嗎？', 'lunch.prep'), zone('我要預約！', 'lunch'), MORE] },
    'lunch.how': { who: 'lunch', say: ['預約只要三步：', '① 進入預約頁，輸入妳的座號和老師個別發給妳的認證碼。', '② 選 1 人或 2 人；兩人組由一位代表預約就好。', '③ 選一個空檔送出，看到「預約成功」才算完成。', '認證碼是妳自己的，不要給別人，包括同伴喔。'],
      opts: [to('可以跟朋友一起去嗎？', 'lunch.pair'), to('哪些時間可以約？', 'lunch.when'), zone('我要預約！', 'lunch'), MORE, BYE] },
    'lunch.pair': { who: 'lunch', say: ['可以找一位朋友一起來！一組最多 2 個人。', '不用把對方的認證碼拿來：先問過她、得到同意，再由一位代表登入、選同伴的座號就好。', '同伴之後可以用自己的碼登入查看；每個人這一輪只能在一組裡。', '想單獨聊，也可以選 1 人組。'],
      opts: [to('哪些時間可以約？', 'lunch.when'), to('想改約或取消怎麼辦？', 'lunch.change'), zone('我要預約！', 'lunch'), MORE, BYE] },
    'lunch.when': { who: 'lunch', say: ['拍攝通告可以有很多場，這裡每天只有一組午餐：週一、三、五開放。', '新增、改約、取消都要在前一天 23:59 前完成。', '國定假日與學校停約的日子不開放；最新空檔請到預約頁登入查看。'],
      opts: [to('想改約或取消怎麼辦？', 'lunch.change'), to('要準備什麼嗎？', 'lunch.prep'), zone('去看空檔', 'lunch'), MORE, BYE] },
    'lunch.change': { who: 'lunch', say: ['由原本預約的代表登入預約頁，就能修改或取消，一樣要在前一天 23:59 前完成。', '改約如果沒成功，原本的預約會保留，不會兩頭落空。', '當天臨時有事，直接找導師。'],
      opts: [zone('前往預約頁', 'lunch'), to('要準備什麼嗎？', 'lunch.prep'), MORE, BYE] },
    'lunch.prep': { who: 'lunch', say: ['不用先背好台詞 🎬', '帶一件做過的事、一個卡住的問題，就很夠聊了。工坊的嫺靜可以陪妳整理。', '另外，每個人都要各填一份升學規劃表，羅盤那邊的小英會告訴妳怎麼填。'],
      opts: [go('去找嫺靜', 'workshop'), go('去找小英', 'planning'), zone('我要預約！', 'lunch'), MORE] },

    'planning.start': { who: 'planning', say: ['我是小英 🧭', '先把問題縮小：今天不用決定十年後的人生，只要寫下妳目前想多了解的兩三個方向。', '未來可以修正，現在先留下一個版本。'],
      opts: [to('升學規劃表是什麼？', 'planning.what'), to('一定要每個人都填嗎？', 'planning.each'), to('我還沒想清楚，也能填嗎？', 'planning.unsure'), to('填的內容誰會看到？', 'planning.privacy'), zone('帶我去填', 'planning'), MORE] },
    'planning.what': { who: 'planning', say: ['升學規劃表是一份給導師看的 Google 表單：妳感興趣的方向、在考慮的升學管道、學習狀態，還有想一起討論的問題。', '它不是正式志願選填，這張表單允許妳改變想法。午餐時老師會參考它跟妳聊。'],
      opts: [to('一定要每個人都填嗎？', 'planning.each'), to('填的內容誰會看到？', 'planning.privacy'), zone('帶我去填', 'planning'), MORE, BYE] },
    'planning.each': { who: 'planning', say: ['午餐可以兩個人一起來，規劃表要每人各填一份。', '兩個人有自己的想法，很合理，不需要先討論出同一個答案。'],
      opts: [to('我還沒想清楚，也能填嗎？', 'planning.unsure'), zone('帶我去填', 'planning'), MORE, BYE] },
    'planning.unsure': { who: 'planning', say: ['不確定就寫不確定，不必填一個比較像好學生會寫的答案。', '也可以分成兩欄：哪些是妳自己的好奇，哪些是別人的期待。我們先把它們看清楚，再來談。'],
      opts: [go('先找 Alice學姊比較科系', 'routes'), zone('帶我去填', 'planning'), MORE, BYE] },
    'planning.privacy': { who: 'planning', say: ['這個網站不讀取或保存妳的表單答案；表單回覆由導師依設定管理。', '有不想寫下的細節，可以註記「想當面談」，或預約 1 人組。'],
      opts: [zone('帶我去填', 'planning'), go('去午餐小屋約 1 人組', 'lunch'), MORE, BYE] },

    'routes.start': { who: 'routes', say: ['我是 Alice 📐，在科學館負責數理探索。', '選科系先不要急著猜答案，先找證據：妳喜歡的，是把工具做出來、把原理弄懂，還是從資料裡找到規律？', '我們拿課表來比，不只比名字聽起來多厲害。'],
      opts: [to('把工具或程式做出來', 'routes.code'), to('把東西的原理弄懂', 'routes.hw'), to('從資料或數字裡找規律', 'routes.data'), to('其實我對別的領域更有興趣', 'routes.other'), to('我真的不知道…', 'routes.unknown'), MORE] },
    'routes.code': { who: 'routes', say: ['把「我喜歡程式」再拆細一點：妳喜歡設計功能、解決錯誤，還是把工具交給別人使用？', '資訊工程、資訊管理都和程式有關，課程重點卻差很多。', '小實驗：在 ColleGo! 找兩個系，比較大一、大二的必修課，記下一個吸引妳的地方和一個疑問。'],
      opts: [link('打開 ColleGo! ↗', 'https://collego.edu.tw/'), to('比完之後要做什麼？', 'routes.next'), zone('看科系航線的探索提問', 'routes'), to('換一個答案', 'routes.start'), MORE] },
    'routes.hw': { who: 'routes', say: ['想弄懂東西怎麼運作，可以看看電機、電子、光電這些系。', '它們會從電路、訊號一路學到晶片與控制，數學和物理會常常出現。', '先別用一次考試判斷自己適不適合，去看課表裡實際在學什麼。'],
      opts: [link('打開 ColleGo! ↗', 'https://collego.edu.tw/'), to('比完之後要做什麼？', 'routes.next'), zone('看科系航線的探索提問', 'routes'), to('換一個答案', 'routes.start'), MORE] },
    'routes.data': { who: 'routes', say: ['從資料裡找規律，可以比較資料科學、統計、應用數學，或資工系裡和 AI 相關的課。', '用資料回答問題，也要理解方法背後的數學；問問自己喜不喜歡追問「為什麼這個方法成立」。'],
      opts: [link('打開 ColleGo! ↗', 'https://collego.edu.tw/'), to('比完之後要做什麼？', 'routes.next'), zone('看科系航線的探索提問', 'routes'), to('換一個答案', 'routes.start'), MORE] },
    'routes.other': { who: 'routes', say: ['電資學群是妳現在的學習安排，不是只能走一條路的限制。', '把另外那個想探索的領域也放進比較；不用先替自己的好奇心道歉。', '寫進升學規劃表，午餐時跟老師好好聊。'],
      opts: [go('去找小英填規劃表', 'planning'), go('約老師午餐聊', 'lunch'), to('換一個答案', 'routes.start'), MORE] },
    'routes.unknown': { who: 'routes', say: ['「我現在不知道」和「我永遠不會知道」是兩個不同的命題。', '先做一個小實驗：挑兩個系，各找一門必修課。妳比較想追問哪一門在做什麼？', '如果想先從做過的事找線索，工坊的嫺靜很適合聊。'],
      opts: [go('去找嫺靜', 'workshop'), go('直接約老師午餐聊', 'lunch'), to('換一個答案', 'routes.start'), MORE] },
    'routes.next': { who: 'routes', say: ['留下三筆資料：一項課程差異、一個吸引妳的地方、一個還不懂的問題。', '這三筆資料，比「好像不錯」更方便帶去和老師討論。'],
      opts: [go('去預約午餐', 'lunch'), go('也去填規劃表', 'planning'), MORE, BYE] },

    'workshop.start': { who: 'workshop', say: ['我是嫺靜 🎧 這裡可以放半成品，沒有作品發表會，也不檢查獎狀張數。', '先拿一小段出來：一份報告、一個程式，或一題讓妳卡很久的數學。小電，開錄——', '（小電：嗶——草稿模式——啟動——）'],
      opts: [to('要帶哪三樣東西？', 'workshop.three'), to('我沒有什麼作品或比賽…', 'workshop.none'), to('有些事不想在同學面前說', 'workshop.private'), zone('看工坊的準備提示', 'workshop'), MORE] },
    'workshop.three': { who: 'workshop', say: ['三樣就好：', '① 一件做過的事：一次解題、一個程式、一份課堂作品都可以。', '② 一個卡住的地方：不知道自己喜歡什麼、某科卡關，都算。', '③ 一個願意試的小行動：不用太大，兩週內做得到，比寫得很厲害重要。'],
      opts: [go('準備好了，去預約午餐', 'lunch'), to('我沒有什麼作品…', 'workshop.none'), MORE, BYE] },
    'workshop.none': { who: 'workshop', say: ['沒有得獎，也可以聊作品。', '像一段 demo，最值得聊的常常是：原本想做什麼、哪裡不順、後來改了什麼。先找一件妳真的動手做過的事。', '（小電：嗶——先存檔——先不要刪——）'],
      opts: [to('那要帶哪三樣東西？', 'workshop.three'), go('找 Alice學姊比較科系', 'routes'), MORE, BYE] },
    'workshop.private': { who: 'workshop', say: ['不是每一段草稿都要公開。', '私人的事可以留到 1 人午餐談，或在規劃表只寫「想當面談」。不用把細節打在網站上。'],
      opts: [go('去找小英填表', 'planning'), go('去午餐小屋約 1 人組', 'lunch'), MORE, BYE] },

    'resources.start': { who: 'resources', say: ['我是念華，歡迎來到燈塔資訊台 🗂️', '查資料前先做三件事：找來源、看學年度、確認適用條件。沒有這三項，再漂亮的整理圖也先不要當定論。', '妳們這屆通常對應 117 學年度大學入學，資格、採計、時程都要看那一年的正式簡章。'],
      opts: [to('繁星推薦、申請入學', 'resources.cac'), to('分科測驗、分發入學', 'resources.uac'), to('學測和考試資訊', 'resources.ceec'), to('科技大學', 'resources.tech'), to('APCS 是什麼？', 'resources.apcs'), to('我想比較科系', 'resources.collego'), zone('列出全部官方資源', 'resources'), MORE] },
    'resources.cac': { who: 'resources', say: ['繁星推薦和申請入學，先到「大學甄選入學委員會」。', '找到妳這屆的簡章，再看各校系分則；別把別屆的截圖當成今年的條件。'], opts: [link('前往甄選會 ↗', 'https://www.cac.edu.tw/'), to('問別的管道', 'resources.start'), MORE, BYE] },
    'resources.uac': { who: 'resources', say: ['分發入學看「大學考試入學分發委員會」。', '各校系採計哪些科目、怎麼加權，寫在校系分則裡；記下來源和學年度。'], opts: [link('前往分發會 ↗', 'https://www.uac.edu.tw/'), to('問別的管道', 'resources.start'), MORE, BYE] },
    'resources.ceec': { who: 'resources', say: ['學測、分科測驗的日期、簡章和公告，以「大學入學考試中心」為準。', '消息有日期，簡章有學年度。'], opts: [link('前往大考中心 ↗', 'https://www.ceec.edu.tw/'), to('問別的管道', 'resources.start'), MORE, BYE] },
    'resources.tech': { who: 'resources', say: ['想讀科技大學，招生管道在「技專校院招生策略委員會」。'], opts: [link('前往技專招生 ↗', 'https://www.techadmi.edu.tw/'), to('問別的管道', 'resources.start'), MORE, BYE] },
    'resources.apcs': { who: 'resources', say: ['APCS 是「大學程式設計先修檢測」，有些資訊相關科系會參考。', '不要先問大家是不是都報名，先看目標校系的要求。查完有疑問，就記下來源、學年度和問題，帶去問老師。'], opts: [link('APCS 官方網站 ↗', 'https://apcs.csie.ntnu.edu.tw/'), go('找 Alice學姊比較科系', 'routes'), to('問別的管道', 'resources.start'), MORE] },
    'resources.collego': { who: 'resources', say: ['系名是標題，課表才是內文。', '到 ColleGo! 比較兩個系，再去校系官網核對課程；不要只憑一張排名圖做決定。'], opts: [link('打開 ColleGo! ↗', 'https://collego.edu.tw/'), go('找 Alice學姊一起比', 'routes'), to('問別的管道', 'resources.start'), MORE] }
  };

  // ---------- chat panel UI ----------
  const panel = document.createElement('section');
  panel.className = 'chat-panel'; panel.id = 'chatPanel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'chatName');
  panel.innerHTML = '<header class="chat-head"><span class="chat-avatar" id="chatAvatar" aria-hidden="true"></span><div class="chat-who"><strong id="chatName"></strong><small id="chatRole"></small></div><button type="button" class="chat-close" id="chatClose" aria-label="關閉對話">×</button></header>' +
    '<div class="chat-log" id="chatLog" aria-live="polite"></div><div class="chat-opts" id="chatOpts"></div>' +
    '<p class="chat-foot" title="校友靈感角色｜原創教學對話，非本人發言或代言">引導對話</p>';
  home.appendChild(panel);
  const $ = id => document.getElementById(id);
  const log = $('chatLog'), optsEl = $('chatOpts');
  let speaker = 'guide', runId = 0, tourStep = -1;

  function setSpeaker(id) {
    speaker = id; const r = R[id];
    $('chatAvatar').textContent = r.emoji; $('chatAvatar').style.background = r.color;
    $('chatName').textContent = r.name; $('chatRole').textContent = r.role;
    if (I3()) I3().setTalking(id, true);
    if (r.zone) stamp(r.zone);
  }
  function openChat() {
    if (!panel.hidden) return;
    panel.hidden = false; home.classList.add('chat-open');
    if (I3()) I3().refit();
  }
  function closeChat() {
    if (panel.hidden) return;
    panel.hidden = true; home.classList.remove('chat-open'); runId++; tourStep = -1;
    if (I3()) { I3().setTalking('', false); I3().refit(); }
  }
  $('chatClose').addEventListener('click', closeChat);
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeChat(); } });

  function addMsg(text, who) {
    const row = document.createElement('div');
    row.className = 'chat-msg ' + (who === 'me' ? 'me' : 'them');
    if (who === 'note') row.className = 'chat-note';
    if (who !== 'me' && who !== 'note') {
      const av = document.createElement('span'); av.className = 'chat-mini'; av.textContent = R[who].emoji; av.style.background = R[who].color; av.setAttribute('aria-hidden', 'true'); row.append(av);
    }
    const b = document.createElement('p'); b.textContent = text; row.append(b);
    log.append(row); log.scrollTop = log.scrollHeight;
    return row;
  }
  const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));
  async function speak(lines, who, id) {
    for (const line of lines) {
      if (id !== runId) return false;
      const dots = addMsg('…', who); dots.classList.add('typing');
      await wait(Math.min(900, 280 + line.length * 18));
      dots.remove(); if (id !== runId) return false;
      addMsg(line, who);
      await wait(120);
    }
    return id === runId;
  }
  function showOpts(list) {
    optsEl.innerHTML = '';
    list.forEach(o => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chat-opt' + (o.act === 'zone' || o.act === 'link' ? ' primary' : '');
      b.textContent = o.t; b.addEventListener('click', () => choose(o)); optsEl.append(b);
    });
  }
  async function run(nodeId, opts = {}) {
    const node = N[nodeId]; if (!node) return;
    const id = ++runId; optsEl.innerHTML = '';
    if (node.who !== speaker || opts.force) setSpeaker(node.who);
    const lines = typeof node.say === 'function' ? node.say() : node.say;
    if (I3()) I3().say(node.who, lines[0].slice(0, 26), 3500);
    if (!(await speak(lines, node.who, id))) return;
    showOpts(typeof node.opts === 'function' ? node.opts() : node.opts);
  }
  async function gotoResident(who, from) {
    const id = ++runId; optsEl.innerHTML = '';
    const r = R[who];
    if (from && from !== who) {
      if (!(await speak([who === 'guide' ? '好，我請主持人陶子過來！' : '我帶妳去找' + r.name + '，在' + (ZONE_NAME[r.zone] || '校門口') + '那邊 👉'], from, id))) return;
    }
    if (I3()) { I3().focusResident(who); if (r.zone) I3().beacon(r.zone, 6000); I3().wave(who); I3().say(who, '我在這裡！👋', 2500); }
    await wait(I3() ? 1000 : 150); if (id !== runId) return;
    addMsg('— 你來到了' + (ZONE_NAME[r.zone] || '校門口') + ' —', 'note');
    run(r.start, { force: true });
  }
  function choose(o) {
    if (o.act === 'close') { addMsg(o.t, 'me'); closeChat(); return; }
    addMsg(o.t, 'me');
    if (o.to) { run(o.to); return; }
    if (o.act === 'goto') { tourStep = -1; gotoResident(o.who, speaker); return; }
    if (o.act === 'zone') { window.openIslandZone(o.zone); return; }
    if (o.act === 'link') { const a = document.createElement('a'); a.href = o.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; document.body.append(a); a.click(); a.remove(); return; }
    if (o.act === 'tour') { startTour(); return; }
    if (o.act === 'ask') showOpts(Object.keys(R).filter(id => id !== speaker).map(id => go(TOPIC[id], id)).concat([BYE]));
  }

  // ---------- guided tour ----------
  const TOUR = [
    { z: 'lunch', say: ['第一站：午餐小屋 🍱', '小沐在這裡等妳：帶著便當跟老師聊下一步。一組 1～2 人，週一、三、五，前一天 23:59 前預約。'] },
    { z: 'planning', say: ['第二站：未來羅盤 🧭', '小英會陪妳把大問題拆小。每個人各填一份升學規劃表，還沒想清楚也可以填。'] },
    { z: 'routes', say: ['第三站：科系航線 📐', 'Alice學姊會先請妳找證據：喜歡做工具、弄懂原理，還是找規律？'] },
    { z: 'workshop', say: ['第四站：學習工坊 🎧', '嫺靜說：先有一版，才有下一版。帶一件做過的事、一個卡住的地方、一個小行動就好。'] },
    { z: 'resources', say: ['最後一站：資源燈塔 🗂️', '念華學姊的提醒：找來源、看學年度、確認適用條件。'] }
  ];
  async function startTour() { tourStep = 0; await tourAt(0); }
  async function tourAt(i) {
    const id = ++runId; optsEl.innerHTML = '';
    if (speaker !== 'guide') setSpeaker('guide');
    const s = TOUR[i];
    if (I3()) { I3().focusZone(s.z, 1.7); I3().beacon(s.z, 6500); I3().wave(ZONE_OWNER[s.z]); I3().say(ZONE_OWNER[s.z], R[ZONE_OWNER[s.z]].lines[0], 3500); }
    stamp(s.z);
    if (!(await speak(s.say, 'guide', id))) return;
    const owner = ZONE_OWNER[s.z];
    const list = [];
    if (i < TOUR.length - 1) list.push({ t: '下一站 →', act: 'tourNext' });
    else list.push({ t: '逛完了！接下來呢？', act: 'tourEnd' });
    list.push(go('停下來，跟' + R[owner].name + '聊聊', owner), { t: '結束導覽', act: 'close' });
    optsEl.innerHTML = '';
    list.forEach(o => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chat-opt' + (o.act === 'tourNext' ? ' primary' : ''); b.textContent = o.t;
      b.addEventListener('click', () => {
        if (o.act === 'tourNext') { addMsg(o.t, 'me'); tourStep = i + 1; tourAt(i + 1); }
        else if (o.act === 'tourEnd') { addMsg(o.t, 'me'); tourStep = -1; if (I3()) I3().reset(); run('guide.passport'); }
        else choose(o);
      });
      optsEl.append(b);
    });
  }

  // ---------- public entry points ----------
  function talkTo(who) {
    if (!R[who]) return;
    const wasOpen = !panel.hidden;
    openChat();
    if (wasOpen && who === speaker) return;
    if (wasOpen) { gotoResident(who, null); return; }
    log.innerHTML = '';
    if (I3()) { I3().focusResident(who); I3().wave(who); }
    run(R[who].start, { force: true });
  }
  window.IslandResidents = { talkTo, close: closeChat, residents: Object.keys(R).map(id => ({ id, name: R[id].name, emoji: R[id].emoji, color: R[id].color, pos: R[id].pos })), startTour: () => { openChat(); log.innerHTML = ''; setSpeaker('guide'); startTour(); } };
  document.querySelectorAll('[data-chat]').forEach(b => b.addEventListener('click', () => talkTo(b.dataset.chat)));

  // stamp the passport whenever a landmark panel is opened, however it was opened
  const openZone = window.openIslandZone;
  if (typeof openZone === 'function') window.openIslandZone = function (z) { stamp(z); return openZone.apply(this, arguments); };

  // ---------- passport chips ----------
  const pass = document.createElement('div'); pass.className = 'passport'; pass.id = 'islandPassport';
  pass.innerHTML = '<button type="button" class="passport-btn" aria-label="校園護照：查看已拜訪的地點"><span class="passport-label">校園護照</span><span class="passport-stamps"></span><span class="passport-count"></span></button>';
  const intro = document.querySelector('.intro-panel');
  if (intro) intro.appendChild(pass);
  pass.querySelector('button').addEventListener('click', () => { openChat(); log.innerHTML = ''; setSpeaker('guide'); run('guide.passport', { force: true }); });
  function renderPassport(fresh) {
    const box = pass.querySelector('.passport-stamps'); box.innerHTML = '';
    Object.keys(ZONE_NAME).forEach((z, i) => {
      const s = document.createElement('span'); s.className = 'pstamp' + (visited.has(z) ? ' on' : '') + (z === fresh ? ' fresh' : '');
      s.textContent = visited.has(z) ? R[ZONE_OWNER[z]].emoji : String(i + 1); s.title = ZONE_NAME[z] + (visited.has(z) ? '：已拜訪' : '：尚未拜訪'); box.append(s);
    });
    pass.querySelector('.passport-count').textContent = visited.size + '/5';
  }
  renderPassport();

  // ---------- place residents in the 3D world and keep the island chatty ----------
  const AMBIENT = ['我剛跟老師吃完午餐，其實一點都不可怕！', '資工跟電機到底差在哪…', '我要去逸仙樓找念華學姊查簡章', '今天便當有滷蛋 🍳', '工坊的小電好可愛', '週一三五才能約午餐喔', '記得前一天 23:59 前約好！', '升學規劃表我填好了～', '還不確定也沒關係啦', '要不要一起約午餐？', 'ColleGo! 查到好多科系', 'APCS 不是每個人都要考喔', '我想做一個提醒阿嬤吃藥的 App', '小英說表單可以改變想法', '點學姊就可以聊天喔 💬'];
  function populate() {
    const api = I3(); if (!api) return;
    Object.keys(R).forEach(id => api.addResident(Object.assign({ id }, R[id])));
    api.onResident(talkTo);
    let k = 0;
    (function chatter() {
      setTimeout(chatter, 4200);
      if (document.hidden || home.classList.contains('no-motion') || home.classList.contains('reduce-pause')) return;
      if (k % 2 === 0) api.ambient(AMBIENT[Math.floor(Math.random() * AMBIENT.length)]);
      else { const ids = Object.keys(R).filter(id => panel.hidden || id !== speaker); const id = ids[Math.floor(Math.random() * ids.length)]; const l = R[id].lines; api.say(id, l[Math.floor(Math.random() * l.length)], 3600); }
      k++;
    })();
    // after the fly-in, the guide says hello
    setTimeout(() => { if (panel.hidden) { api.wave('guide'); api.say('guide', '嗨！我是陶子，第一次來嗎？點我聊聊 👋', 5000); } }, reduced ? 300 : 2700);
  }
  populate();
})();
