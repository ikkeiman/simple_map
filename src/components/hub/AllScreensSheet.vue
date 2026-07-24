<template>
  <!-- 全機能一覧「ぜんぶ」(1c)。11行き先を1画面で全部見せる。階層や検索は作らない。
       mode='pick' のときは★空き枠/選び直しの登録先選びとして使う(作る画面は1つ)。
       見た目はカラフルな付箋(sticky note)グリッド。GSAPで軽く出現させる。 -->
  <div class="sheet-backdrop" @pointerdown.self="emit('close')">
    <div ref="sheetEl" class="sheet">
      <div class="handle"></div>
      <div class="title">ぜんぶ</div>
      <div class="sub">{{ mode === 'pick' ? '★に追加する行き先を選ぶ' : '全機能一覧' }}</div>

      <!-- よく遊ぶ駅(モック)。★登録の選び直し中(pick)は関係ないので隠す -->
      <div v-if="mode !== 'pick'" class="stations">
        <div class="stations-head">
          <span class="stations-label">よく遊ぶ駅 <span class="count">({{ stationCount }}/{{ STATIONS_MAX }})</span></span>
          <button type="button" class="add" disabled>＋追加</button>
        </div>
        <div class="chips">
          <span v-for="st in DEFAULT_STATIONS" :key="st.id" class="chip">🚉 {{ st.label }}</span>
          <span class="chip more">›</span>
        </div>
      </div>

      <!-- 付箋グリッド(4列) -->
      <div class="grid">
        <button
          v-for="tile in tiles"
          :key="tile.id"
          ref="tileEls"
          type="button"
          class="note"
          :style="{ '--note-bg': tile.bg, '--note-ink': tile.ink }"
          @click="emit('select', tile.id)"
        >
          <span class="ic">{{ tile.icon }}</span>
          <span class="lb">{{ tile.label }}</span>
          <span class="fold"></span>
        </button>
      </div>

      <button type="button" class="close" @click="emit('close')">▽ 閉じる</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import gsap from 'gsap'
import { SCREENS, JELLY, DEFAULT_STATIONS, STATIONS_MAX, STICKY_PALETTE, STICKY_TILT, STICKY_MOTION, STICKY_PEEL } from '../../constants/hubConfig'

defineProps({
  mode: { type: String, default: 'browse' }, // 'browse' | 'pick'
})
const emit = defineEmits(['select', 'close'])

const stationCount = DEFAULT_STATIONS.length

// SCREENS を付箋化: 地色・文字色(パレット循環)＋傾き(index循環)を付ける
const tiles = computed(() =>
  Object.entries(SCREENS).map(([id, s], i) => ({
    id,
    ...s,
    ...STICKY_PALETTE[i % STICKY_PALETTE.length],
    rot: STICKY_TILT[i % STICKY_TILT.length],
  })),
)

const sheetEl = ref(null)
const tileEls = useTemplateRef('tileEls')
let ambient = [] // 常時ゆらす付箋のループtween(閉じる時に止める)

onMounted(() => {
  gsap.from(sheetEl.value, { yPercent: 100, duration: JELLY.popDuration, ease: 'back.out(1.1)' })
  const els = tileEls.value ?? []
  // 付箋の傾きは GSAP が所有する(CSS transform とは併用しない。併用すると揺れが打ち消される)。
  const baseRot = (i) => STICKY_TILT[i % STICKY_TILT.length]
  gsap.set(els, { rotation: (i) => baseRot(i), transformOrigin: '50% 50%' })
  // 出現: 控えめな stagger でふわっと(rotation は set 済みなので触らない)
  gsap.from(els, {
    y: STICKY_MOTION.y,
    autoAlpha: 0,
    scale: STICKY_MOTION.scaleFrom,
    duration: STICKY_MOTION.duration,
    ease: STICKY_MOTION.ease,
    stagger: STICKY_MOTION.stagger,
    delay: 0.08,
  })

  // 開くたびに完全ランダムで数枚だけ選び、右下の角だけを軽くめくる。付箋本体は動かさない。
  // めくれは「右下角を支点にした拡大縮小」のみ(回転・移動なし)なので、角から絶対にズレない。
  const order = els.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const { minCount, maxCount, scale, durMin, durMax } = STICKY_PEEL
  const k = Math.min(els.length, minCount + Math.floor(Math.random() * (maxCount - minCount + 1)))
  order.slice(0, k).forEach((idx) => {
    const fold = els[idx].querySelector('.fold')
    if (!fold) return
    const dur = durMin + Math.random() * (durMax - durMin)
    const delay = 0.3 + Math.random() * 0.8 // 出現が落ち着いてから、バラバラにめくれ始める
    ambient.push(
      gsap.fromTo(
        fold,
        { scale: 1 },
        {
          scale: scale * (0.9 + Math.random() * 0.2),
          duration: dur,
          delay,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          immediateRender: false,
        },
      ),
    )
  })
})

