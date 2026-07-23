<template>
  <!-- モッポHub 全体のコンテナ = 状態機械。
       レイヤー: 地図 → 検索 → ★ → ドロップゾーン → モッポ → メニュー/モーダル -->
  <div ref="hubEl" class="moppo-hub">
    <MapCanvas :night="isNight" />
    <SearchBar v-if="!isNight" />

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

    <Moppo
      ref="moppoRef"
      :expression="moppoExpression"
      :night="isNight"
      :ring="hubState === 'idle' && !isNight"
      :style="{ pointerEvents: sneezeModalVisible ? 'none' : '' }"
      @grab="onGrab"
      @drag="onDrag"
      @release="onRelease"
      @tap="onTap"
      @long-press="onLongPress"
      @long-press-end="onLongPressEnd"
      @shake="onShake"
    />

    <div v-if="hubState === 'idle' && !isNight" class="hint-pill">モッポを タップ／つかむ</div>
    <div v-if="isNight && hubState === 'night'" class="hint-pill night">タップで おこす</div>

    <TalkFan v-if="hubState === 'talk'" @select="goScreen" @close="closeMenu" />

    <SneezeModal v-if="sneezeModalVisible" @go="onSneezeGo" @close="closeMenu" />
    <AllScreensSheet v-if="sheetMode" :mode="sheetMode" @select="onSheetSelect" @close="closeSheet" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MapCanvas from './MapCanvas.vue'
import SearchBar from './SearchBar.vue'
import FavoriteBar from './FavoriteBar.vue'
import DropZones from './DropZones.vue'
import Moppo from './Moppo.vue'
import TalkFan from './TalkFan.vue'
import SneezeModal from './SneezeModal.vue'
import AllScreensSheet from './AllScreensSheet.vue'
import gsap from 'gsap'
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
} from '../../constants/hubConfig'

const router = useRouter()
const hubEl = ref(null)
const moppoRef = ref(null)
const favBarRef = ref(null)

// idle | grabbed | talk | drowsy | night | sneeze
const hubState = ref('idle')
const sneezeModalVisible = ref(false)
const sheetMode = ref(null) // null | 'browse' | 'pick'
const pendingSlot = ref(null)

// --- ドラッグ中のゾーン/アイコン状態 ---
const zonePositions = ref(null) // { left:{x,y}, right:{x,y} } hub座標(px)
const stageSize = ref(null)
const activeZone = ref(null) // 'left' | 'right' | null
const expandedSide = ref(null) // 一度ゾーンに触れたら展開しっぱなし(離すまで)
const hoveredIcon = ref(null) // 重なっているアイコンの screen id

const isNight = computed(() => hubState.value === 'night')
const moppoExpression = computed(() => {
  switch (hubState.value) {
    case 'grabbed':
      return 'grabbed'
    case 'talk':
      return 'talking' // 目を開けたまま口をぱくぱくさせて喋る

    case 'night':
      return 'asleep'
    case 'sneeze':
      return 'sneeze'
    default:
      return 'idle' // drowsy 中の段階表情は Moppo 内部が持つ
  }
})

// 展開中アイコンの配置(参考画像: 左上→中央へ斜め。右側は左右反転)
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
// 展開中の方向ラベル(白ピル)
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

// ---- 当たり判定(すべて指の位置基準。判定の優先順位: アイコン > ゾーン) ----
// rect はつかんだ瞬間に1回だけ測ってキャッシュ(pointermove ごとの layout 読み取りはかくつきの元)
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

const resetDragState = () => {
  grabRect = null
  zonePositions.value = null
  activeZone.value = null
  expandedSide.value = null
  hoveredIcon.value = null
}

// ---- ジェスチャー(何が起きたかは Moppo から来る。ここで何をするか決める) ----
const onGrab = () => {
  if (hubState.value !== 'idle') return
  hubState.value = 'grabbed'
  // ゾーンは画面の左右端・モッポの定位置と同じ高さに出す
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
  const local = toLocal(p.x, p.y)
  activeZone.value = hitZone(local)
  // ゾーンに重なったらその側のアイコンを展開(発火)。展開は離すまで維持
  if (activeZone.value && expandedSide.value !== activeZone.value) {
    expandedSide.value = activeZone.value
    hoveredIcon.value = null
  }
  hoveredIcon.value = expandedSide.value ? hitIcon(local) : null
}
const onRelease = (p) => {
  if (hubState.value !== 'grabbed') {
    moppoRef.value?.returnHome()
    return
  }
  const target = hoveredIcon.value ?? (p ? hitIcon(toLocal(p.x, p.y)) : null)
  resetDragState() // 離したらゾーンもアイコンも自動で消す
  hubState.value = 'idle'
  moppoRef.value?.returnHome() // 離すと所定の位置(真ん中下)へ
  if (target) goScreen(target) // アイコンの上で離したら画面遷移
}
const onTap = () => {
  if (hubState.value === 'night') {
    // びくっ！と起きる(鼻提灯が弾けて飛び上がる)
    hubState.value = 'idle'
    moppoRef.value?.wakeStartle()
    return
  }
  if (hubState.value !== 'idle') return
  moppoRef.value?.squishPop()
  hubState.value = 'talk'
}
const onLongPress = () => {
  if (hubState.value !== 'idle') return
  // 押し続けている間、少しずつ眠くなっていく
  hubState.value = 'drowsy'
  moppoRef.value?.startSleepSequence(() => {
    hubState.value = 'night' // Zzz... 完全に眠った → 夜の地図へ
  })
}
const onLongPressEnd = () => {
  if (hubState.value !== 'drowsy') return
  // 眠りきる前に離された → しゃきっと戻る
  moppoRef.value?.cancelSleepSequence()
  hubState.value = 'idle'
}
const onShake = () => {
  if (hubState.value !== 'grabbed') return
  hubState.value = 'sneeze'
  resetDragState()
  // 画面中央へ移動 → 予備動作 → くしゃみと同時に提案カードが飛び出す
  const rect = hubEl.value.getBoundingClientRect()
  const home = moppoRef.value?.getHomeCenter()
  if (!home) return
  const dx = rect.left + rect.width / 2 - home.x
  const dy = rect.top + rect.height * 0.36 - home.y
  moppoRef.value?.playSneezeAt(dx, dy, {
    onBurst: () => {
      sneezeModalVisible.value = true
    },
  })
}

// ---- メニュー・遷移 ----
const closeMenu = () => {
  sneezeModalVisible.value = false
  if (hubState.value === 'sneeze') moppoRef.value?.returnHome()
  hubState.value = 'idle'
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
</style>
