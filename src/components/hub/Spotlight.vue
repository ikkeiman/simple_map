<template>
  <!-- 展開メニューを照らす置き型スポットライト。台座＋短い支柱＋バーンドア付きヘッドの
       作り込みSVGフィクスチャと、そこから伸びる金色の光(frostedな円錐＋ビーム)。
       座標は hub-local px(親 DropZones と同じ)。描くだけ・当たり判定なし。 -->
  <div class="spot">
    <!-- 光の円錐: frost で霧を沈めつつ、金色でメニューを引き立てる -->
    <div class="cone" :style="coneStyle"></div>

    <svg class="fx" width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <radialGradient id="sl-base" cx="0.4" cy="0.32" r="0.8">
          <stop offset="0" stop-color="#f2e4c2" />
          <stop offset="0.6" stop-color="#dcc191" />
          <stop offset="1" stop-color="#bf9d63" />
        </radialGradient>
        <linearGradient id="sl-stem" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#a5824f" />
          <stop offset="0.45" stop-color="#e8d3a0" />
          <stop offset="1" stop-color="#9c7a48" />
        </linearGradient>
        <linearGradient id="sl-barrel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#96703f" />
          <stop offset="0.5" stop-color="#eed9a6" />
          <stop offset="1" stop-color="#8f6a3a" />
        </linearGradient>
        <linearGradient id="sl-yoke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e2cd97" />
          <stop offset="1" stop-color="#a5824f" />
        </linearGradient>
        <radialGradient id="sl-knob" cx="0.38" cy="0.34" r="0.8">
          <stop offset="0" stop-color="#f0dcab" />
          <stop offset="1" stop-color="#a5824f" />
        </radialGradient>
        <linearGradient id="sl-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#efdcac" />
          <stop offset="1" stop-color="#9c7a48" />
        </linearGradient>
        <linearGradient id="sl-barn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#c8a86e" />
          <stop offset="1" stop-color="#9a7846" />
        </linearGradient>
        <radialGradient id="sl-lens" cx="0.42" cy="0.36" r="0.75">
          <stop offset="0" stop-color="#fff8e0" />
          <stop offset="0.4" stop-color="#ffe6a0" />
          <stop offset="0.8" stop-color="#f0c256" />
          <stop offset="1" stop-color="#d69f38" />
        </radialGradient>
        <radialGradient id="sl-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ffe9a8" stop-opacity="0.95" />
          <stop offset="1" stop-color="#ffe9a8" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="sl-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff0be" stop-opacity="0.9" />
          <stop offset="1" stop-color="#ffe08a" stop-opacity="0" />
        </linearGradient>
        <filter id="sl-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.6" /></filter>
        <filter id="sl-blurGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.2" /></filter>
        <filter id="sl-beamBlur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.4" /></filter>
      </defs>

      <!-- 光のビーム(数本の筋。加算合成で「光」に見せる) -->
      <g class="beams">
        <path v-for="(d, i) in beamPaths" :key="i" :d="d" fill="url(#sl-beam)" filter="url(#sl-beamBlur)" />
      </g>
      <!-- レンズのホットスポット(光源のにじみ) -->
      <ellipse class="hotspot" :cx="lens.x" :cy="lens.y" rx="26" ry="20" fill="url(#sl-glow)" filter="url(#sl-blurGlow)" />

      <!-- フィクスチャ本体(低く構えた置き型。台座は床に垂直、ヘッドは真上) -->
      <g :transform="`translate(${lens.x}, ${floorY})`">
        <!-- 接地影 -->
        <ellipse cx="0" cy="4" rx="34" ry="8" fill="#5a4a2c" opacity="0.2" filter="url(#sl-soft)" />
        <!-- 台座 -->
        <ellipse cx="0" cy="-3" rx="29" ry="10" fill="url(#sl-base)" />
        <path d="M -29 -3 A 29 10 0 0 0 29 -3 A 29 6 0 0 1 -29 -3 Z" fill="#a5824f" opacity="0.55" />
        <ellipse cx="-6" cy="-6" rx="14" ry="4" fill="#fffdf5" opacity="0.28" filter="url(#sl-soft)" />

        <!-- 支柱(ごく短い) -->
        <path d="M -6 -8 C -7 -15 -5 -19 -5 -22 L 5 -22 C 5 -19 7 -15 6 -8 Z" fill="url(#sl-stem)" />
        <ellipse cx="0" cy="-22" rx="8" ry="2.6" fill="url(#sl-yoke)" />

        <!-- ヨーク(U字の取り付け金具) -->
        <path d="M -4 -24 C -14 -28 -19 -33 -18 -42" stroke="url(#sl-yoke)" stroke-width="4.5" fill="none" stroke-linecap="round" />
        <path d="M 4 -24 C 14 -28 19 -33 18 -42" stroke="url(#sl-yoke)" stroke-width="4.5" fill="none" stroke-linecap="round" />

        <!-- ヘッド(バレル。上向き。ずんぐり) -->
        <rect x="-20" y="-62" width="40" height="24" rx="8" fill="url(#sl-barrel)" />
        <line x1="-19" y1="-45" x2="19" y2="-45" stroke="#8a6a3e" stroke-width="1" opacity="0.22" />
        <line x1="-19" y1="-50" x2="19" y2="-50" stroke="#8a6a3e" stroke-width="1" opacity="0.22" />
        <rect x="-15" y="-60" width="3.6" height="20" rx="1.8" fill="#fffdf5" opacity="0.3" />

        <!-- バーンドア(3枚。スポットライトらしさの要) -->
        <path d="M -14 -63 L 14 -63 L 20 -80 L -20 -80 Z" fill="url(#sl-barn)" />
        <path d="M -12 -65 L 12 -65 L 16 -77 L -16 -77 Z" fill="#e6d0a0" opacity="0.5" />
        <path d="M -18 -61 L -20 -66 L -38 -74 L -31 -62 Z" fill="url(#sl-barn)" />
        <path d="M 18 -61 L 20 -66 L 38 -74 L 31 -62 Z" fill="url(#sl-barn)" />
        <path d="M -18.5 -62 L -30 -66" stroke="#f3e2b8" stroke-width="1" opacity="0.6" stroke-linecap="round" />
        <path d="M 18.5 -62 L 30 -66" stroke="#f3e2b8" stroke-width="1" opacity="0.6" stroke-linecap="round" />

        <!-- 前面リング＋レンズ(光源) -->
        <ellipse cx="0" cy="-62" rx="20" ry="6.5" fill="url(#sl-rim)" />
        <ellipse cx="0" cy="-62" rx="16" ry="5" fill="#3a2f22" />
        <ellipse cx="0" cy="-62.4" rx="14.5" ry="4.5" fill="url(#sl-lens)" />
        <ellipse cx="0" cy="-62.4" rx="10" ry="3" fill="none" stroke="#fffdf5" stroke-width="0.8" opacity="0.3" />
        <ellipse cx="-4.5" cy="-64" rx="4" ry="1.6" fill="#fffef8" opacity="0.85" />

        <!-- チルトノブ -->
        <circle cx="18" cy="-42" r="5" fill="url(#sl-knob)" stroke="#8a6a3e" stroke-width="1" />
        <line x1="18" y1="-45" x2="18" y2="-39" stroke="#8a6a3e" stroke-width="1" opacity="0.6" />
        <circle cx="-18" cy="-42" r="5" fill="url(#sl-knob)" stroke="#8a6a3e" stroke-width="1" />
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  lens: { type: Object, required: true }, // 光源(レンズ)の hub-local px { x, y }
  floorY: { type: Number, required: true }, // 台座を置く床の y(hub-local px)
  centerRad: { type: Number, required: true }, // 光の中心方向(rad。画面yは下向き)
  spreadRad: { type: Number, required: true }, // 半開き角(rad)
  reach: { type: Number, required: true }, // 光の到達距離(px)
  side: { type: String, default: 'left' },
})

