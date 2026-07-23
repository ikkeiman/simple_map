<template>
  <!-- 地図レイヤー。APIキーがあれば Google Maps、なければスタイライズ地図に自動フォールバック -->
  <div class="map-canvas" :class="{ night }">
    <GoogleMap
      v-if="apiKey"
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
// 地図を描くだけのレイヤー。ジェスチャーや状態遷移は持たない
import { computed } from 'vue'
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
} from '../../constants/hubConfig'

const props = defineProps({
  night: { type: Boolean, default: false },
  visiblePriorities: { type: Array, default: null }, // 絞り込み。null なら全表示
})

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

const visibleDayPins = computed(() =>
  props.visiblePriorities ? DAY_PINS.filter((pin) => props.visiblePriorities.includes(pin.priority)) : DAY_PINS,
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
