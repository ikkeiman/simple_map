// 開拓(霧はらし)の実行時状態を持つ composable。定数は持たず hubConfig を参照し、
// お気に入りと同じく localStorage に永続化する。ここは「状態と算出」だけを担い、
// 見た目(靄の描画)や当たり判定は持たない(描画は FogLayer、判定は MoppoHub)。
import { computed, reactive, ref } from 'vue'
import {
  FOG_GRID,
  FOG_MESH,
  FOG_ORIGIN,
  EXPLORE_CELLS,
  EXPLORE_STORAGE_KEY,
  EXPLORE_ONCE_PER_DAY,
  EXPLORE_AREA_POOL,
  EXPLORE_FOUND_MIN,
  EXPLORE_FOUND_MAX,
  EXPLORE_PIN_TINTS,
  EXPLORE_PIN_OFFSETS,
} from '../constants/hubConfig'

// `r{row}c{col}` → { row, col }
export const parseCell = (id) => {
  const m = /^r(\d+)c(\d+)$/.exec(id)
  return m ? { row: Number(m[1]), col: Number(m[2]) } : { row: 0, col: 0 }
}
// セル中心の画面比率座標(フォールバック地図用)
export const cellCenterFrac = (id) => {
  const { row, col } = parseCell(id)
  return { x: (col + 0.5) / FOG_GRID.cols, y: (row + 0.5) / FOG_GRID.rows }
}
// セルの緯度経度バウンズ(北西原点から。row 南下 / col 東進)
export const cellBounds = (id) => {
  const { row, col } = parseCell(id)
  const north = FOG_ORIGIN.lat - row * FOG_MESH.dLat
  const west = FOG_ORIGIN.lng + col * FOG_MESH.dLng
  return { north, south: north - FOG_MESH.dLat, west, east: west + FOG_MESH.dLng }
}
// セル中心の緯度経度
export const cellCenterLatLng = (id) => {
  const b = cellBounds(id)
  return { lat: (b.north + b.south) / 2, lng: (b.west + b.east) / 2 }
}
// 全セル id を列挙(row-major)
export const allCellIds = () => {
  const ids = []
  for (let r = 0; r < FOG_GRID.rows; r++) for (let c = 0; c < FOG_GRID.cols; c++) ids.push(`r${r}c${c}`)
  return ids
}

const configById = Object.fromEntries(EXPLORE_CELLS.map((c) => [c.id, c]))
const occupiedIds = new Set(EXPLORE_CELLS.filter((c) => c.occupied).map((c) => c.id))
const suggestedCellId = EXPLORE_CELLS.find((c) => c.suggested)?.id ?? null

const hashId = (id) => id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)

// セル中心からの緯度経度オフセット → 絶対 lat/lng ＋ フォールバック用 xFrac/yFrac の両方を確定する。
// (Google 地図は lat/lng、フォールバック地図は xFrac/yFrac を使う二重座標)
const placePin = (id, off, meta) => {
  const c = cellCenterLatLng(id)
  const f = cellCenterFrac(id)
  return {
    ...meta,
    lat: c.lat + (off.dLat ?? 0),
    lng: c.lng + (off.dLng ?? 0),
    // 緯度経度オフセットを画面比率オフセットに換算(北=上=y減、東=右=x増)
    xFrac: f.x + (off.dLng ?? 0) / FOG_MESH.dLng / FOG_GRID.cols,
    yFrac: f.y - (off.dLat ?? 0) / FOG_MESH.dLat / FOG_GRID.rows,
  }
}

