<template>
  <!-- 「モッポと はなす」扇メニュー。項目位置は親(MoppoHub)が持ち、ここは描くだけ。
       モッポは移動できない(はなす中はロック)。選択はアイコンのタップで行う。
       暗幕は親側にあり、モッポはその上=明るいまま。 -->
  <div class="talk-fan">
    <!-- モッポとはなす? バブル(扇より上・地図ピンとは別物とわかる大きめ＋顔チップ) -->
    <div v-if="bubblePos" class="ask" :style="{ left: `${bubblePos.x}px`, top: `${bubblePos.y}px` }">
      <span class="face"></span>モッポと はなす？
    </div>

    <button
      v-for="item in items"
      :key="item.id"
      ref="coinEls"
      type="button"
      class="cz"
      :style="{ left: `${item.x}px`, top: `${item.y}px` }"
      @click="emit('select', item.id)"
    >
      <span class="coin">{{ item.icon }}</span>
      <span class="clab">{{ item.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import gsap from 'gsap'
import { TALK_FAN } from '../../constants/hubConfig'

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ id, icon, label, x, y }](hub-local px)
})

const emit = defineEmits(['select'])

// バブルは扇の一番上・中央に置く
const bubblePos = computed(() => {
  if (!props.items.length) return null
  const xs = props.items.map((i) => i.x)
  const topY = Math.min(...props.items.map((i) => i.y))
  return { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: topY - 52 }
})

const coinEls = useTemplateRef('coinEls')

onMounted(() => {
  // 出現: モッポ中心から同一半径の円弧上へ、stagger + back.out で順に「ぷるん」
  gsap.fromTo(
    coinEls.value,
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)', stagger: TALK_FAN.popStagger, clearProps: 'scale' },
  )
})

onBeforeUnmount(() => {
  if (coinEls.value) gsap.killTweensOf(coinEls.value)
})
</script>

<style scoped>
.talk-fan {
  position: absolute;
  inset: 0;
  z-index: 29; /* 暗幕(26)より上、モッポ(30)より下 */
  pointer-events: none; /* チップだけ受ける。背景タップは親の暗幕が閉じる */
}
/* モッポとはなす? バブル */
.ask {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px 9px 11px;
  background: var(--hub-pill-bg);
  border-radius: 22px;
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.18);
  font-family: var(--hub-font-display, serif);
  font-weight: 800;
  font-size: 15px;
  color: var(--hub-ink);
  letter-spacing: 1px;
  white-space: nowrap;
  pointer-events: none;
}
/* 地図ピンの白ラベルと見分けるための、モッポ顔チップ */
.ask .face {
  width: 22px;
  height: 20px;
  flex: none;
  border-radius: 50% 50% 48% 48%;
  background: radial-gradient(60% 60% at 42% 34%, #f8f0dc, #e3d5b2);
  box-shadow: inset 0 -2px 3px rgba(150, 120, 78, 0.4);
  position: relative;
}
.ask .face::before,
.ask .face::after {
  content: '';
  position: absolute;
  top: 8px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #33261b;
}
.ask .face::before {
  left: 6px;
}
.ask .face::after {
  right: 6px;
}

.cz {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 0;
  font-family: var(--hub-font);
  cursor: pointer;
  pointer-events: auto; /* タップで選択 */
}
/* 展開中の項目は「実線・白丸・影」(破線サークルは待機中のモッポだけ) */
.coin {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fffdf8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
  transition: transform 0.18s ease, box-shadow 0.2s ease;
}
.cz:active .coin {
  transform: scale(0.92);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24);
}
/* ラベルは各アイコン真下・白チップ・必ず1行 */
.clab {
  font-size: 11px;
  font-weight: 700;
  color: #5a5142;
  background: rgba(255, 253, 248, 0.92);
  padding: 1px 8px;
  border-radius: 8px;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
</style>
