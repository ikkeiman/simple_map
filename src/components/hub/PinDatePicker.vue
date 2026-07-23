<template>
  <!-- ピンの登録先をカレンダーから選ぶポップオーバー -->
  <div class="cal-backdrop" @pointerdown.self="emit('close')">
    <div ref="panelEl" class="panel">
      <!-- 最近使用した日付のクイック選択(カレンダーの上) -->
      <div v-if="recent.length" class="recent">
        <span class="recent-label">最近の日付</span>
        <div class="recent-chips">
          <button
            v-for="(r, i) in recent"
            :key="`${r.y}-${r.m}-${r.d}-${i}`"
            type="button"
            class="chip"
            :class="{ on: isSelected(r.d) && r.y === date.y && r.m === date.m }"
            @click="emit('pick', { y: r.y, m: r.m, d: r.d })"
          >
            {{ r.m }}月{{ r.d }}日
          </button>
        </div>
      </div>
      <div class="head">
        <button type="button" class="nav" @click="moveMonth(-1)">‹</button>
        <span class="ym">{{ view.y }}年 {{ view.m }}月</span>
        <button type="button" class="nav" @click="moveMonth(1)">›</button>
      </div>
      <div class="grid">
        <span v-for="w in WEEKDAYS" :key="w" class="wd">{{ w }}</span>
        <button
          v-for="(cell, i) in cells"
          :key="i"
          type="button"
          class="day"
          :class="{ blank: !cell, on: isSelected(cell) }"
          :disabled="!cell"
          @click="cell && emit('pick', { y: view.y, m: view.m, d: cell })"
        >
          {{ cell ?? '' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { WEEKDAYS } from '../../constants/hubConfig'
import { jellyPopIn } from '../../composables/useMoppoMotion'

const props = defineProps({
  date: { type: Object, required: true }, // { y, m, d } 選択中の日付
  recent: { type: Array, default: () => [] }, // 最近使用した日付 [{ y, m, d }]
})
const emit = defineEmits(['pick', 'close'])

const view = ref({ y: props.date.y, m: props.date.m })

const moveMonth = (delta) => {
  let { y, m } = view.value
  m += delta
  if (m < 1) {
    m = 12
    y--
  } else if (m > 12) {
    m = 1
    y++
  }
  view.value = { y, m }
}

// 月初の曜日ぶん空セルを詰めてから 1〜末日
const cells = computed(() => {
  const first = new Date(view.value.y, view.value.m - 1, 1)
  const daysInMonth = new Date(view.value.y, view.value.m, 0).getDate()
  return [...Array(first.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
})
const isSelected = (d) => d && view.value.y === props.date.y && view.value.m === props.date.m && d === props.date.d

const panelEl = ref(null)
onMounted(() => jellyPopIn(panelEl.value, { stagger: 0 }))
</script>

<style scoped>
.cal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.panel {
  position: absolute;
  top: 148px; /* ピンの登録先ボックスの真下 */
  right: 14px;
  width: 248px;
  background: #fff;
  border: 1px solid var(--hub-line);
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
  padding: 10px 12px 12px;
  transform-origin: 80% 0%;
}
.recent {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #efe9dd;
}
.recent-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: var(--hub-ink-soft);
  margin-bottom: 6px;
}
.recent-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border: 1px solid #e0d8c8;
  background: #f7f3ea;
  border-radius: 10px;
  padding: 5px 10px;
  font-family: var(--hub-font);
  font-size: 11px;
  font-weight: 700;
  color: #5a5342;
  cursor: pointer;
}
.chip:active {
  background: #efe8db;
}
.chip.on {
  background: #5b53a0;
  border-color: #5b53a0;
  color: #fff;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.ym {
  font-size: 12px;
  font-weight: 700;
  color: #3a352b;
}
.nav {
  width: 28px;
  height: 28px;
  border: none;
  background: #f4efe6;
  border-radius: 9px;
  font-size: 15px;
  color: #6a5f4a;
  cursor: pointer;
  font-family: var(--hub-font);
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.wd {
  text-align: center;
  font-size: 9px;
  font-weight: 600;
  color: var(--hub-ink-soft);
  padding: 3px 0;
}
.day {
  aspect-ratio: 1;
  border: none;
  background: none;
  border-radius: 50%;
  font-family: var(--hub-font);
  font-size: 11px;
  font-weight: 600;
  color: #4a4335;
  cursor: pointer;
}
.day:not(.blank):active {
  background: #f6f2ea;
}
.day.on {
  background: #5b53a0;
  color: #fff;
}
.day.blank {
  cursor: default;
}
</style>
