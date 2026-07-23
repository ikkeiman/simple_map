<template>
  <!-- モッポHub 全体のコンテナ = 状態機械。
       レイヤー: 地図 → 靄 → 検索 → ★ → ドロップゾーン → ざぶとん/モッポ → メニュー/モーダル -->
  <div ref="hubEl" class="moppo-hub">
    <MapCanvas
      :night="isNight"
      :visible-categories="visibleCategories"
      :discovered-pins="exploration.discoveredPins.value"
      @map-ready="onMapReady"
    />

    <!-- 靄(霧)レイヤー。セル位置はジオ座標を projection で画面px化した rects で渡す。
         つかんでいる間だけ強調・ガイドを出す(navBase が idle=モッポ直接掴み の時) -->
    <FogLayer
      :cells="exploration.cells.value"
      :rects="cellRects"
      :stage="stage"
      :grabbing="hubState === 'grabbed' && navBase === 'idle'"
      :target-cell="targetFogCell"
      :show-trail="hubState === 'grabbed' && navBase === 'idle'"
      :reveal-cell-id="exploration.justRevealed.value"
    />

    <SearchBar v-if="!isNight" @filter-change="visibleCategories = $event" />

    <FavoriteBar
      v-if="!isNight"
      ref="favBarRef"
      :sunk="hubState === 'grabbed'"
      @open-all="openSheet('browse')"
      @pick-for-slot="openPicker"
      @go="goScreen"
    />

    <DropZones
      v-if="hubState === 'grabbed' && zonePositions"
      :zones="zonePositions"
      :active-zone="activeZone"
      :expanded-side="expandedSide"
      :icons="iconPositions"
      :hovered-icon="hoveredIcon"
      :pill="pillPosition"
    />

    <!-- ⑨ るすのざぶとん。モッポが探索に出ている間、席で待つ。タップ/つかむでナビも起動 -->
    <SeatCushion v-if="moppoAway" @grab="onGrab" @drag="onDrag" @release="onRelease" @tap="onTap" />

    <Moppo
      ref="moppoRef"
      :expression="moppoExpression"
      :night="isNight"
      :ring="hubState === 'idle' && !isNight"
      :style="{ pointerEvents: sneezeModalVisible || moppoAway ? 'none' : '' }"
      @grab="onGrab"
      @drag="onDrag"
      @release="onRelease"
      @tap="onTap"
      @long-press="onLongPress"
      @long-press-end="onLongPressEnd"
      @shake="onShake"
    />

    <div v-if="hubState === 'idle' && !isNight" class="hint-pill">モッポを タップ／つかむ</div>
    <div v-if="hubState === 'grabbed' && navBase === 'idle'" class="hint-pill">{{ EXPLORE_SPEECH.hintGrab }}</div>
    <div v-if="hubState === 'exploring'" class="hint-pill">{{ awayText }}</div>
    <div v-if="isNight && hubState === 'night'" class="hint-pill night">タップで おこす</div>

    <!-- ⑩ 「＋○けん」カウントアップ(演出中) -->
    <div v-if="hubState === 'revealing'" class="found-count">＋{{ countDisplay }}けん</div>
    <!-- ⑩ 静かなトースト -->
    <Transition name="toast">
      <div v-if="toastVisible" class="fog-toast">{{ EXPLORE_SPEECH.fogToast }}</div>
    </Transition>

    <TalkFan v-if="hubState === 'talk'" @select="goScreen" @close="closeMenu" />

    <SneezeModal v-if="sneezeModalVisible" @go="onSneezeGo" @close="closeMenu" />
    <SneezeSplash v-if="splashOrigin" :origin="splashOrigin" @done="splashOrigin = null" />
    <AllScreensSheet v-if="sheetMode" :mode="sheetMode" @select="onSheetSelect" @close="closeSheet" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MapCanvas from './MapCanvas.vue'
