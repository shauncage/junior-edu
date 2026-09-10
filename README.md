# 國中數學．自然教學網

**線上版：https://shauncage.github.io/junior-edu/**
（直接給學生這個網址就能用，手機也可以開）

純靜態網頁，**直接用瀏覽器打開 `index.html` 就能用**，不需要安裝任何東西、也不需要架伺服器。

## 目前的單元

| 單元 | 路徑 | 說明 |
|---|---|---|
| 化學式翻譯機 | `subjects/chemistry/formula.html` | 輸入化學式 → 中文名稱、週期表位置、氧化數與價數、鍵結類型、命名推導過程 |
| 一元二次方程式 | `subjects/math/quadratic.html` | 輸入 a、b、c → 解、判別式、頂點、拋物線圖，並排比較台灣課本三種解法與印度式（吠陀數學）四種解法 |

## 目錄結構

```
index.html                       首頁（單元總覽）
subjects/chemistry/formula.html  化學式翻譯機
subjects/math/quadratic.html     一元二次方程式
assets/css/app.css               共用樣式（含深色模式）

化學
assets/js/data/elements.js       ← 118 個元素的資料
assets/js/data/ions.js           ← 多原子根離子（硫酸根、氫氧根…）
assets/js/data/compounds.js      ← 常見化合物字典（約 130 筆）
assets/js/chem/parser.js         化學式解析（括號、下標、結晶水）
assets/js/chem/namer.js          中文命名 + 氧化數推算 + 鍵結判斷
assets/js/ui/periodic.js         週期表元件
assets/js/pages/formula.js       化學式頁面的畫面組裝

數學
assets/js/math/num.js            分數、根式的精確運算與排版（√72 → 6√2、約分）
assets/js/math/quadratic.js      解方程式 + 產生台灣／印度兩套解法說明
assets/js/ui/plot.js             拋物線繪圖（純 SVG，沒有用繪圖套件）
assets/js/pages/quadratic.js     方程式頁面的畫面組裝
```

**要增添內容，改的幾乎都是 `assets/js/data/` 底下那三個檔。**

## 怎麼新增內容

### 新增一個化合物

打開 `assets/js/data/compounds.js`，在 `RAW` 陣列加一列：

```js
['NaClO3', '氯酸鈉', '', '強氧化劑，可作除草劑。'],
//  化學式    中文名   俗名   說明（後兩項可留空字串）
```

字典裡有的化合物會優先採用字典名稱；沒有的則會用規則自動命名，兩者不同時頁面會標示出來。

### 新增一個根離子

打開 `assets/js/data/ions.js`，在 `ANIONS` 加一列：

```js
{ key: 'BO3', zh: '硼酸', charge: -3, join: 'direct', acid: '硼酸' },
```

* `join: 'direct'` → 酸根，直接接金屬名（硫酸 + 鈉 = 硫酸鈉）
* `join: 'hua'` → 中間要加「化」（氫氧 + 化 + 鈉 = 氫氧化鈉）

### 修改元素資料

打開 `assets/js/data/elements.js`，格式是
`原子序|符號|中文名|族|週期|分類|原子量|常見價數`。

### 新增一個單元頁

1. 複製 `subjects/chemistry/formula.html` 當範本（頁首、頁尾、CSS 路徑都已寫好）。
2. 在 `index.html` 的對應科目區塊加一張 `<a class="unit">` 卡片。
3. 若不需要化學相關程式，把底部的 `<script>` 換成自己的。

## 支援的化學式寫法

| 寫法 | 例子 |
|---|---|
| 一般 | `H2SO4`、`NaCl` |
| 括號 | `Ca(OH)2`、`Fe2(SO4)3`、`(NH4)2SO4` |
| 結晶水 | `CuSO4·5H2O`（`·` 也可以打成 `.`、`*`、`x`） |
| 下標數字 | `K₂Cr₂O₇` |
| 單一元素 | `Fe`、`O2` |

網址可以帶查詢參數直接開結果，方便做成講義連結：
`subjects/chemistry/formula.html?q=Fe2(SO4)3`

## 一元二次方程式單元

三個格子填 a、b、c，可以填整數（`-3`）、小數（`0.5`）或分數（`1/2`）；b、c 留白當作 0。
係數是分數時會自動乘上分母的最小公倍數化成整數，頁面上會標示「原式 → 整理後」。

網址一樣可以帶參數：`subjects/math/quadratic.html?a=1&b=-5&c=6`

### 台灣課本的三種解法

公式解、配方法、十字相乘法，每一步都寫出來。十字相乘只有在判別式是完全平方數時才出現，
不然會標示「這一題整數範圍內湊不出來」。

### 印度式（吠陀數學）的四種解法

| 招式 | 什麼時候好用 |
|---|---|
| 觀察法 Vilokanam | `a+b+c=0` → 一根是 1；`a−b+c=0` → 一根是 −1。看到就秒解 |
| 分裂中項法 | 把 b 拆成兩個數（相乘 = ac、相加 = b）再分組提公因式 — 印度課本的標準因式分解寫法 |
| 和差法 | 兩根之和 = −b/a、兩根之差 = √D/\|a\|，取平均得到兩根。驗算特別快 |
| 微分式法 Calana-kalana | 一次微分 `2ax+b = ±√D`，少寫一層分數 |

**這裡的定位要說清楚**：台灣講的「印度式數學」多半指 1965 年出版的《Vedic Mathematics》
整理的 16 條口訣，走的是心算捷徑路線；印度學校正式課本（NCERT）其實一樣教公式解與配方法。
所以頁面比的是「口訣捷徑 vs 台灣課本流程」，不是「印度課本 vs 台灣課本」，
頁面上也有一段話明講這件事，避免學生誤會。

要改比較表的內容，找 `assets/js/pages/quadratic.js` 裡的 `compareCard()`。
要新增或修改解法說明，找 `assets/js/math/quadratic.js` 裡的 `twMethods()` 與 `inMethods()`。

## 命名規則涵蓋範圍

* **離子化合物**：陰離子 → 陽離子倒著念；變價金屬低價加「亞」（FeCl₂ 氯化亞鐵 / FeCl₃ 氯化鐵）
* **共價化合物**：把原子個數念出來（N₂O₅ 五氧化二氮）
* **酸**：含氧酸直接叫酸名（H₂SO₄ 硫酸）；不含氧的叫「X 化氫」
* **結晶水合物**：CuSO₄·5H₂O 五水合硫酸銅
* **單質**：氧化數 0

## 已知限制

* 有機化合物（葡萄糖、乙醇等）沒有系統性命名規則，靠字典收錄。
* 同一元素在化合物中有多種價態時（如 Fe₃O₄），表格顯示的是平均氧化數，頁面會另外提示。
* 過氧化物的氧為 −1 而非 −2，程式能算對（H₂O₂），但推導說明中會另外註明這是通則的例外。
* 一元二次方程式只處理實數解；判別式為負時只說明「沒有實數解」，不談複數（高中範圍）。
* 十字相乘與分裂中項只在整數範圍內找，找不到就標示用不了，不會硬湊分數。