const ptAt = (a, r) => `${(props.lens.x + r * Math.cos(a)).toFixed(1)} ${(props.lens.y + r * Math.sin(a)).toFixed(1)}`
const sector = (a0, a1, r) => `M ${props.lens.x.toFixed(1)} ${props.lens.y.toFixed(1)} L ${ptAt(a0, r)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${ptAt(a1, r)} Z`

// 円錐(クリップ形状)＋金色の放射グラデ。frost は CSS 側
const coneStyle = computed(() => {
  const a0 = props.centerRad - props.spreadRad
  const a1 = props.centerRad + props.spreadRad
  const R = Math.round(props.reach)
  return {
    clipPath: `path('${sector(a0, a1, props.reach)}')`,
    background: `radial-gradient(circle ${R}px at ${Math.round(props.lens.x)}px ${Math.round(props.lens.y)}px, rgba(255,235,168,0.82) 0%, rgba(255,226,140,0.46) 40%, rgba(255,222,130,0.12) 78%, rgba(255,222,130,0) 100%)`,
  }
})

// 光のビーム(中心付近に数本、少し非対称に散らす)
const beamPaths = computed(() => {
  const offs = [-0.52, -0.12, 0.34, 0.66]
  const half = 0.05
  return offs.map((o) => {
    const b = props.centerRad + o * props.spreadRad
    return sector(b - half, b + half, props.reach * 0.94)
  })
})
</script>

<style scoped>
.spot {
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: spot-in 0.4s ease both;
}
@keyframes spot-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.cone {
  position: absolute;
  inset: 0;
  pointer-events: none;
  backdrop-filter: blur(5px) saturate(1.05);
  -webkit-backdrop-filter: blur(5px) saturate(1.05);
}
.fx {
  position: absolute;
  inset: 0;
  overflow: visible;
}
/* ビームとホットスポットは加算合成で「光」に見せる */
.beams,
.hotspot {
  mix-blend-mode: screen;
}
</style>