import FogLayer from './FogLayer.vue'
import SearchBar from './SearchBar.vue'
import FavoriteBar from './FavoriteBar.vue'
import DropZones from './DropZones.vue'
import SeatCushion from './SeatCushion.vue'
import Moppo from './Moppo.vue'
import TalkFan from './TalkFan.vue'
import SneezeModal from './SneezeModal.vue'
import SneezeSplash from './SneezeSplash.vue'
import AllScreensSheet from './AllScreensSheet.vue'
import gsap from 'gsap'
import { useExploration, cellBounds } from '../../composables/useExploration'
import { useMapProjection } from '../../composables/useMapProjection'
import {
  ZONE_HIT,
  ZONE_EDGE_X,
  ZONE_EDGE_MARGIN,
  ICON_LAYOUT,
  PILL_LAYOUT,
  ICON_HIT,
  SCREENS,
  RECORD_ITEMS,
  PLAY_ITEMS,
  FOG_GRID,
  EXPLORE_DURATION_MS,
  EXPLORE_STORY_MIN,
  EXPLORE_TOAST_MS,
  EXPLORE_SPEECH,
  REVEAL,
} from '../../constants/hubConfig'

const router = useRouter()
const hubEl = ref(null)
const moppoRef = ref(null)
const favBarRef = ref(null)

const exploration = useExploration()
const projection = useMapProjection()
const onMapReady = ({ map, api }) => projection.setup(map, api)

// コンテナ実寸(靄セルのフォールバック配置・点線ガイドの座標系に使う)
const stage = ref({ width: 0, height: 0 })
const measureStage = () => {
  const r = hubEl.value?.getBoundingClientRect()
  if (r) stage.value = { width: r.width, height: r.height }
}
onMounted(() => {
  measureStage()
  window.addEventListener('resize', measureStage)
})

// 各セルの画面px矩形。Google 地図があれば projection でジオ座標→px(パン/ズーム追従)、
// 無ければ(フォールバック地図)コンテナ実寸×比率で配置する。
const cellRects = computed(() => {
  const out = {}
  const cells = exploration.cells.value
  if (projection.ready.value) {
    projection.tick.value // パン/ズームで再計算するため touch
    for (const c of cells) {
      const b = cellBounds(c.id)
      const nw = projection.project(b.north, b.west)
      const se = projection.project(b.south, b.east)
      if (!nw || !se) continue
      out[c.id] = { left: nw.x, top: nw.y, width: se.x - nw.x, height: se.y - nw.y }
    }
  } else {
    const { width: w, height: h } = stage.value
    for (const c of cells) {
      out[c.id] = {
        left: (c.col / FOG_GRID.cols) * w,
        top: (c.row / FOG_GRID.rows) * h,
        width: w / FOG_GRID.cols,
        height: h / FOG_GRID.rows,
      }
    }
  }
  return out
})

// idle | grabbed | talk | drowsy | night | sneeze | exploring | returned | revealing
const hubState = ref('idle')
const navBase = ref('idle') // 席発ナビ(talk/grabbed)を「どこから開いたか」= 閉じたら戻る先
const moppoAway = ref(false) // モッポが探索に出ている間 true(席にざぶとんを出す)
const sneezeModalVisible = ref(false)
const splashOrigin = ref(null)
const visibleCategories = ref([])
const sheetMode = ref(null)
const pendingSlot = ref(null)

// --- ドラッグ中のゾーン/アイコン状態 ---
const zonePositions = ref(null)
const stageSize = ref(null)
const activeZone = ref(null)
const expandedSide = ref(null)
const hoveredIcon = ref(null)
const targetFogCell = ref(null) // いまモッポが重なっている靄セル id(開拓ターゲット)

// --- ⑩ 演出用 ---
const exploreCell = ref(null) // いま開拓中/帰宅待ちのセル
const countDisplay = ref(0)
const toastVisible = ref(false)
let exploreTimer = null

const isNight = computed(() => hubState.value === 'night')
const awayText = computed(() => EXPLORE_SPEECH.away.replace('{min}', EXPLORE_STORY_MIN))

const moppoExpression = computed(() => {
  switch (hubState.value) {
    case 'grabbed':
      return 'grabbed'
    case 'talk':
      return 'talking'
    case 'night':
      return 'asleep'
    case 'sneeze':
      return 'sneeze'
    case 'exploring':
    case 'returned':
    case 'revealing':
      return 'happy' // 探索・帰宅・発見中はごきげん顔
    default:
      return 'idle'
  }
})

