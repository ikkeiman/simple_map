<template>
  <!-- 地図レイヤー。APIキーがあれば Google Maps、なければスタイライズ地図に自動フォールバック -->
  <div class="map-canvas" :class="{ night }">
    <GoogleMap
      v-if="apiKey"
      ref="gmapRef"
      :api-key="apiKey"
      :center="MAP_CENTER"
      :zoom="MAP_ZOOM"
      :styles="night ? MAP_STYLE_NIGHT : MAP_STYLE_DAY"
      :disable-default-ui="true"
      gesture-handling="greedy"
      class="gmap"
    >
      <template v-if="!night">
        <CustomMarker v-for="pin in visibleDayPins" :key="pin.id" :options="{ position: pin, anchorPoint: 'CENTER' }">
          <div class="spot-pin"><span class="dot" :style="{ background: pin.priority }"></span><span class="lbl">{{ pin.label }}</span></div>
        </CustomMarker>
        <CustomMarker :options="{ position: CURRENT_LOCATION, anchorPoint: 'CENTER' }">
          <div class="current-loc"></div>
        </CustomMarker>
        <!-- 開拓で見つけたピン。晴れた直後(justRevealed)は twinkle で1つずつ灯る -->
        <CustomMarker v-for="(pin, i) in discoveredPins" :key="pin.id" :options="{ position: pin, anchorPoint: 'CENTER' }">
          <div class="disc-pin" :class="{ twinkling: pin.justRevealed }" :style="twinkleStyle(pin, i)">
            <span v-if="pin.justRevealed" class="sparkle">✨</span>
            <span class="ddot" :style="{ background: pin.priority }"></span><span class="lbl">{{ pin.label }}</span>
          </div>
        </CustomMarker>
      </template>
      <template v-else>
        <CustomMarker v-for="pin in DAY_PINS" :key="pin.id" :options="{ position: pin, anchorPoint: 'CENTER' }">
          <div class="dim-pin"></div>
        </CustomMarker>
        <CustomMarker v-for="pin in NIGHT_PINS" :key="pin.id" :options="{ position: pin, anchorPoint: 'CENTER' }">
          <div class="night-pin"><span class="glow">{{ pin.icon }}</span><span class="nlbl">{{ pin.label }}</span></div>
        </CustomMarker>
      </template>
    </GoogleMap>

    <!-- フォールバック: ワイヤーフレーム風の抽象地図 -->
    <div v-else class="fallback">
      <div class="park"></div>
      <div class="road v"></div>
      <div class="road h1"></div>
      <div class="road h2"></div>
      <div class="river"></div>
      <template v-if="!night">
        <div v-for="pin in visibleDayPins" :key="pin.id" class="spot-pin abs" :style="fracStyle(pin)">
          <span class="dot" :style="{ background: pin.priority }"></span><span class="lbl">{{ pin.label }}</span>
        </div>
        <div class="current-loc abs" :style="fracStyle(CURRENT_LOCATION)"></div>
        <div
          v-for="(pin, i) in discoveredPins"
          :key="pin.id"
          class="disc-pin abs"
          :class="{ twinkling: pin.justRevealed }"
          :style="[fracStyle(pin), twinkleStyle(pin, i)]"
        >
          <span v-if="pin.justRevealed" class="sparkle">✨</span>
          <span class="ddot" :style="{ background: pin.priority }"></span><span class="lbl">{{ pin.label }}</span>
        </div>
      </template>
      <template v-else>
        <div v-for="pin in DAY_PINS" :key="pin.id" class="dim-pin abs" :style="fracStyle(pin)"></div>
        <div v-for="pin in NIGHT_PINS" :key="pin.id" class="night-pin abs" :style="fracStyle(pin)">
          <span class="glow">{{ pin.icon }}</span><span class="nlbl">{{ pin.label }}</span>
        </div>
      </template>
    </div>

    <!-- 優先度凡例(昼のみ・1a) -->
    <div v-if="!night" class="legend">
      <div v-for="item in PRIORITY_LEGEND" :key="item.label" class="row">
        <span class="dot" :style="{ background: item.color }"></span>{{ item.label }}
      </div>
    </div>
  </div>
</template>

<script setup>
// 地図を描くだけのレイヤー。ジェスチャーや状態遷移は持たない。
// 例外: 靄をジオ座標に固定するため、地図が用意できたら map/api を親へ渡す(projection 用)
import { computed, ref, watch } from 'vue'
import { GoogleMap, CustomMarker } from 'vue3-google-map'
import {
  MAP_CENTER,
  MAP_ZOOM,
  MAP_STYLE_DAY,
  MAP_STYLE_NIGHT,
  DAY_PINS,
  NIGHT_PINS,
  CURRENT_LOCATION,
  PRIORITY_LEGEND,
  REVEAL,
} from '../../constants/hubConfig'

const props = defineProps({
  night: { type: Boolean, default: false },
  visibleCategories: { type: Array, default: null }, // 絞り込み(カテゴリ id)。空/null なら全表示
  discoveredPins: { type: Array, default: () => [] }, // 開拓で見つけたピン(justRevealed で twinkle)
})
const emit = defineEmits(['map-ready'])

// Google 地図が用意できたら map/api を親へ渡す。親は projection で靄セルを画面px化する
const gmapRef = ref(null)
watch(
  () => gmapRef.value?.ready,
  (isReady) => {
    if (isReady) emit('map-ready', { map: gmapRef.value.map, api: gmapRef.value.api })
  },
)

