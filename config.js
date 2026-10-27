/**
 * 中山・未來嶼：公開設定（不是密鑰檔）。
 * 只需填好 GAS_URL 和 FORM_URL；其他值可以先保留。
 * 禁止放入學生名單、個人認證碼、試算表分享網址或 Google 表單編輯網址。
 */
window.ISLAND_CONFIG = Object.freeze({
  SITE_TITLE: '中山・未來嶼｜FUTURE ISLAND',
  // 正式 GAS 網頁應用程式網址，結尾必須是 /exec。留白時顯示尚未開放，不會假裝預約成功。
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzANHsM-6963T5JHnCYNMXjgxLvMIMzxYyo-u6R_67j4r7LJwGuxnLCvG1yR4HzmCbr/exec',
  // Google 表單「填答網址」，可使用 https://forms.gle/... 或 .../viewform。
  FORM_URL: 'https://forms.gle/Lt1RgQB7qCEdxDY2A',
  // 保留原本的 Google 協作平台；不更動 www 的 DNS。
  MAIN_SITE_URL: 'https://www.time4edu.com.tw/',
  // _self：在原分頁切換到 GAS；_blank：另開分頁。
  // 若主站被 Google Sites 嵌入，會一律另開分頁，避免把登入頁塞進 iframe。
  BOOKING_TARGET: '_self'
});
