// モッポHub の全定数。しきい値・座標・色・時間はここ以外に書かない。
// 「なぜその数値か」はコメントで残す(仕様書 §13)。

// ---- ジェスチャー判定しきい値 ----
export const TAP_MAX_MOVE_PX = 8 // これ未満の移動なら「タップ」。指ブレの許容量
export const TAP_MAX_MS = 250 // 押下がこれ未満ならタップ扱い
export const LONG_PRESS_MS = 520 // 長押し = よるモード。誤爆しない程度に短く
export const SHAKE_REVERSALS = 3 // 掴んだまま左右反転がこの回数以上でくしゃみ
export const SHAKE_WINDOW_MS = 600 // 反転回数を数えるローリング時間窓
export const SHAKE_MIN_SPEED = 0.35 // px/ms。ゆっくり往復しただけでは発火させない

// ---- ドロップゾーン ----
// つかんだ瞬間、画面の左右端(モッポと同じ高さ)に出る。ゾーンにモッポを重ねると
// 各アイコンが斜め配置で展開し、つかんだままアイコンの上で離すと画面遷移。離せば全部消える
export const ZONE_RADIUS = 22 // 円の見た目の半径(px)。大きすぎたので半分に
export const ZONE_HIT = 36 // 判定半径。見た目より広くして指が太くても掴めるように
export const ZONE_EDGE_X = 40 // 画面端からゾーン中心までの距離(左右に寄せる)
export const ZONE_EDGE_MARGIN = 48 // アイコンが画面外に出ないための余白
// 展開アイコンの配置(参考画像準拠: 左上→中央へ斜めに散らす)。xFrac は画面幅比率(右側は左右反転)、
// dy はゾーン中心からの縦オフセット
export const ICON_LAYOUT = [
  { xFrac: 0.2, dy: -230 },
  { xFrac: 0.44, dy: -180 },
  { xFrac: 0.48, dy: -68 },
]
// 展開中に出す方向ラベルの白ピル位置(参考画像のきろくピル)
export const PILL_LAYOUT = { xFrac: 0.19, dy: -120 }
export const ICON_HIT = 46 // アイコンの当たり判定半径。コイン(直径60)より少し広め

// ---- ゼリー質感(GSAP) ----
// 参考: codepen の soft-body / jelly デモ群。伸び→潰れ→減衰揺れをワンセットで見せる
export const JELLY = {
  followDuration: 0.5, // 指への追従の遅れ。大きいほど「もちっ」と重い
  followEase: 'power3.out',
  returnEase: 'elastic.out(1, 0.3)', // 定位置復帰。振幅低めで長くぷるぷる揺れる
  returnDuration: 1.25,
  squashMax: 0.3, // 速度連動の潰れ量の上限。これ以上潰すと不気味
  popEase: 'elastic.out(1, 0.45)', // コイン・カード出現のぷるん
  popDuration: 0.7,
  popStagger: 0.06,
}

// ---- 眠りに落ちる演出(長押し中の段階時間、単位: 秒) ----
// 長押し判定(LONG_PRESS_MS)成立後もつかみ続けると少しずつ変化していく
export const SLEEP_STAGES = {
  blink: 0, // まばたき
  sleepy: 0.7, // 目が半分閉じる
  breathe: 1.4, // 体が上下(呼吸)
  nod: 2.6, // 頭コクッ
  asleep: 3.6, // Zzz... 完全に眠る(よるモードへ)
}

// ---- 色(ワイヤーフレーム準拠) ----
export const COLORS = {
  bg: '#efece6',
  ink: '#4a4335',
  pillBg: '#fffdf8',
  record: '#2f6390', // きろく(青)
  recordCoin: '#6fa0dd',
  play: '#a06a34', // あそぶ(橙)
  playCoin: '#dd9a5c',
  nightBg: '#2b303a',
  nightGlow: '#e0b84a',
}

// ---- 地図 ----
export const MAP_CENTER = { lat: 35.1595, lng: 136.9066 } // 名古屋・大須周辺
export const MAP_ZOOM = 15