// 展開中アイコンの配置
const iconPositions = computed(() => {
  if (!expandedSide.value || !zonePositions.value || !stageSize.value) return []
  const zone = zonePositions.value[expandedSide.value]
  const w = stageSize.value.width
  const ids = expandedSide.value === 'left' ? RECORD_ITEMS : PLAY_ITEMS
  return ids.map((id, i) => {
    const xFrac = expandedSide.value === 'left' ? ICON_LAYOUT[i].xFrac : 1 - ICON_LAYOUT[i].xFrac
    return {
      id,
      ...SCREENS[id],
      x: gsap.utils.clamp(ZONE_EDGE_MARGIN, w - ZONE_EDGE_MARGIN, xFrac * w),
      y: Math.max(ZONE_EDGE_MARGIN, zone.y + ICON_LAYOUT[i].dy),
    }
  })
})
const pillPosition = computed(() => {
  if (!expandedSide.value || !zonePositions.value || !stageSize.value) return null
  const zone = zonePositions.value[expandedSide.value]
  const xFrac = expandedSide.value === 'left' ? PILL_LAYOUT.xFrac : 1 - PILL_LAYOUT.xFrac
  return {
    side: expandedSide.value,
    label: expandedSide.value === 'left' ? 'きろく' : 'あそぶ',
    x: xFrac * stageSize.value.width,
    y: zone.y + PILL_LAYOUT.dy,
  }
})

// ---- 当たり判定(すべて指の位置基準。判定の優先順位: アイコン > 靄セル > ゾーン) ----
let grabRect = null
const toLocal = (x, y) => {
  const rect = grabRect ?? hubEl.value.getBoundingClientRect()
  return { x: x - rect.left, y: y - rect.top }
}
const hitZone = (p) => {
  for (const side of ['left', 'right']) {
    const z = zonePositions.value?.[side]
    if (z && Math.hypot(p.x - z.x, p.y - z.y) <= ZONE_HIT) return side
  }
  return null
}
const hitIcon = (p) => {
  for (const item of iconPositions.value) {
    if (Math.hypot(p.x - item.x, p.y - item.y) <= ICON_HIT) return item.id
  }
  return null
}
// 靄セルの当たり判定: 点 p(hub座標=コンテナpx) を含む「靄(fog)」セルを返す。
// セル矩形はジオ座標を投影した現在の画面位置(cellRects)なので、地図をパンしても正しく当たる
const hitFogCell = (p) => {
  const rects = cellRects.value
  for (const c of exploration.cells.value) {
    if (c.state !== 'fog') continue
    const r = rects[c.id]
    if (r && p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height) return c
  }
  return null
}

const resetDragState = () => {
  grabRect = null
  zonePositions.value = null
  activeZone.value = null
  expandedSide.value = null
  hoveredIcon.value = null
  targetFogCell.value = null
}

