<template>
  <!-- 靄(霧)レイヤー。地図とモッポの間に敷く「描くだけ」の層。当たり判定は持たず
       (親 MoppoHub が幾何計算する)、pointer-events は殺す。
       各セルの位置はジオ座標を投影した画面px矩形(rects)を親から受け取って配置する。 -->
  <div class="fog-layer">
    <!-- 各セル。fog=暗幕 / occupied=だれかが探索中 / explored=晴れ(何も描かない) -->
    <template v-for="cell in cells" :key="cell.id">
      <div
        v-if="(cell.state === 'fog' || cell.state === 'occupied') && rects[cell.id]"
        class="cell"
        :class="{ occupied: cell.state === 'occupied' }"
        :style="cellStyle(cell.id)"
      >
        <div class="haze"></div>
        <!-- だれかのモッポが探索中: 匿名シルエット＋ちいさなカード -->
        <template v-if="cell.state === 'occupied'">
          <div class="silhouette"></div>
          <div class="somebody">{{ EXPLORE_SPEECH.somebody }}</div>
        </template>
        <!-- つかんでいる時だけ、ターゲット(ホバー中 or おすすめ)を橙枠＋バッジで強調 -->
        <template v-if="grabbing && cell.state === 'fog' && cell.id === highlightId">
          <div class="target-ring"></div>
          <div class="drop-badge">{{ EXPLORE_SPEECH.dropHere }}</div>
        </template>
      </div>
    </template>

    <!-- 席→おすすめセルへの点線ガイド＋着地シャドウ(つかんでいる時だけ) -->
    <template v-if="grabbing && showTrail && guideCenter">
      <svg class="trail" :viewBox="`0 0 ${Math.max(stage.width, 1)} ${Math.max(stage.height, 1)}`" preserveAspectRatio="none">
        <line :x1="seatPx.x" :y1="seatPx.y" :x2="guideCenter.x" :y2="guideCenter.y" class="trail-line" />
      </svg>
      <div class="landing" :style="{ left: `${guideCenter.x}px`, top: `${guideCenter.y}px` }"></div>
    </template>

    <!-- ⑩ 霧はらし演出: 対象セルの靄を小タイルに砕いて舞い上げる＋光のスイープ -->
    <div v-if="shatter && rects[shatter.id]" class="shatter" :style="cellStyle(shatter.id)">
      <div class="tiles" :style="tilesGrid">
        <div v-for="i in tileCount" :key="i" ref="tileEls" class="tile"></div>
      </div>
      <div ref="sweepEl" class="sweep"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import { FOG_COLOR, REVEAL, SEAT_FRAC, EXPLORE_SPEECH } from '../../constants/hubConfig'

const props = defineProps({
  cells: { type: Array, default: () => [] }, // { id, row, col, state, suggested }
  rects: { type: Object, default: () => ({}) }, // id → { left, top, width, height }(画面px)
  stage: { type: Object, default: () => ({ width: 0, height: 0 }) }, // コンテナ実寸(ガイド座標系)
  grabbing: { type: Boolean, default: false }, // つかんでいる間だけ強調・ガイドを出す
  targetCell: { type: String, default: null }, // いまモッポが重なっている靄セル id
  showTrail: { type: Boolean, default: false },
  revealCellId: { type: String, default: null }, // ⑩演出のトリガ(晴れる瞬間のセル)
})

