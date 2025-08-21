首頁一定得叫做index.html，否則會找不到 (github默認就是找index.html)



index.html
	前端主頁，負責網頁結構與內容。通常用 <head> 載入 CSS、<body> 載入 JS，也可用 <?!= include('...') ?> 導入其他 HTML 檔。
	首頁一定得叫做index.html，否則會找不到 (github默認就是找index.html)
home.css
	控制網頁的視覺樣式（字體、顏色、佈局）
home.js	
	客戶端行為邏輯—包含事件處理、發送 google.script.run 請求等。
Apps Script (Code.gs)	後端邏輯核心。必須有 doGet() 作為 Web App 的入口（回傳 HtmlService.createTemplateFromFile('index') 
	或 createHtmlOutputFromFile），並可定義 include(filename) 函式來讀取 CSS/JS/HTML 內容 。此外處理與 Google Sheets 資料的讀寫。
Google Sheet	
	存放商品資料、價格、庫存等資源，是你的資料庫。Apps Script 可讀寫此試算表，前端可透過 google.script.run 呼叫後端函式取得資料。