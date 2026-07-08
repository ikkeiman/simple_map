// simple_map プロトタイプ用モックデータ
// priority: 'absolute'(◎絶対行きたい) / 'maybe'(○出来れば) / 'sometime'(△時間があったら) / 'visited'(実際に行った) / null(未ピン)

const PRIORITY_META = {
  absolute: { label: '絶対行きたい', short: '◎ 絶対', color: '#F1665A', bg: '#FCE7E5' },
  maybe:    { label: '出来れば',     short: '○ 出来れば', color: '#F0A93A', bg: '#FBEED9' },
  sometime: { label: '時間があったら', short: '△ 時間あれば', color: '#4CAF7D', bg: '#E1F1E7' },
  visited:  { label: '実際に行った',   short: '実際に行った', color: '#9AA1AC', bg: '#EDEEF0' },
};

const CATEGORY_META = {
  cafe:     { label: '飲食店', icon: '☕' },
  leisure:  { label: 'レジャー', icon: '🌿' },
  shopping: { label: 'ショッピング', icon: '🛍' },
  hotel:    { label: 'ホテル', icon: '♨' },
};

const SPOTS = [
  {
    id: 'wakka', name: 'カフェ wakka', category: 'cafe', priority: 'absolute',
    top: 34, left: 52, rating: 4.5, price: '¥800〜', hours: '9:00–19:00（水曜定休）',
    address: '山形市郊鶴岡下鶴島町1-2-3', avgStay: 32, myStay: 30,
    desc: '築100年の町家を改装した自家焙煎コーヒー店。天井の高い開放的な空間で、名物のクリームあんみつと深煎りブレンドが楽しめます。',
    tags: [], memo: '前から気になってた焙煎豆のお店', photo: '☕',
  },
  {
    id: 'kissa-uka', name: '喫茶のうか', category: 'cafe', priority: 'visited',
    top: 30, left: 45, rating: 4.2, price: '¥600〜', hours: '10:00–18:00',
    address: '中央区寿町2-4', avgStay: 40, myStay: 40,
    desc: '昭和レトロな純喫茶。窓辺の席から商店街を眺めながらゆったり過ごせます。',
    tags: [], memo: '', photo: '🍮',
  },
  {
    id: 'bakery-mugi', name: 'ベーカリー麦', category: 'cafe', priority: null,
    top: 40, left: 60, rating: 4.3, price: '¥300〜', hours: '7:00–15:00（月曜定休）',
    address: '中央区寿町1-1', avgStay: 20, myStay: 20,
    desc: '国産小麦にこだわったベーカリー。朝は行列ができる人気のクロワッサンが名物です。',
    tags: [], memo: '', photo: '🥐',
  },
  {
    id: 'chaya-hinata', name: '茶屋ひなた', category: 'cafe', priority: 'maybe',
    top: 55, left: 40, rating: 4.1, price: '¥500〜', hours: '10:00–17:00',
    address: 'みなと区ひなた町3-2', avgStay: 40, myStay: 45,
    desc: '縁側でお団子とお茶をいただける、昔ながらの茶屋。庭園を眺めながらひと休みできます。',
    tags: [], memo: '', photo: '🍡',
  },
  {
    id: 'kaihin-park', name: '海浜公園', category: 'leisure', priority: 'maybe',
    top: 62, left: 62, rating: 4.4, price: '入場無料', hours: '常時開放',
    address: 'みなと区海浜町', avgStay: 55, myStay: 60,
    desc: '地元で愛される海沿いの公園。夕暮れの防波堤はアニメ「潮風のマーレ」名シーンの舞台で、聖地巡礼スポットとしても人気です。',
    tags: ['アニメ聖地', '夕景スポット'], memo: '夕方の防波堤の写真を撮りたい', photo: '🌊',
  },
  {
    id: 'minato-shop', name: 'みなと商店', category: 'shopping', priority: 'sometime',
    top: 48, left: 28, rating: 4.0, price: '', hours: '9:00–18:00',
    address: 'みなと区本町4-5', avgStay: 35, myStay: 40,
    desc: '地元の海産物や雑貨を扱う商店。お土産探しにぴったりの品揃えです。',
    tags: [], memo: '', photo: '🏮',
  },
  {
    id: 'tenbou-terrace', name: '展望テラス', category: 'leisure', priority: 'sometime',
    top: 20, left: 70, rating: 4.4, price: '¥500', hours: '10:00–20:00',
    address: 'みなと区丘の上1-1', avgStay: 25, myStay: 30,
    desc: '街と海を一望できる展望テラス。夕方は特に混み合います。',
    tags: ['夕景スポット'], memo: '', photo: '🏙',
  },
  {
    id: 'yuya-inaba', name: '湯屋いなば', category: 'hotel', priority: 'sometime',
    top: 72, left: 30, rating: 4.6, price: '¥1,200〜', hours: '10:00–23:00',
    address: 'みなと区湯の町2-2', avgStay: 90, myStay: 90,
    desc: '地元では名の知れた日帰り温泉施設。露天風呂からの眺めが自慢です。',
    tags: [], memo: '', photo: '♨',
  },
];

// リルートの設定（1h）で使う「あなたのスタイル」選択肢
const TRAVEL_STYLES = [
  { key: 'yokubari', icon: '⚡', title: 'よくばり派', desc: 'とにかくいっぱい回りたい！', grad: ['#D5E0EF', '#BCCEE6'], stroke: '#5B7BA6' },
  { key: 'mattari', icon: '🍃', title: 'まったり派', desc: 'のんびり味わって満喫', grad: ['#D6E7E1', '#BEDBD1'], stroke: '#4E938A' },
  { key: 'kimagure', icon: '✨', title: 'きまぐれ派', desc: '寄り道だいすき！', grad: ['#F6E6C8', '#EED9AC'], stroke: '#C79A45' },
  { key: 'teiban', icon: '⭐', title: 'ど定番派', desc: 'ハズレなしで安心', grad: ['#DCE9DE', '#C4DCC9'], stroke: '#5C8B72' },
  { key: 'rakuraku', icon: '☺', title: 'らくらく派', desc: '疲れず無理なく', grad: ['#F6DEDA', '#EFC7C0'], stroke: '#C87C6C' },
];

// 並び替えの優先順位（初期値・重みは表示用の目安）
const DEFAULT_PRIORITY_ORDER = [
  { key: 'want',    label: '行きたい度を優先',       weight: 92 },
  { key: 'distance', label: '移動距離・時間の少なさ', weight: 78 },
  { key: 'crowd',   label: '混雑・待ち時間の回避',   weight: 60 },
  { key: 'review',  label: '口コミ評価の高さ',       weight: 44 },
];

// 今日のルート（出発前設定〜案内で使う既定の並び）
const DEFAULT_ROUTE_IDS = ['wakka', 'kaihin-park', 'chaya-hinata', 'minato-shop', 'tenbou-terrace'];
const EXCLUDED_ROUTE_ID = 'yuya-inaba'; // 時間の都合で外れるピン
