/* ---------------------------------------------------------------
 * 元素週期表資料
 * 格式：原子序|符號|中文名|族|週期|分類|原子量|常見價數(逗號分隔)
 * 要修改元素資料，直接改下面這張表即可。
 * -------------------------------------------------------------*/
(function (global) {
  'use strict';

  var RAW = [
    '1|H|氫|1|1|nonmetal|1.008|+1,-1',
    '2|He|氦|18|1|noble|4.003|0',
    '3|Li|鋰|1|2|alkali|6.94|+1',
    '4|Be|鈹|2|2|alkaline|9.012|+2',
    '5|B|硼|13|2|metalloid|10.81|+3',
    '6|C|碳|14|2|nonmetal|12.011|+4,-4,+2',
    '7|N|氮|15|2|nonmetal|14.007|-3,+5,+3,+2',
    '8|O|氧|16|2|nonmetal|15.999|-2',
    '9|F|氟|17|2|halogen|18.998|-1',
    '10|Ne|氖|18|2|noble|20.180|0',
    '11|Na|鈉|1|3|alkali|22.990|+1',
    '12|Mg|鎂|2|3|alkaline|24.305|+2',
    '13|Al|鋁|13|3|post|26.982|+3',
    '14|Si|矽|14|3|metalloid|28.085|+4',
    '15|P|磷|15|3|nonmetal|30.974|-3,+5,+3',
    '16|S|硫|16|3|nonmetal|32.06|-2,+4,+6',
    '17|Cl|氯|17|3|halogen|35.45|-1,+1,+5,+7',
    '18|Ar|氬|18|3|noble|39.95|0',
    '19|K|鉀|1|4|alkali|39.098|+1',
    '20|Ca|鈣|2|4|alkaline|40.078|+2',
    '21|Sc|鈧|3|4|transition|44.956|+3',
    '22|Ti|鈦|4|4|transition|47.867|+4,+3',
    '23|V|釩|5|4|transition|50.942|+5,+4',
    '24|Cr|鉻|6|4|transition|51.996|+3,+6,+2',
    '25|Mn|錳|7|4|transition|54.938|+2,+4,+7',
    '26|Fe|鐵|8|4|transition|55.845|+2,+3',
    '27|Co|鈷|9|4|transition|58.933|+2,+3',
    '28|Ni|鎳|10|4|transition|58.693|+2,+3',
    '29|Cu|銅|11|4|transition|63.546|+1,+2',
    '30|Zn|鋅|12|4|transition|65.38|+2',
    '31|Ga|鎵|13|4|post|69.723|+3',
    '32|Ge|鍺|14|4|metalloid|72.630|+4,+2',
    '33|As|砷|15|4|metalloid|74.922|-3,+3,+5',
    '34|Se|硒|16|4|nonmetal|78.971|-2,+4,+6',
    '35|Br|溴|17|4|halogen|79.904|-1,+5',
    '36|Kr|氪|18|4|noble|83.798|0',
    '37|Rb|銣|1|5|alkali|85.468|+1',
    '38|Sr|鍶|2|5|alkaline|87.62|+2',
    '39|Y|釔|3|5|transition|88.906|+3',
    '40|Zr|鋯|4|5|transition|91.224|+4',
    '41|Nb|鈮|5|5|transition|92.906|+5',
    '42|Mo|鉬|6|5|transition|95.95|+6,+4',
    '43|Tc|鎝|7|5|transition|98|+7',
    '44|Ru|釕|8|5|transition|101.07|+3,+4',
    '45|Rh|銠|9|5|transition|102.906|+3',
    '46|Pd|鈀|10|5|transition|106.42|+2,+4',
    '47|Ag|銀|11|5|transition|107.868|+1',
    '48|Cd|鎘|12|5|transition|112.414|+2',
    '49|In|銦|13|5|post|114.818|+3',
    '50|Sn|錫|14|5|post|118.710|+2,+4',
    '51|Sb|銻|15|5|metalloid|121.760|+3,+5',
    '52|Te|碲|16|5|metalloid|127.60|-2,+4',
    '53|I|碘|17|5|halogen|126.904|-1,+5',
    '54|Xe|氙|18|5|noble|131.293|0',
    '55|Cs|銫|1|6|alkali|132.905|+1',
    '56|Ba|鋇|2|6|alkaline|137.327|+2',
    '57|La|鑭|3|6|lanthanide|138.905|+3',
    '58|Ce|鈰|3|6|lanthanide|140.116|+3,+4',
    '59|Pr|鐠|3|6|lanthanide|140.908|+3',
    '60|Nd|釹|3|6|lanthanide|144.242|+3',
    '61|Pm|鉕|3|6|lanthanide|145|+3',
    '62|Sm|釤|3|6|lanthanide|150.36|+3',
    '63|Eu|銪|3|6|lanthanide|151.964|+3,+2',
    '64|Gd|釓|3|6|lanthanide|157.25|+3',
    '65|Tb|鋱|3|6|lanthanide|158.925|+3',
    '66|Dy|鏑|3|6|lanthanide|162.500|+3',
    '67|Ho|鈥|3|6|lanthanide|164.930|+3',
    '68|Er|鉺|3|6|lanthanide|167.259|+3',
    '69|Tm|銩|3|6|lanthanide|168.934|+3',
    '70|Yb|鐿|3|6|lanthanide|173.045|+3,+2',
    '71|Lu|鎦|3|6|lanthanide|174.967|+3',
    '72|Hf|鉿|4|6|transition|178.486|+4',
    '73|Ta|鉭|5|6|transition|180.948|+5',
    '74|W|鎢|6|6|transition|183.84|+6',
    '75|Re|錸|7|6|transition|186.207|+7,+4',
    '76|Os|鋨|8|6|transition|190.23|+4',
    '77|Ir|銥|9|6|transition|192.217|+3,+4',
    '78|Pt|鉑|10|6|transition|195.084|+2,+4',
    '79|Au|金|11|6|transition|196.967|+1,+3',
    '80|Hg|汞|12|6|transition|200.592|+1,+2',
    '81|Tl|鉈|13|6|post|204.38|+1,+3',
    '82|Pb|鉛|14|6|post|207.2|+2,+4',
    '83|Bi|鉍|15|6|post|208.980|+3,+5',
    '84|Po|釙|16|6|post|209|+4,+2',
    '85|At|砈|17|6|halogen|210|-1',
    '86|Rn|氡|18|6|noble|222|0',
    '87|Fr|鍅|1|7|alkali|223|+1',
    '88|Ra|鐳|2|7|alkaline|226|+2',
    '89|Ac|錒|3|7|actinide|227|+3',
    '90|Th|釷|3|7|actinide|232.038|+4',
    '91|Pa|鏷|3|7|actinide|231.036|+5',
    '92|U|鈾|3|7|actinide|238.029|+6,+4',
    '93|Np|錼|3|7|actinide|237|+5',
    '94|Pu|鈽|3|7|actinide|244|+4',
    '95|Am|鋂|3|7|actinide|243|+3',
    '96|Cm|鋦|3|7|actinide|247|+3',
    '97|Bk|鉳|3|7|actinide|247|+3',
    '98|Cf|鉲|3|7|actinide|251|+3',
    '99|Es|鑀|3|7|actinide|252|+3',
    '100|Fm|鐨|3|7|actinide|257|+3',
    '101|Md|鍆|3|7|actinide|258|+3',
    '102|No|鍩|3|7|actinide|259|+2,+3',
    '103|Lr|鐒|3|7|actinide|266|+3',
    '104|Rf|鑪|4|7|transition|267|+4',
    '105|Db|𨧀|5|7|transition|268|',
    '106|Sg|𨭎|6|7|transition|269|',
    '107|Bh|𨨏|7|7|transition|270|',
    '108|Hs|𨭆|8|7|transition|269|',
    '109|Mt|䥑|9|7|transition|278|',
    '110|Ds|鐽|10|7|transition|281|',
    '111|Rg|錀|11|7|transition|282|',
    '112|Cn|鎶|12|7|transition|285|',
    '113|Nh|鉨|13|7|post|286|',
    '114|Fl|鈇|14|7|post|289|',
    '115|Mc|鏌|15|7|post|290|',
    '116|Lv|鉝|16|7|post|293|',
    '117|Ts|鿬|17|7|halogen|294|',
    '118|Og|鿫|18|7|noble|294|'
  ];

  var CATEGORY = {
    alkali:     { zh: '鹼金屬',    metal: true  },
    alkaline:   { zh: '鹼土金屬',  metal: true  },
    transition: { zh: '過渡金屬',  metal: true  },
    post:       { zh: '其他金屬',  metal: true  },
    metalloid:  { zh: '類金屬',    metal: false },
    nonmetal:   { zh: '非金屬',    metal: false },
    halogen:    { zh: '鹵素',      metal: false },
    noble:      { zh: '惰性氣體',  metal: false },
    lanthanide: { zh: '鑭系元素',  metal: true  },
    actinide:   { zh: '錒系元素',  metal: true  }
  };

  // 電負度（Pauling），供「鍵結極性」參考；沒有值代表資料從缺
  var EN = {
    H: 2.20, Li: 0.98, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98,
    Na: 0.93, Mg: 1.31, Al: 1.61, Si: 1.90, P: 2.19, S: 2.58, Cl: 3.16,
    K: 0.82, Ca: 1.00, Sc: 1.36, Ti: 1.54, V: 1.63, Cr: 1.66, Mn: 1.55,
    Fe: 1.83, Co: 1.88, Ni: 1.91, Cu: 1.90, Zn: 1.65, Ga: 1.81, Ge: 2.01,
    As: 2.18, Se: 2.55, Br: 2.96, Rb: 0.82, Sr: 0.95, Y: 1.22, Zr: 1.33,
    Nb: 1.6, Mo: 2.16, Ag: 1.93, Cd: 1.69, In: 1.78, Sn: 1.96, Sb: 2.05,
    Te: 2.10, I: 2.66, Cs: 0.79, Ba: 0.89, Pt: 2.28, Au: 2.54, Hg: 2.00,
    Tl: 1.62, Pb: 2.33, Bi: 2.02
  };

  var LIST = RAW.map(function (line) {
    var f = line.split('|');
    var ox = f[7] ? f[7].split(',').filter(Boolean) : [];
    var el = {
      z: parseInt(f[0], 10),
      sym: f[1],
      zh: f[2],
      group: parseInt(f[3], 10),
      period: parseInt(f[4], 10),
      cat: f[5],
      catZh: CATEGORY[f[5]].zh,
      metal: CATEGORY[f[5]].metal,
      mass: parseFloat(f[6]),
      ox: ox,
      oxNum: ox.map(Number),
      en: EN[f[1]] != null ? EN[f[1]] : null
    };
    // 週期表格線座標（鑭系、錒系另放兩列）
    if (el.z >= 57 && el.z <= 71) { el.col = el.z - 57 + 3; el.row = 9; }
    else if (el.z >= 89 && el.z <= 103) { el.col = el.z - 89 + 3; el.row = 10; }
    else { el.col = el.group; el.row = el.period; }
    return el;
  });

  var BY_SYM = {};
  var BY_Z = {};
  var BY_ZH = {};
  LIST.forEach(function (el) {
    BY_SYM[el.sym] = el;
    BY_Z[el.z] = el;
    BY_ZH[el.zh] = el;
  });

  global.Elements = {
    list: LIST,
    bySym: function (s) { return BY_SYM[s] || null; },
    byZ: function (z) { return BY_Z[z] || null; },
    byZh: function (n) { return BY_ZH[n] || null; },
    categories: CATEGORY,
    isMetal: function (s) { var e = BY_SYM[s]; return !!e && e.metal; },
    zh: function (s) { var e = BY_SYM[s]; return e ? e.zh : s; }
  };
})(window);
