/* © 2026 CSGHS YuHsuan Hsiao. All rights reserved. 保留所有權利，未經作者書面同意不得重製、改作或散布。詳見 LICENSE。 */
/* Independent static island. No GAS SDK, backend requests or student data here. */
(function () {
  'use strict';
  const el = id => document.getElementById(id);
  const home = el('islandHome');
  const config = window.ISLAND_CONFIG || {};
  const links = window.IslandLinks;
  // The preview builder injects this flag only into preview/island-demo.html.
  const preview = window.__ISLAND_PREVIEW__ === true;
  const bookingUrl = preview ? './booking-demo.html' : links.booking(config.GAS_URL);
  const formUrl = preview ? '' : links.form(config.FORM_URL);
  let lastFocus = null;
  const dialog = el('infoDialog');

  function openDialog(html) {
    el('infoBody').innerHTML = html; // Only fixed, developer-authored markup is passed.
    if (!dialog.open) {
      lastFocus = document.activeElement;
      dialog.showModal();
    }
    // Reopening a long resource list starts at its heading, not its former scroll offset.
    dialog.scrollTop = 0;
    home.classList.add('reduce-pause');
  }
  function closeDialog() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', () => {
    home.classList.remove('reduce-pause');
    if (lastFocus && lastFocus.isConnected && typeof lastFocus.focus === 'function') lastFocus.focus();
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog();
  });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', closeDialog));

  const head = (num, title, lead) => `<div class="dialog-eyebrow">${num} · YOUR NEXT STEP</div><h2 id="infoTitle">${title}</h2><p class="lead">${lead}</p>`;
  const card = (title, body) => `<div class="panel-card"><strong>${title}</strong><p>${body}</p></div>`;
  const link = (url, title, body) => `<div class="panel-card"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a><p>${body}</p></div>`;
  function externalAction(parent, url, text, target) {
    const a = document.createElement('a');
    a.className = 'panel-action'; a.href = url; a.textContent = text;
    a.target = target; a.rel = 'noopener noreferrer'; parent.append(a);
    return a;
  }
  function inFrame() { try { return window.self !== window.top; } catch (_) { return true; } }
  function enterBooking() {
    if (!bookingUrl) {
      openDialog(head('01', '午餐小屋，準備開門中。', '老師尚未設定可用的預約網址，現在不會建立任何預約。') +
        card('開放後怎麼預約？', '前往獨立的午餐預約頁，輸入自己的座號與認證碼。一位同學即可代表 1～2 人選時間。') +
        card('什麼時候可以聊？', '只開放週一、三、五；國定假日、補假與校內停約日不開放，最晚於前一天 23:59 完成。') +
        '<div class="panel-note">預約入口開放後，最新空檔會在 GAS 預約頁登入後顯示。本網站不顯示或保存學生預約資料。</div>');
      return;
    }
    const a = document.createElement('a');
    a.href = bookingUrl;
    a.target = (config.BOOKING_TARGET === '_blank' || inFrame()) ? '_blank' : '_self';
    a.rel = 'noopener noreferrer';
    document.body.append(a); a.click(); a.remove();
  }
  function planning() {
    openDialog(head('02', '先說說你現在的想法。', '有明確方向、正在比較，或還不確定，都可以。這份表單只是讓老師先認識你想聊的事情。') +
      card('每位同學各填一份', '午餐預約可以由一個人代表，升學規劃請各自填寫，不代替同伴作答。') +
      card('方向、準備，還有你想問的事', '目前感興趣的領域、升學管道、學習狀態，以及想請老師一起思考的問題。這不是正式志願選填。') +
      card('有些內容想個別談，也可以說', '可以選 1 人組，或在表單註記「想當面談」。不必在同伴面前分享所有想法。') +
      '<div id="planningLinkArea"></div><p class="privacy-foot">這個主站不讀取表單回答，也不追蹤誰已填完。公開填答連結不代表回覆公開；表單填答與回覆權限由老師另外設定。</p>');
    if (formUrl) externalAction(el('planningLinkArea'), formUrl, '填寫我的升學規劃 ↗', '_blank');
    else {
      const p = document.createElement('p'); p.className = 'panel-note';
      p.textContent = preview ? '離線示範不開啟真實表單，也不送出任何回答。正式版由老師設定填答網址。' : '老師尚未設定可用的表單填答連結，請依老師通知填寫。';
      el('planningLinkArea').append(p);
    }
  }
  const panels = {
    routes: () => head('03', '你想往哪個方向走？', '先不急著選校名。選一個你願意花時間理解的問題，再去看看大學怎麼學。') +
      '<div class="route-grid">' +
      card('寫程式、做工具', '你想做出什麼工具，讓別人的日常更方便？試著找出兩個相關科系，看看它們各自開了哪些課。') +
      card('電路、電子與硬體', '你對「它為什麼會動」或「它裡面怎麼運作」比較好奇嗎？哪些問題會讓你願意繼續研究？') +
      card('資料、AI 與數理', '你想用資料回答什麼問題？願不願意理解方法背後的數學，或測試程式得到的結果？') +
      card('電資以外的可能', '讀電資學群，不代表只能選電資科系。人文、商管、設計或其他興趣，也值得認真談。') + '</div>' +
      '<div class="panel-note">帶來聊聊：挑兩個感興趣的科系，記下一項課程差異、一項吸引你的地方，以及一個還不明白的問題。這不是性向測驗或個人化推薦。</div>' +
      link('https://collego.edu.tw/', '到 ColleGo! 比較學群、學類與學系', '先看學習內容，不只看校名與分數。以網站最新的學系介紹為準。'),
    workshop: () => head('04', '不用準備完美答案。', '帶著一件事、一個問題，就能開始這次談話。') +
      card('一件你願意說的經驗', '一次解題、一個程式、一項課堂作品，或一件讓你發現自己興趣的事。重點是你做了什麼，不是獎狀有幾張。') +
      card('一個目前卡住的地方', '可能是不知道自己喜歡什麼、某科學習卡關，或不知道怎麼比較科系。沒有作品，也可以從目前的困惑開始。') +
      card('一個可以開始的小行動', '例如在接下來兩週比較兩個科系的課程、整理一件作品，或找任課老師問一個問題。') +
      '<div class="panel-note">有些話想單獨談，可以選 1 人組，或在個人的升學規劃表寫「想當面談」。不用在公開網站記錄私人內容。</div>' +
      '<button class="panel-action" id="workshopPlanning">前往升學規劃</button><p class="privacy-foot">這裡只有準備提示，沒有作品上傳、筆記儲存或學習歷程認證功能。</p>',
    resources: () => head('05', '從官方資料，找到下一步。', '先確認入學學年度，再看校系要求。你們通常對應 117 學年度大學入學；資格、採計與時程均以適用年度正式簡章為準。') +
      link('https://collego.edu.tw/', 'ColleGo!', '認識學群、學類與學系，從課程內容比較方向。') +
      link('https://www.cac.edu.tw/', '大學甄選入學委員會', '繁星推薦、申請入學的官方資訊入口。') +
      link('https://www.uac.edu.tw/', '大學考試入學分發委員會', '分發入學簡章、校系分則與相關公告。') +
      link('https://www.ceec.edu.tw/', '大學入學考試中心', '考試資訊、簡章與試題等官方公告。') +
      link('https://www.techadmi.edu.tw/', '技專校院招生策略委員會', '科技大學及相關招生管道資訊。') +
      link('https://apcs.csie.ntnu.edu.tw/', 'APCS 大學程式設計先修檢測', '檢測與準備資訊；不是全班都必須參加的任務。') +
      '<p class="privacy-foot">外部網站另開分頁。本區提供入口，不複製逐年變動的分則，也不保證每個校系都適用相同條件。</p>'
  };
  window.openIslandZone = function (zone) {
    if (zone === 'lunch') { enterBooking(); return; }
    if (zone === 'planning') { planning(); return; }
    if (!Object.prototype.hasOwnProperty.call(panels, zone)) return;
    openDialog(panels[zone]());
    if (zone === 'workshop') el('workshopPlanning').addEventListener('click', planning);
  };
  document.querySelectorAll('button[data-zone]').forEach(button => button.addEventListener('click', () => window.openIslandZone(button.dataset.zone)));
  el('tripAction').addEventListener('click', enterBooking);
  el('myBookingShortcut').addEventListener('click', enterBooking);

  function setMode(list) {
    el('zoneList').hidden = !list; el('mapViewport').hidden = list;
    document.querySelector('.map-controls').hidden = list;
    document.querySelector('.map-legend').hidden = list;
    for (const [id, active] of [['mapModeBtn', !list], ['listModeBtn', list]]) {
      el(id).classList.toggle('active', active); el(id).setAttribute('aria-pressed', String(active));
    }
  }
  el('mapModeBtn').addEventListener('click', () => setMode(false));
  el('listModeBtn').addEventListener('click', () => setMode(true));
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setMotion() {
    home.classList.toggle('no-motion', reduced);
    el('motionBtn').setAttribute('aria-pressed', String(reduced));
    el('motionBtn').textContent = reduced ? '動態已暫停' : '微風動態';
  }
  el('motionBtn').addEventListener('click', () => { reduced = !reduced; setMotion(); }); setMotion();

  if (typeof config.SITE_TITLE === 'string' && config.SITE_TITLE.trim()) document.title = config.SITE_TITLE.trim();
  const mainUrl = links.main(config.MAIN_SITE_URL);
  const mainLink = el('mainSiteLink');
  if (mainLink) { if (mainUrl) mainLink.href = mainUrl; else mainLink.hidden = true; }
  el('tripKicker').textContent = '午餐小屋 · 獨立預約頁';
  el('tripTitle').textContent = '一個時間，聊聊你的下一步。';
  el('tripSubtitle').textContent = '最新空檔與我的預約，請到預約頁登入查看。';
  el('tripAction').textContent = bookingUrl ? '前往午餐預約 ↗' : '查看預約說明 ↗';
  if (preview) { el('islandDemoStamp').hidden = false; document.title = '中山・未來嶼｜離線展示'; }
})();