// twinkle の点灯を1つずつ遅らせて「順に灯る」カスケードにする(晴れ始めてから pinDelay 後に開始)
const twinkleStyle = (pin, i) =>
  pin.justRevealed ? { '--tw-delay': `${REVEAL.pinDelay + i * REVEAL.pinStagger}s` } : {}

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

// 空選択=すべて表示。えらばれている時だけ、そのカテゴリのピンに絞る
const visibleDayPins = computed(() =>
  props.visibleCategories && props.visibleCategories.length
    ? DAY_PINS.filter((pin) => props.visibleCategories.includes(pin.category))
    : DAY_PINS,
)

const fracStyle = (pin) => ({ left: `${pin.xFrac * 100}%`, top: `${pin.yFrac * 100}%` })
</script>

<style scoped>
.map-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #e6e2d9;
  transition: background 0.8s;
}
.map-canvas.night {
  background: var(--hub-night-bg);
}
.gmap {
  width: 100%;
  height: 100%;
}
/* Google Maps 下部のロゴ・利用規約・誤り報告リンクを隠す(プロトタイプ用途。
   公開リリース時は Google の利用規約上、帰属表示が必要な点に注意) */
.gmap :deep(.gm-style-cc) {
  display: none !important;
}
.gmap :deep(a[href^='https://maps.google']),
.gmap :deep(a[href^='https://www.google.com/maps']) {
  display: none !important;
}

/* --- フォールバック地図(色は昼夜で切替) --- */
.fallback {
  position: absolute;
  inset: 0;
  --road: #d5cfc2;
  --park: #cfe0c2;
  --river: #bcd8d2;
}
.night .fallback {
  --road: #434a56;
  --park: #37473d;
  --river: #37505a;
}
.fallback > div {
  transition: background 0.8s;
}
.park {
  position: absolute;
  top: 42%;
  left: 12%;
  width: 42%;
  height: 24%;
  background: var(--park);
  border-radius: 14px;
  opacity: 0.8;
}
.road {
  position: absolute;
  background: var(--road);
  opacity: 0.85;
}
.road.v {
  top: -5%;
  left: 46%;
  width: 16px;
  height: 115%;
  transform: rotate(6deg);
}
.road.h1 {
  top: 30%;
  left: -8%;
  width: 120%;
  height: 13px;
  transform: rotate(-4deg);
}
.road.h2 {
  top: 66%;
  left: -8%;
  width: 120%;
  height: 10px;
  transform: rotate(3deg);
}
.river {
  position: absolute;
  top: 12%;
  left: -10%;
  width: 125%;
  height: 34px;
  background: var(--river);
  transform: rotate(-7deg);
  opacity: 0.7;
}
.abs {
  position: absolute;
  transform: translate(-50%, -50%);
}

/* --- ピン(昼) --- */
.spot-pin {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.spot-pin .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}
.spot-pin .lbl {
  background: #fff;
  border: 1px solid var(--hub-line);
  border-radius: 8px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  color: #55504a;
}
.current-loc {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #7fa8d4;
  border: 3px solid #fff;
  box-shadow: 0 0 0 6px rgba(127, 168, 212, 0.2);
}

/* --- 開拓で見つけたピン --- */
.disc-pin {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  position: relative;
}
.disc-pin .ddot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex: none;
  /* 灯った直後の余韻。淡い金色のグロー */
  box-shadow: 0 0 8px 2px rgba(224, 184, 74, 0.55);
}
.disc-pin .lbl {
  background: #fffdf6;
  border: 1px solid var(--hub-line);
  border-radius: 8px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  color: #55504a;
}
.disc-pin .sparkle {
  position: absolute;
  left: -6px;
  top: -12px;
  font-size: 13px;
  pointer-events: none;
}
/* twinkle: 光の輪が広がりつつ、ぷるんと弾けて灯る(--tw-delay で順に) */
.disc-pin.twinkling {
  animation: disc-pop 0.75s var(--tw-delay, 0s) both cubic-bezier(0.18, 1.5, 0.4, 1);
}
.disc-pin.twinkling .ddot::after {
  content: '';
  position: absolute;
  left: 5.5px;
  top: 50%;
  width: 11px;
  height: 11px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid rgba(224, 184, 74, 0.9);
  animation: disc-ring 1.1s var(--tw-delay, 0s) both ease-out;
}
.disc-pin.twinkling .sparkle {
  animation: disc-sparkle 0.9s var(--tw-delay, 0s) both ease-out;
}
@keyframes disc-pop {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  60% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes disc-ring {
  0% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(0.3);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(3.2);
  }
}
@keyframes disc-sparkle {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-30deg);
  }
  45% {
    opacity: 1;
    transform: scale(1.2) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: scale(0.8) rotate(20deg);
  }
}

/* --- ピン(夜): 見つけた店だけ光る。それ以外は暗いまま --- */
.dim-pin {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5a6272;
}
.night-pin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.night-pin .glow {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(224, 184, 74, 0.2);
  border: 2px solid var(--hub-night-glow);
  box-shadow: 0 0 16px 4px rgba(224, 184, 74, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}
.night-pin .nlbl {
  font-size: 10px;
  font-weight: 600;
  color: #f0e6c8;
  background: rgba(30, 34, 42, 0.7);
  padding: 1px 6px;
  border-radius: 6px;
  white-space: nowrap;
}

/* --- 凡例 --- */
.legend {
  position: absolute;
  top: 128px;
  left: 12px;
  background: #fff;
  border: 1px solid var(--hub-line);
  border-radius: 9px;
  padding: 7px 9px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.legend .row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 500;
  color: #55504a;
}
.legend .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
</style>
