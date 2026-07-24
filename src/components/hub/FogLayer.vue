<template>
  <!-- 靄(霧)レイヤー。地図とモッポの間に敷く「描くだけ」の層。当たり判定は持たず
       (親 MoppoHub が幾何計算する)、pointer-events は殺す。
       各セルはジオ座標を投影した画面px矩形(rects)で配置。靄ブロックは軽く点滅し、
       つかんでいる間は各ブロックに「ここに落とせる」破線フレームが出る。 -->
  <div class="fog-layer">
    <template v-for="cell in cells" :key="cell.id">
      <div
        v-if="(cell.state === 'fog' || cell.state === 'occupied') && rects[cell.id]"
        class="cell"
        :class="{ occupied: cell.state === 'occupied' }"
        :style="cellStyle(cell.id)"
      >
        <div class="haze" :style="{ '--pd': pulseDelay(cell) }"></div>
        <!-- だれかのモッポが探索中: 匿名シルエット＋ちいさなカード -->
        <template v-if="cell.state === 'occupied'">
          <div class="silhouette"></div>
          <div class="somebody">{{ EXPLORE_SPEECH.somebody }}</div>
        </template>
        <!-- つかんでいる時だけ、各ブロックに「落とせそう」な破線フレーム。重なっている所は強調 -->
        <div v-if="grabbing && cell.state === 'fog'" class="drop-frame" :class="{ target: cell.id === targetCell }"></div>
      </div>
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
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import { FOG_COLOR, FOG_PULSE, REVEAL, EXPLORE_SPEECH } from '../../constants/hubConfig'

const props = defineProps({
  cells: { type: Array, default: () => [] }, // { id, row, col, state, suggested }
  rects: { type: Object, default: () => ({}) }, // id → { left, top, width, height }(画面px)
  grabbing: { type: Boolean, default: false }, // つかんでいる間だけ破線フレームを出す
  targetCell: { type: String, default: null }, // いまモッポが重なっている靄セル id
  revealCellId: { type: String, default: null }, // ⑩演出のトリガ(晴れる瞬間のセル)
})

// セルの画面px矩形 → style
const cellStyle = (id) => {
  const r = props.rects[id]
  return r ? { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` } : { display: 'none' }
}

// 点滅の位相をセル毎にずらす(負の delay で最初から途中再生 = 起動時にちらつかない)
const pulsePeriod = `${FOG_PULSE.period}s`
const pulseMin = String(FOG_PULSE.min)
const pulseDelay = (cell) => `-${((cell.row * 2 + cell.col) * FOG_PULSE.stagger).toFixed(2)}s`

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
/* 靄。常時ゆっくり点滅(ブロック毎に位相ずらし) */
.haze {
  position: absolute;
  inset: 0;
  background: v-bind('FOG_COLOR');
  box-shadow: inset 0 0 22px rgba(24, 17, 9, 0.35);
  --pmin: v-bind('pulseMin');
  animation: haze-pulse v-bind('pulsePeriod') ease-in-out infinite;
  animation-delay: var(--pd, 0s);
}
@keyframes haze-pulse {
  0%,
  100% {
    opacity: var(--pmin);
  }
  50% {
    opacity: 1;
  }
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

/* つかんでいる間: 各靄ブロックに「落とせそう」な破線フレーム */
.drop-frame {
  position: absolute;
  inset: 5px;
  border: 2px dashed rgba(245, 236, 216, 0.72);
  border-radius: 9px;
  pointer-events: none;
}
/* モッポが重なっているブロックは橙で強調＋淡く点滅 */
.drop-frame.target {
  border-color: #f0a24a;
  background: rgba(224, 138, 60, 0.16);
  box-shadow: 0 0 0 2px rgba(224, 138, 60, 0.15), inset 0 0 16px rgba(224, 138, 60, 0.22);
  animation: target-pulse 1s ease-in-out infinite;
}
@keyframes target-pulse {
  0%,
  100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
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
