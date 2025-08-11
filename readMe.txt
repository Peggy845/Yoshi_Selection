index.html
	前端主頁，負責網頁結構與內容。通常用 <head> 載入 CSS、<body> 載入 JS，也可用 <?!= include('...') ?> 導入其他 HTML 檔。
style.css（或 style.html）
	控制網頁的視覺樣式（字體、顏色、佈局）。若寫在 style.html，可使用 Apps Script 的 include 機制整合進 index.html。
script.js（或 script.html）	
	客戶端行為邏輯—包含事件處理、發送 google.script.run 請求等。如果拆成 script.html，同樣用 include() 導入。
Apps Script (Code.gs)	後端邏輯核心。必須有 doGet() 作為 Web App 的入口（回傳 HtmlService.createTemplateFromFile('index') 
	或 createHtmlOutputFromFile），並可定義 include(filename) 函式來讀取 CSS/JS/HTML 內容 。此外處理與 Google Sheets 資料的讀寫。
Google Sheet	
	存放商品資料、價格、庫存等資源，是你的資料庫。Apps Script 可讀寫此試算表，前端可透過 google.script.run 呼叫後端函式取得資料。