// ---- ジェスチャー(モッポ本体 or るすのざぶとん から来る) ----
const onGrab = () => {
  // idle=モッポ直接掴み / exploring=ざぶとん掴み(ナビ専用) のどちらからも開始できる
  if (hubState.value !== 'idle' && hubState.value !== 'exploring') return
  navBase.value = hubState.value
  hubState.value = 'grabbed'
  const rect = hubEl.value.getBoundingClientRect()
  grabRect = rect
  const home = moppoRef.value?.getHomeCenter()
  if (!home) return
  const y = toLocal(home.x, home.y).y
  zonePositions.value = {
    left: { x: ZONE_EDGE_X, y },
    right: { x: rect.width - ZONE_EDGE_X, y },
  }
  stageSize.value = { width: rect.width, height: rect.height }
}
const onDrag = (p) => {
  if (hubState.value !== 'grabbed') return
  const local = toLocal(p.mx ?? p.x, p.my ?? p.y)
  activeZone.value = hitZone(local)
  if (activeZone.value && expandedSide.value !== activeZone.value) {
    expandedSide.value = activeZone.value
    hoveredIcon.value = null
  }
  hoveredIcon.value = expandedSide.value ? hitIcon(local) : null
  // モッポ直接掴みの時だけ、靄セルをターゲット強調(ざぶとん掴み=ナビ専用は対象外)
  targetFogCell.value = navBase.value === 'idle' && !expandedSide.value ? hitFogCell(local)?.id ?? null : null
}
const onRelease = (p) => {
  if (hubState.value !== 'grabbed') {
    if (navBase.value === 'idle') moppoRef.value?.returnHome()
    return
  }
  const local = p ? toLocal(p.mx ?? p.x, p.my ?? p.y) : null
  const icon = hoveredIcon.value ?? (local ? hitIcon(local) : null)
  const fog = !icon && navBase.value === 'idle' && local ? hitFogCell(local) : null
  resetDragState()

  if (icon) {
    hubState.value = navBase.value
    if (navBase.value === 'idle') moppoRef.value?.returnHome()
    goScreen(icon)
    return
  }
  if (fog && exploration.canExplore()) {
    startExploration(fog) // 靄の上で離した = 開拓スタート
    return
  }
  // 何もなし: 元の状態へ戻す
  hubState.value = navBase.value
  if (navBase.value === 'idle') moppoRef.value?.returnHome()
}
const onTap = () => {
  if (hubState.value === 'night') {
    hubState.value = 'idle'
    moppoRef.value?.wakeStartle()
    return
  }
  if (hubState.value === 'returned') {
    startReveal(exploreCell.value) // ⑩ 「タップしてね」→ 凝った霧はらし演出スタート
    return
  }
  if (hubState.value !== 'idle' && hubState.value !== 'exploring') return
  navBase.value = hubState.value
  if (hubState.value === 'idle') moppoRef.value?.squishPop()
  hubState.value = 'talk'
}
const onLongPress = () => {
  if (hubState.value !== 'idle') return
  hubState.value = 'drowsy'
  moppoRef.value?.startSleepSequence(() => {
    hubState.value = 'night'
  })
}
const onLongPressEnd = () => {
  if (hubState.value !== 'drowsy') return
  moppoRef.value?.cancelSleepSequence()
  hubState.value = 'idle'
}
const onShake = () => {
  if (hubState.value !== 'grabbed') return
  hubState.value = 'sneeze'
  resetDragState()
  const rect = hubEl.value.getBoundingClientRect()
  const home = moppoRef.value?.getHomeCenter()
  if (!home) return
  const dx = rect.left + rect.width / 2 - home.x
  const dy = rect.top + rect.height * 0.36 - home.y
  moppoRef.value?.playSneezeAt(dx, dy, {
    onBurst: () => {
      splashOrigin.value = { x: rect.width / 2, y: rect.height * 0.36 + 16 }
      sneezeModalVisible.value = true
    },
  })
}

// ---- ⑨ 探索へ出かける ----
const startExploration = (cell) => {
  exploreCell.value = cell
  hubState.value = 'exploring'
  moppoAway.value = true
  const rect = hubEl.value.getBoundingClientRect()
  const home = moppoRef.value?.getHomeCenter()
  const r = cellRects.value[cell.id]
  if (!home || !r) return
  // セル中心(コンテナpx)→ クライアント座標 → home からの相対 dx,dy
  const dx = rect.left + r.left + r.width / 2 - home.x
  const dy = rect.top + r.top + r.height / 2 - home.y
  moppoRef.value?.walkOut(dx, dy, {
    onArrive: () => moppoRef.value?.say(EXPLORE_SPEECH.exploring, 0, { persist: true }),
  })
  clearTimeout(exploreTimer)
  exploreTimer = setTimeout(() => arriveHome(cell), EXPLORE_DURATION_MS)
}

// ⑩前半(自動): モッポが席に帰り「タップしてね」で待機。まだ霧は晴らさない
const arriveHome = (cell) => {
  exploreTimer = null
  moppoRef.value?.stopWalk()
  moppoAway.value = false
  hubState.value = 'returned'
  exploreCell.value = cell
  moppoRef.value?.returnHome(() => moppoRef.value?.say(EXPLORE_SPEECH.done, 0, { persist: true }))
}

