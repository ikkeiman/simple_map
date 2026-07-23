<template>
  <!-- 絞り込みドロップダウン。優先度ごとに地図ピンの表示/非表示を切り替える -->
  <div class="fd-backdrop" @pointerdown.self="emit('close')">
    <div ref="panelEl" class="panel">
      <button
        v-for="item in PRIORITY_LEGEND"
        :key="item.color"
        type="button"
        class="row"
        :class="{ off: !selected.includes(item.color) }"
        @click="emit('toggle', item.color)"
      >
        <span class="dot" :style="{ background: item.color }"></span>
        <span class="lbl">{{ item.label }}</span>
        <span class="check">{{ selected.includes(item.color) ? '✓' : '' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { PRIORITY_LEGEND } from '../../constants/hubConfig'
import { jellyPopIn } from '../../composables/useMoppoMotion'

defineProps({
  selected: { type: Array, required: true }, // 表示中の優先度カラー
})
const emit = defineEmits(['toggle', 'close'])

const panelEl = ref(null)
onMounted(() => jellyPopIn(panelEl.value, { stagger: 0 }))
</script>

<style scoped>
.fd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.panel {
  position: absolute;
  top: 128px; /* 絞り込みチップの真下 */
  left: 14px;
  width: 150px;
  background: #fff;
  border: 1px solid var(--hub-line);
  border-radius: 14px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
  padding: 6px;
  transform-origin: 20% 0%;
}
.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: none;
  background: none;
  border-radius: 10px;
  font-family: var(--hub-font);
  font-size: 12px;
  font-weight: 600;
  color: #55504a;
  cursor: pointer;
}
.row:active {
  background: #f6f2ea;
}
.row.off {
  opacity: 0.4;
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}
.lbl {
  flex: 1;
  text-align: left;
}
.check {
  color: #3f8f7f;
  font-weight: 700;
}
</style>