onBeforeUnmount(() => {
  ambient.forEach((t) => t.kill())
  ambient = []
})
</script>

<style scoped>
.sheet-backdrop {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: rgba(40, 34, 24, 0.25);
}
.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 86%;
  overflow-y: auto;
  background: #fbf8f2;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -3px 16px rgba(0, 0, 0, 0.12);
  padding: 14px 16px 18px;
}
.handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: #ddd4c2;
  margin: 0 auto 12px;
}
.title {
  font-family: var(--hub-font-display);
  font-weight: 700;
  font-size: 18px;
  color: #3a352b;
}
.sub {
  font-size: 10px;
  color: #9c8f78;
  margin: 2px 0 14px;
}

/* よく遊ぶ駅 */
.stations {
  margin-bottom: 16px;
}
.stations-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}
.stations-label {
  font-size: 12px;
  font-weight: 700;
  color: #6a5f4c;
}
.stations-label .count {
  font-weight: 500;
  color: #a99c85;
}
.add {
  border: none;
  background: none;
  font-family: var(--hub-font);
  font-size: 11px;
  font-weight: 600;
  color: #b08a4a;
}
.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.chips::-webkit-scrollbar {
  display: none;
}
.chip {
  flex: 0 0 auto;
  padding: 7px 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #ece4d5;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  font-size: 11px;
  font-weight: 600;
  color: #5a5142;
  white-space: nowrap;
}
.chip.more {
  padding: 7px 12px;
  color: #b7ac97;
  font-size: 15px;
  line-height: 1;
}

/* 付箋グリッド */
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 10px;
  margin-bottom: 18px;
}
.note {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden; /* めくれが角の外へはみ出さないための保険 */
  border: none;
  border-radius: 3px 3px 8px 3px;
  background: var(--note-bg);
  color: var(--note-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px;
  font-family: var(--hub-font);
  cursor: pointer;
  /* 傾き・ゆらぎは GSAP が transform を所有(CSS transform は置かない)。押し込み感は filter で */
  box-shadow: 0 3px 7px rgba(60, 50, 35, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transition: box-shadow 0.15s ease, filter 0.12s ease;
  will-change: transform;
}
/* 付箋のめくれた角(右下)。右下にピッタリ貼り付く 16px の箱の「右下半分」を影にした三角形。
   ボーダー三角形だと箱の外へはみ出して角からズレるため、実寸の箱＋グラデにしている。
   transform-origin を右下角に固定しているので、拡大しても角から絶対にズレない。 */
.fold {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  background: linear-gradient(to bottom right, transparent 0 50%, rgba(0, 0, 0, 0.13) 50% 100%);
  border-bottom-right-radius: 8px;
  transform-origin: 100% 100%;
  pointer-events: none;
  will-change: transform;
}
.note:active {
  filter: brightness(0.95);
  box-shadow: 0 1px 3px rgba(60, 50, 35, 0.2);
}
.ic {
  font-size: 22px;
  line-height: 1;
}
.lb {
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
}

/* 閉じる */
.close {
  display: block;
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 16px;
  background: #4a4335;
  color: #f7f1e3;
  font-family: var(--hub-font);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(74, 67, 53, 0.28);
}
.close:active {
  background: #3c362a;
}
</style>
