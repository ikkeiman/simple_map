<template>
  <!-- 上部の場所検索バー + 絞り込み/ピンの登録先(1a)。昼のみ表示。
       絞り込みは地図ピンの表示切替、ピンの登録先は 未定⇄日付 のトグル+カレンダー入力 -->
  <div class="search-area">
    <div class="search-bar">
      <span class="loupe"></span>
      <span class="ph">エリア・スポットを検索</span>
    </div>

    <div class="dropdown-row">
      <!-- 絞り込み -->
      <button type="button" class="filter-chip" @click="filterOpen = !filterOpen">
        <span class="t">絞り込み</span>
        <span class="caret">▾</span>
      </button>

      <!-- ピンの登録先: くぼんだ箱の中で 未定⇄日付 を切替。カレンダーで日付を選ぶ -->
      <div class="pin-box" role="group" aria-label="ピンの登録先">
        <div class="pin-main">
          <button type="button" class="seg" :class="{ on: mode === 'unset' }" @click="mode = 'unset'">未定</button>
          <button type="button" class="seg date" :class="{ on: mode === 'date' }" @click="onDateSegment">
            <svg class="cal-icon" viewBox="0 0 20 20" aria-hidden="true">
              <rect x="2.5" y="4" width="15" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6" />
              <line x1="2.5" y1="8.2" x2="17.5" y2="8.2" stroke="currentColor" stroke-width="1.6" />
              <line x1="6.5" y1="2.2" x2="6.5" y2="5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <line x1="13.5" y1="2.2" x2="13.5" y2="5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <span class="dt">{{ dateLabel }}</span>
          </button>
        </div>
        <div class="pin-caption">⇆ タップで切替 ・ カレンダーから えらぶ</div>
      </div>
    </div>

    <FilterDropdown v-if="filterOpen" :selected="selected" @toggle="toggleColor" @close="filterOpen = false" />
    <PinDatePicker v-if="calendarOpen" :date="pinDate" @pick="onPick" @close="calendarOpen = false" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import FilterDropdown from './FilterDropdown.vue'
import PinDatePicker from './PinDatePicker.vue'
import { PRIORITY_LEGEND, DEFAULT_PIN_DATE } from '../../constants/hubConfig'

const emit = defineEmits(['filter-change'])

// ---- 絞り込み(表示する優先度カラー) ----
const filterOpen = ref(false)
const selected = ref(PRIORITY_LEGEND.map((item) => item.color))
const toggleColor = (color) => {
  selected.value = selected.value.includes(color)
    ? selected.value.filter((c) => c !== color)
    : [...selected.value, color]
  emit('filter-change', selected.value)
}

// ---- ピンの登録先 ----
const mode = ref('date') // 'date' | 'unset'
const pinDate = ref({ ...DEFAULT_PIN_DATE })
const calendarOpen = ref(false)
const dateLabel = computed(() => `${pinDate.value.m}月${pinDate.value.d}日`)

// 日付セグメント: 未定中なら日付へ切替、すでに日付ならカレンダーを開く
const onDateSegment = () => {
  if (mode.value === 'unset') {
    mode.value = 'date'
    return
  }
  calendarOpen.value = true
}
const onPick = (date) => {
  pinDate.value = date
  mode.value = 'date'
  calendarOpen.value = false
}
</script>

<style scoped>
.search-area {
  position: absolute;
  top: 12px;
  left: 14px;
  right: 14px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.search-bar {
  height: 40px;
  background: #fff;
  border: 1px solid #d8d2c6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.loupe {
  width: 13px;
  height: 13px;
  border: 1.5px solid var(--hub-ink-soft);
  border-radius: 50%;
  position: relative;
}
.loupe::after {
  content: '';
  position: absolute;
  right: -4px;
  bottom: -3px;
  width: 5px;
  height: 1.5px;
  background: var(--hub-ink-soft);
  transform: rotate(45deg);
}
.ph {
  font-size: 12px;
  font-weight: 500;
  color: var(--hub-ink-soft);
}
.dropdown-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
/* 絞り込み: 白いピル */
.filter-chip {
  flex: none;
  height: 46px;
  min-width: 118px;
  background: #fff;
  border: none;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  font-family: var(--hub-font);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
}
.filter-chip .t {
  font-size: 13px;
  font-weight: 700;
  color: #55504a;
}
.filter-chip .caret {
  font-size: 10px;
  color: var(--hub-ink-soft);
}
/* ピンの登録先: くぼんだ箱 */
.pin-box {
  flex: 1;
  background: #e5ddcd;
  border-radius: 16px;
  box-shadow:
    inset 0 2px 5px rgba(96, 82, 58, 0.16),
    inset 0 -1px 0 rgba(255, 255, 255, 0.5);
  padding: 6px 10px 7px;
}
.pin-main {
  display: flex;
  align-items: center;
  gap: 8px;
}
.seg {
  border: none;
  background: none;
  border-radius: 12px;
  padding: 5px 12px;
  font-family: var(--hub-font);
  font-size: 13px;
  font-weight: 700;
  color: #8a8070;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
.seg.on {
  background: #fff;
  color: #3a352b;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.12);
}
.cal-icon {
  width: 17px;
  height: 17px;
  color: #6a5f4a;
}
.pin-caption {
  margin-top: 3px;
  font-size: 9px;
  font-weight: 500;
  color: #9a8f7a;
  letter-spacing: 0.5px;
  text-align: center;
  white-space: nowrap;
}
</style>