// 昼: 低彩度ベージュ / 夜: 暗色。Google Maps styles 形式
export const MAP_STYLE_DAY = [
  { elementType: 'geometry', stylers: [{ color: '#e6e2d9' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8272' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#efece6' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#d5cfc2' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bcd8d2' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#e6e2d9' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#cfe0c2' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]
export const MAP_STYLE_NIGHT = [
  { elementType: 'geometry', stylers: [{ color: '#2b303a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6f7686' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1e222a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#434a56' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#37505a' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#37473d' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

// 昼のスポットピン(1a)。frac はフォールバック地図用の画面比率座標
export const DAY_PINS = [
  { id: 'wakka', label: 'カフェ wakka', priority: '#cf6a4d', lat: 35.1642, lng: 136.9021, xFrac: 0.52, yFrac: 0.3 },
  { id: 'nouka', label: '喫茶のうか', priority: '#d6a23c', lat: 35.1613, lng: 136.9105, xFrac: 0.62, yFrac: 0.38 },
  { id: 'oto', label: '焙煎所 音', priority: '#7b73b0', lat: 35.1571, lng: 136.9034, xFrac: 0.42, yFrac: 0.47 },
]
export const CURRENT_LOCATION = { lat: 35.1598, lng: 136.9082, xFrac: 0.7, yFrac: 0.44 }

// 優先度凡例(1a)
export const PRIORITY_LEGEND = [
  { label: '絶対', color: '#cf6a4d' },
  { label: '出来れば', color: '#d6a23c' },
  { label: '時間あれば', color: '#4e9e6a' },
  { label: '行った', color: '#bcb6cf' },
]

// よるモード: モッポが見つけた店(光るピン)。それ以外は暗いまま
export const NIGHT_PINS = [
  { id: 'nightcafe', label: '夜カフェ', icon: '🍵', lat: 35.1638, lng: 136.9018, xFrac: 0.26, yFrac: 0.24 },
  { id: 'tachinomi', label: '立ち飲み', icon: '🍶', lat: 35.158, lng: 136.911, xFrac: 0.78, yFrac: 0.52 },
  { id: 'yakei', label: '夜景', icon: '🌃', lat: 35.1565, lng: 136.9028, xFrac: 0.24, yFrac: 0.45 },
]

// ---- 遷移先スクリーン(11種) ----
export const SCREENS = {
  route: { icon: '🧭', label: '開拓' },
  bingo: { icon: '🎯', label: 'ビンゴ' },
  fest: { icon: '🧁', label: '祭り' },
  yearmap: { icon: '🗾', label: '年の地図' },
  zine: { icon: '📖', label: '栞(zine)' },
  settings: { icon: '⚙️', label: 'せってい' },
  wish: { icon: '✉️', label: 'モッポの願い' },
  omakase: { icon: '🎲', label: 'おまかせ' },
  know: { icon: '👂', label: '知りたい' },
  meeting: { icon: '📱', label: 'モッポ会議' },
  place: { icon: '📍', label: '場所' },
}

// タップ=はなす(対話)の4項目。一覧や設定を混ぜない(中央=対話の意味を守る)
export const TALK_ITEMS = ['omakase', 'know', 'meeting', 'wish']
// 左ドラッグ=きろくの3項目
export const RECORD_ITEMS = ['zine', 'yearmap', 'settings']
// 右ドラッグ=あそぶの3項目
export const PLAY_ITEMS = ['bingo', 'fest', 'route']

// ---- ★お気に入り ----
export const FAVORITES_STORAGE_KEY = 'moppo-hub-favs'
// 初期状態: 2つ埋め+1つ空き(空きがあることが「登録できる」という説明になる)
export const DEFAULT_FAVORITES = [
  { icon: '🌳', label: '公園', screen: 'place' },
  { icon: '🍵', label: '大須', screen: 'place' },
  null,
]

// ---- くしゃみ提案の候補(モック) ----
export const SNEEZE_CANDIDATES = [
  {
    name: '円頓寺商店街',
    walkMin: 8,
    rating: 4.2,
    tags: 'レトロ／喫茶',
    reason: 'さいきん「レトロな喫茶」ばかり ★ してるから、はなが むずむずした！',
    description: '昭和の面影が残る名古屋最古級の商店街。古い喫茶店と新しい雑貨屋が混ざっていて、ぶらぶら歩くだけで楽しい。',
    photos: ['🏮', '☕', '🍘'],
  },
  {
    name: '鶴舞公園',
    walkMin: 14,
    rating: 4.5,
    tags: '公園／さんぽ',
    reason: 'きょうは天気がいいのに、まだ いちども そとで座ってないから！',
    description: '噴水と緑がひろがる大きな公園。ベンチでひとやすみしたり、芝生でごろごろするのにちょうどいい。',
    photos: ['⛲', '🌳', '🥪'],
  },
  {
    name: '大須観音 ほとけの市',
    walkMin: 6,
    rating: 4.0,
    tags: '骨董市／おやつ',
    reason: 'きょうは 18日。月に2回しかない骨董市の日だって、モッポは知ってるよ！',
    description: '境内にずらりと並ぶ骨董と古着の市。掘り出し物さがしのあとは、参道の揚げまんじゅうが定番。',
    photos: ['🏯', '🕰️', '🍡'],
  },
]
