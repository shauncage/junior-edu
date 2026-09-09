# 國中數學．自然教學網

純靜態網頁，**直接用瀏覽器打開 `index.html` 就能用**，不需要安裝任何東西、也不需要架伺服器。

## 目前的單元

| 單元 | 路徑 | 說明 |
|---|---|---|
| 化學式翻譯機 | `subjects/chemistry/formula.html` | 輸入化學式 → 中文名稱、週期表位置、氧化數與價數、鍵結類型、命名推導過程 |

## 目錄結構

```
index.html                       首頁（單元總覽）
subjects/chemistry/formula.html  化學式翻譯機
assets/css/app.css               共用樣式（含深色模式）
assets/js/data/elements.js       ← 118 個元素的資料
assets/js/data/ions.js           ← 多原子根離子（硫酸根、氫氧根…）
assets/js/data/compounds.js      ← 常見化合物字典（約 130 筆）
assets/js/chem/parser.js         化學式解析（括號、下標、結晶水）
assets/js/chem/namer.js          中文命名 + 氧化數推算 + 鍵結判斷
assets/js/ui/periodic.js         週期表元件
assets/js/pages/formula.js       化學式頁面的畫面組裝
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
