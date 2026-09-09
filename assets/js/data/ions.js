/* ---------------------------------------------------------------
 * 多原子離子（根）資料
 * key   : 化學式片段（不含括號與下標）
 * zh    : 中文名稱
 * charge: 電荷數
 * join  : 'direct' → 直接接金屬名（硫酸 + 鈉 = 硫酸鈉）
 *         'hua'    → 中間加「化」（氫氧 + 化 + 鈉 = 氫氧化鈉）
 * acid  : 對應酸的名稱（H 開頭時使用）
 * 新增根離子：直接往 ANIONS 陣列加一列。
 * -------------------------------------------------------------*/
(function (global) {
  'use strict';

  var ANIONS = [
    { key: 'OH',     zh: '氫氧',     charge: -1, join: 'hua',    acid: null },
    { key: 'NO3',    zh: '硝酸',     charge: -1, join: 'direct', acid: '硝酸' },
    { key: 'NO2',    zh: '亞硝酸',   charge: -1, join: 'direct', acid: '亞硝酸' },
    { key: 'SO4',    zh: '硫酸',     charge: -2, join: 'direct', acid: '硫酸' },
    { key: 'SO3',    zh: '亞硫酸',   charge: -2, join: 'direct', acid: '亞硫酸' },
    { key: 'HSO4',   zh: '硫酸氫',   charge: -1, join: 'direct', acid: null },
    { key: 'HSO3',   zh: '亞硫酸氫', charge: -1, join: 'direct', acid: null },
    { key: 'CO3',    zh: '碳酸',     charge: -2, join: 'direct', acid: '碳酸' },
    { key: 'HCO3',   zh: '碳酸氫',   charge: -1, join: 'direct', acid: null },
    { key: 'PO4',    zh: '磷酸',     charge: -3, join: 'direct', acid: '磷酸' },
    { key: 'HPO4',   zh: '磷酸氫',   charge: -2, join: 'direct', acid: null },
    { key: 'H2PO4',  zh: '磷酸二氫', charge: -1, join: 'direct', acid: null },
    { key: 'ClO',    zh: '次氯酸',   charge: -1, join: 'direct', acid: '次氯酸' },
    { key: 'ClO2',   zh: '亞氯酸',   charge: -1, join: 'direct', acid: '亞氯酸' },
    { key: 'ClO3',   zh: '氯酸',     charge: -1, join: 'direct', acid: '氯酸' },
    { key: 'ClO4',   zh: '過氯酸',   charge: -1, join: 'direct', acid: '過氯酸' },
    { key: 'BrO3',   zh: '溴酸',     charge: -1, join: 'direct', acid: '溴酸' },
    { key: 'IO3',    zh: '碘酸',     charge: -1, join: 'direct', acid: '碘酸' },
    { key: 'MnO4',   zh: '過錳酸',   charge: -1, join: 'direct', acid: '過錳酸' },
    { key: 'CrO4',   zh: '鉻酸',     charge: -2, join: 'direct', acid: '鉻酸' },
    { key: 'Cr2O7',  zh: '重鉻酸',   charge: -2, join: 'direct', acid: '重鉻酸' },
    { key: 'S2O3',   zh: '硫代硫酸', charge: -2, join: 'direct', acid: null },
    { key: 'C2O4',   zh: '草酸',     charge: -2, join: 'direct', acid: '草酸' },
    { key: 'SiO3',   zh: '矽酸',     charge: -2, join: 'direct', acid: '矽酸' },
    { key: 'CN',     zh: '氰',       charge: -1, join: 'hua',    acid: '氫氰酸' },
    { key: 'SCN',    zh: '硫氰',     charge: -1, join: 'hua',    acid: null },
    { key: 'O2',     zh: '過氧',     charge: -2, join: 'hua',    acid: null },
    { key: 'CH3COO', zh: '醋酸',     charge: -1, join: 'direct', acid: '醋酸' },
    { key: 'C2H3O2', zh: '醋酸',     charge: -1, join: 'direct', acid: '醋酸' }
  ];

  var CATIONS = [
    { key: 'NH4', zh: '銨', charge: +1 }
  ];

  // 單一非金屬當陰離子時的電荷（用來算金屬氧化數 / 電荷平衡）
  var SIMPLE_ANION_CHARGE = {
    O: -2, S: -2, Se: -2, Te: -2,
    N: -3, P: -3, As: -3,
    C: -4, Si: -4,
    F: -1, Cl: -1, Br: -1, I: -1, At: -1,
    H: -1
  };

  var ANION_MAP = {}, CATION_MAP = {};
  ANIONS.forEach(function (a) { ANION_MAP[a.key] = a; });
  CATIONS.forEach(function (c) { CATION_MAP[c.key] = c; });

  // 依字串長度由長到短排序，比對時才不會被短的先吃掉（如 SO4 vs SO3）
  var ANION_KEYS = ANIONS.map(function (a) { return a.key; })
    .sort(function (a, b) { return b.length - a.length; });

  global.Ions = {
    anions: ANIONS,
    cations: CATIONS,
    anion: function (k) { return ANION_MAP[k] || null; },
    cation: function (k) { return CATION_MAP[k] || null; },
    anionKeys: ANION_KEYS,
    simpleAnionCharge: SIMPLE_ANION_CHARGE
  };
})(window);
