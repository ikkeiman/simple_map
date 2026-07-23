<template>
  <!-- 全機能一覧「ぜんぶ」(1c)。11行き先を1画面で全部見せる。階層や検索は作らない。
       mode='pick' のときは★空き枠への登録先選びとして使う(作る画面は1つ) -->
  <div class="sheet-backdrop" @pointerdown.self="emit('close')">
    <div ref="sheetEl" class="sheet">
      <div class="handle"></div>
      <div class="title">ぜんぶ</div>
      <div class="sub">{{ mode === 'pick' ? '★に追加する行き先を選ぶ' : '全機能一覧' }}</div>
      <div class="grid">
        <button
          v-for="(screen, id) in SCREENS"
          :key="id"
          type="button"
          class="tile"
          @click="emit('select', id)"
        >
          <span class="ic">{{ screen.icon }}</span>
          <span class="lb">{{ screen.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import gsap from 'gsap'
import { SCREENS, JELLY } from '../../constants/hubConfig'

defineProps({
  mode: { type: String, default: 'browse' }, // 'browse' | 'pick'
})
const emit = defineEmits(['select', 'close'])

const sheetEl = ref(null)
onMounted(() => {
  gsap.from(sheetEl.value, { yPercent: 100, duration: JELLY.popDuration, ease: 'back.out(1.1)' })
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
  max-height: 82%;
  overflow-y: auto;
  background: #fff;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -3px 16px rgba(0, 0, 0, 0.1);
  padding: 14px 16px 20px;
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
  font-size: 17px;
  color: #3a352b;
}
.sub {
  font-size: 10px;
  color: #9c8f78;
  margin: 2px 0 14px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.tile {
  aspect-ratio: 1;
  border: 1px solid #eae2d3;
  border-radius: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--hub-font);
  cursor: pointer;
}
.tile:active {
  background: #f6f2ea;
}
.ic {
  font-size: 22px;
}
.lb {
  font-size: 10px;
  font-weight: 500;
  color: #5a5142;
}
</style>