// セルの画面px矩形 → style
const cellStyle = (id) => {
  const r = props.rects[id]
  return r ? { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` } : { display: 'none' }
}

// 強調するセル = ホバー中のターゲット。無ければ「おすすめ」セル
const suggestedId = computed(() => props.cells.find((c) => c.suggested && c.state === 'fog')?.id ?? null)
const highlightId = computed(() => props.targetCell ?? suggestedId.value)

// 点線ガイド: 席(下中央) → おすすめセル中心
const seatPx = computed(() => ({ x: SEAT_FRAC.x * props.stage.width, y: SEAT_FRAC.y * props.stage.height }))
const guideCenter = computed(() => {
  const r = props.rects[suggestedId.value]
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null
})

// ---- ⑩ 砕けて舞う演出 ----
const tileCount = REVEAL.fogTile.rows * REVEAL.fogTile.cols
const tilesGrid = {
  gridTemplateColumns: `repeat(${REVEAL.fogTile.cols}, 1fr)`,
  gridTemplateRows: `repeat(${REVEAL.fogTile.rows}, 1fr)`,
}
const shatter = ref(null) // { id } 演出中のセル
const tileEls = useTemplateRef('tileEls')
const sweepEl = ref(null)

watch(
  () => props.revealCellId,
  async (id) => {
    if (!id) return
    shatter.value = { id }
    await nextTick()
    if (tileEls.value?.length) {
      gsap.set(tileEls.value, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 })
      gsap.to(tileEls.value, {
        y: () => REVEAL.fogBlowY - gsap.utils.random(0, REVEAL.fogBlowSpread),
        x: () => gsap.utils.random(-REVEAL.fogBlowSpread, REVEAL.fogBlowSpread),
        rotation: () => gsap.utils.random(-REVEAL.fogBlowSpread, REVEAL.fogBlowSpread),
        scale: 0.5,
        opacity: 0,
        duration: REVEAL.fogDuration,
        ease: REVEAL.fogEase,
        stagger: { each: REVEAL.fogStagger, from: 'random' },
        onComplete: () => {
          shatter.value = null
        },
      })
    }
    if (sweepEl.value) {
      gsap.fromTo(
        sweepEl.value,
        { xPercent: -130, opacity: 0.9 },
        { xPercent: 130, opacity: 0, duration: REVEAL.sweepDuration, ease: 'power1.inOut' },
      )
    }
  },
)
</script>

<style scoped>
.fog-layer {
  position: absolute;
  inset: 0;
  z-index: 5; /* 地図(0)より上、検索/席/モッポ(20〜30)より下 */
  pointer-events: none;
  overflow: hidden;
}
.cell {
  position: absolute;
}
.haze {
  position: absolute;
  inset: 0;
  background: v-bind('FOG_COLOR');
  box-shadow: inset 0 0 22px rgba(24, 17, 9, 0.35);
  transition: opacity 0.8s ease;
}
.occupied .haze {
  background: rgba(24, 17, 9, 0.36);
}
.silhouette {
  position: absolute;
  top: 34%;
  left: 50%;
  width: 26px;
  height: 24px;
  transform: translate(-50%, -50%);
  background: rgba(255, 253, 248, 0.32);
  border-radius: 48% 48% 46% 46%;
}
.silhouette::before,
.silhouette::after {
  content: '';
  position: absolute;
  top: -6px;
  width: 10px;
  height: 12px;
  background: rgba(255, 253, 248, 0.32);
  border-radius: 50%;
}
.silhouette::before {
  left: 1px;
  transform: rotate(-18deg);
}
.silhouette::after {
  right: 1px;
  transform: rotate(18deg);
}
.somebody {
  position: absolute;
  top: 56%;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: rgba(255, 253, 248, 0.92);
  color: #6a6154;
  font-size: 9.5px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  padding: 4px 8px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* ターゲット強調(橙枠＋バッジ) */
.target-ring {
  position: absolute;
  inset: 4px;
  border: 2.5px solid #e08a3c;
  border-radius: 10px;
  box-shadow: 0 0 0 3px rgba(224, 138, 60, 0.18), inset 0 0 18px rgba(224, 138, 60, 0.25);
  animation: target-pulse 1.1s ease-in-out infinite;
}
@keyframes target-pulse {
  0%,
  100% {
    opacity: 0.75;
  }
  50% {
    opacity: 1;
  }
}
.drop-badge {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: #e08a3c;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 3px 10px;
  border-radius: 12px;
  box-shadow: 0 3px 8px rgba(160, 90, 30, 0.4);
}

/* 席→おすすめセルの点線ガイド */
.trail {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.trail-line {
  stroke: #e08a3c;
  stroke-width: 2.5;
  stroke-dasharray: 5 7;
  stroke-linecap: round;
  opacity: 0.85;
  vector-effect: non-scaling-stroke;
  animation: trail-dash 0.7s linear infinite;
}
@keyframes trail-dash {
  to {
    stroke-dashoffset: -12;
  }
}
.landing {
  position: absolute;
  width: 46px;
  height: 20px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(224, 138, 60, 0.35), rgba(224, 138, 60, 0));
}

/* ⑩ 砕けて舞う靄タイル */
.shatter {
  position: absolute;
  overflow: visible;
}
.tiles {
  position: absolute;
  inset: 0;
  display: grid;
  gap: 0;
}
.tile {
  background: v-bind('FOG_COLOR');
  will-change: transform, opacity;
}
.sweep {
  position: absolute;
  top: -20%;
  left: 0;
  width: 60%;
  height: 140%;
  background: linear-gradient(105deg, transparent, rgba(255, 250, 232, 0.85), transparent);
  filter: blur(2px);
  pointer-events: none;
}
</style>