// あるセルを開拓した時に見つかるもの(エリア名・件数・表示ピン)を組み立てる。
// config に found があればそれを使い、無ければプールから自動生成する。座標はここで確定・永続化。
const buildDiscovery = (id) => {
  const cfg = configById[id]
  if (cfg?.found?.length) {
    return {
      area: cfg.area ?? EXPLORE_AREA_POOL[hashId(id) % EXPLORE_AREA_POOL.length],
      count: cfg.count ?? cfg.found.length,
      found: cfg.found.map((p) =>
        placePin(id, p, { id: p.id, label: p.label, category: p.category, priority: p.priority }),
      ),
    }
  }
  const area = EXPLORE_AREA_POOL[hashId(id) % EXPLORE_AREA_POOL.length]
  const span = EXPLORE_FOUND_MAX - EXPLORE_FOUND_MIN + 1
  const count = EXPLORE_FOUND_MIN + Math.floor(Math.random() * span)
  const found = EXPLORE_PIN_OFFSETS.map((off, i) =>
    placePin(id, off, {
      id: `${id}-p${i}`,
      label: `${area}の スポット`,
      category: 'cafe',
      priority: EXPLORE_PIN_TINTS[i % EXPLORE_PIN_TINTS.length],
    }),
  )
  return { area, count, found }
}

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

const loadSaved = () => {
  try {
    const raw = localStorage.getItem(EXPLORE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function useExploration() {
  // id → discovery(開拓済み。初期開拓セルは discovery=null で「晴れているだけ」)
  const exploredMap = reactive({})
  const lastExploreDay = ref(null)

  // 初期開拓セル(席・現在地まわり)は常に晴れている
  for (const c of EXPLORE_CELLS) if (c.explored) exploredMap[c.id] = null

  // 保存済み(ユーザーが開拓したセル)を復元
  const saved = loadSaved()
  if (saved) {
    lastExploreDay.value = saved.day ?? null
    for (const e of saved.cells ?? []) exploredMap[e.id] = e.discovery ?? null
  }

  const persist = () => {
    const cells = Object.entries(exploredMap)
      .filter(([, disc]) => disc) // discovery を持つ(=ユーザー開拓した)セルだけ保存
      .map(([id, discovery]) => ({ id, discovery }))
    try {
      localStorage.setItem(EXPLORE_STORAGE_KEY, JSON.stringify({ day: lastExploreDay.value, cells }))
    } catch {
      /* localStorage 不可でも動作は続ける(永続だけ諦める) */
    }
  }

  const justRevealed = ref(null) // ⑩演出の対象セル id(晴れた瞬間だけセット)

  const cellState = (id) => {
    if (occupiedIds.has(id)) return 'occupied'
    if (id in exploredMap) return 'explored'
    return 'fog'
  }

  // 描画用の全セル情報(FogLayer に渡す)
  const cells = computed(() =>
    allCellIds().map((id) => {
      const { row, col } = parseCell(id)
      return { id, row, col, state: cellState(id), suggested: id === suggestedCellId }
    }),
  )

  // 開拓済みで discovery を持つセルの表示ピンを平坦化。justRevealed のものはフラグ付き
  const discoveredPins = computed(() =>
    Object.entries(exploredMap)
      .filter(([, disc]) => disc?.found?.length)
      .flatMap(([id, disc]) =>
        disc.found.map((p) => ({ ...p, cellId: id, justRevealed: id === justRevealed.value })),
      ),
  )

  const canExplore = () => {
    if (!EXPLORE_ONCE_PER_DAY) return true
    return lastExploreDay.value !== todayKey()
  }

  // 開拓確定: 霧を晴らし、discovery を確定・保存。justRevealed をセット(⑩演出のトリガ)
  const markExplored = (id) => {
    if (cellState(id) !== 'fog') return null
    const discovery = buildDiscovery(id)
    exploredMap[id] = discovery
    justRevealed.value = id
    if (EXPLORE_ONCE_PER_DAY) lastExploreDay.value = todayKey()
    persist()
    return discovery
  }

  // ⑩演出が終わったら justRevealed を解除(再演出できるように)
  const clearReveal = () => {
    justRevealed.value = null
  }

  return {
    cells,
    discoveredPins,
    justRevealed,
    suggestedCellId,
    cellState,
    canExplore,
    markExplored,
    clearReveal,
  }
}
