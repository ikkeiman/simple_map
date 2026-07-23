<template>
  <!-- タップで開く「モッポと はなす」扇メニュー(2a)。項目は対話の4つだけ。
       一覧や設定を混ぜない(中央=対話という意味を守る) -->
  <div class="talk-fan" @pointerdown.self="emit('close')">
    <div class="pill">モッポと はなす？</div>
    <button
      v-for="(item, i) in items"
      :key="item.id"
      ref="coinEls"
      type="button"
      class="cz"
      :style="coinStyle(i)"
      @click="emit('select', item.id)"
    >
      <span class="coin">{{ item.icon }}</span>
      <span class="clab">{{ item.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { onMounted, useTemplateRef } from 'vue'
import { SCREENS, TALK_ITEMS } from '../../constants/hubConfig'
import { jellyPopIn } from '../../composables/useMoppoMotion'

const emit = defineEmits(['select', 'close'])

const items = TALK_ITEMS.map((id) => ({ id, ...SCREENS[id] }))

// モッポ(足元中央)を囲む扇形。内側2枚+外側2枚(ワイヤーフレーム 2a の配置)
const LAYOUT = [
  { x: 0.33, y: 0.66 },
  { x: 0.67, y: 0.66 },
  { x: 0.14, y: 0.8 },
  { x: 0.86, y: 0.8 },
]
const coinStyle = (i) => ({ left: `${LAYOUT[i].x * 100}%`, top: `${LAYOUT[i].y * 100}%` })

const coinEls = useTemplateRef('coinEls')
onMounted(() => jellyPopIn(coinEls.value))
</script>

<style scoped>
.talk-fan {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(60, 52, 38, 0.08);
}
.pill {
  position: absolute;
  top: 58%;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  background: var(--hub-pill-bg);
  border-radius: 22px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  font-weight: 700;
  font-size: 14px;
  color: var(--hub-ink);
  letter-spacing: 1px;
  white-space: nowrap;
  pointer-events: none;
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
  font-family: var(--hub-font);
  cursor: pointer;
}
.coin {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px dashed #c4b79b;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  box-shadow: 0 3px 9px rgba(0, 0, 0, 0.1);
}
.clab {
  font-size: 11px;
  font-weight: 600;
  color: #5a5142;
}
</style>