// ⑩本番(タップ始動): 凝った霧はらし演出
const startReveal = (cell) => {
  if (!cell) {
    hubState.value = 'idle'
    return
  }
  hubState.value = 'revealing'
  const discovery = exploration.markExplored(cell.id) // justRevealed セット → 靄ディゾルブ＋ピン twinkle
  if (!discovery) {
    hubState.value = 'idle'
    return
  }
  // モッポ「じゃーん!」
  gsap.delayedCall(REVEAL.tadaAt, () => moppoRef.value?.tada())
  // 「＋○けん」カウントアップ
  countDisplay.value = 0
  const counter = { n: 0 }
  gsap.to(counter, {
    n: discovery.count,
    duration: REVEAL.countUp,
    delay: REVEAL.pinDelay,
    ease: 'power1.out',
    onUpdate: () => {
      countDisplay.value = Math.round(counter.n)
    },
  })
  // 静かなトースト
  gsap.delayedCall(REVEAL.toastAt, showFogToast)
  // ただいまのセリフ
  gsap.delayedCall(REVEAL.welcomeAt, () =>
    moppoRef.value?.say(
      EXPLORE_SPEECH.welcome.replace('{area}', discovery.area).replace('{n}', discovery.count),
      1800,
    ),
  )
  // 演出おわり → idle へ
  gsap.delayedCall(REVEAL.total, () => {
    hubState.value = 'idle'
    exploreCell.value = null
    exploration.clearReveal()
  })
}

let toastHide = null
const showFogToast = () => {
  toastHide?.kill()
  toastVisible.value = true
  toastHide = gsap.delayedCall(EXPLORE_TOAST_MS / 1000, () => {
    toastVisible.value = false
  })
}

onBeforeUnmount(() => {
  clearTimeout(exploreTimer)
  toastHide?.kill()
  window.removeEventListener('resize', measureStage)
})

// ---- メニュー・遷移 ----
const closeMenu = () => {
  sneezeModalVisible.value = false
  if (hubState.value === 'sneeze') moppoRef.value?.returnHome()
  hubState.value = navBase.value // idle か exploring へ戻す
}
const goScreen = (id) => {
  if (!SCREENS[id]) return
  router.push(`/screen/${id}`)
}
const onSneezeGo = () => {
  sneezeModalVisible.value = false
  hubState.value = 'idle'
  moppoRef.value?.returnHome()
  goScreen('place')
}

// ---- ★お気に入り / ぜんぶシート ----
const openSheet = (mode) => {
  sheetMode.value = mode
}
const openPicker = (slotIndex) => {
  pendingSlot.value = slotIndex
  sheetMode.value = 'pick'
}
const closeSheet = () => {
  sheetMode.value = null
  pendingSlot.value = null
}
const onSheetSelect = (id) => {
  if (sheetMode.value === 'pick' && pendingSlot.value !== null) {
    const screen = SCREENS[id]
    favBarRef.value?.setSlot(pendingSlot.value, { icon: screen.icon, label: screen.label, screen: id })
    closeSheet()
    return
  }
  closeSheet()
  goScreen(id)
}
</script>

<style scoped>
.moppo-hub {
  position: absolute;
  inset: 0;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}
.hint-pill {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  padding: 6px 14px;
  background: var(--hub-pill-bg);
  border-radius: 20px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  font-size: 10.5px;
  font-weight: 700;
  color: var(--hub-ink);
  letter-spacing: 1px;
  white-space: nowrap;
  pointer-events: none;
}
.hint-pill.night {
  background: rgba(40, 44, 54, 0.9);
  color: #cdd2dc;
}
/* ⑩ 「＋○けん」カウントアップ */
.found-count {
  position: absolute;
  top: 24%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 32;
  font-family: var(--hub-font-display, serif);
  font-size: 30px;
  font-weight: 800;
  color: #e0923c;
  text-shadow: 0 2px 10px rgba(224, 146, 60, 0.4), 0 0 2px #fff;
  pointer-events: none;
}
/* ⑩ 静かなトースト(検索バーの下あたり) */
.fog-toast {
  position: absolute;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 32;
  padding: 8px 16px;
  background: rgba(74, 67, 53, 0.92);
  color: #fdf6e6;
  border-radius: 18px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  white-space: nowrap;
  pointer-events: none;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
