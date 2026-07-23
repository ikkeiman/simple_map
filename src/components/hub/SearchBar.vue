<template>
  <!-- 上部の場所検索バー + 絞り込み/ピンの登録先(1a)。昼のみ表示。
       絞り込みは地図ピンの表示切替、ピンの登録先は 未定⇄日付 のトグル+カレンダー入力 -->
  <div class="search-area">
    <div class="search-bar">
      <span class="loupe"></span>
      <span class="ph">エリア・スポットを検索</span>
    </div>

    <div class="dropdown-row">
      <!-- 絞り込み: 現在の絞り込み状態をラベルに出す(未選択なら「絞り込み」) -->
      <button type="button" class="filter-chip" :class="{ active: selected.length > 0 }" @click="filterOpen = !filterOpen">
        <span v-if="filterIcon" class="fi">{{ filterIcon }}</span>
        <span class="t">{{ filterLabel }}</span>
        <span class="caret">▾</span>
      </button>

      <!-- ピンの登録先: くぼんだ箱の中で 未定⇄日付 を切替。カレンダーで日付を選ぶ -->
      <div class="pin-box" role="group" aria-label="ピンの登録先">
        <div ref="pinMainEl" class="pin-main">
          <!-- 白いハイライトが「すーっ」と滑って現在のセグメントに付く -->
          <div ref="segIndicatorEl" class="seg-indicator"></div>
          <button ref="unsetSegEl" type="button" class="seg" :class="{ on: mode === 'unset' }" @click="onUnsetSegment">未定</button>
          <button ref="dateSegEl" type="button" class="seg date" :class="{ on: mode === 'date' }" @click="onDateSegment">
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

    <FilterDropdown
      v-if="filterOpen"
      :selected="selected"
      @toggle="toggleCategory"
      @clear="clearFilter"
      @close="filterOpen = false"
    />
    <PinDatePicker
      v-if="calendarOpen"
      :date="pinDate"
      :recent="recentDates"
      @pick="onPick"
      @close="calendarOpen = false"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import FilterDropdown from './FilterDropdown.vue'
import PinDatePicker from './PinDatePicker.vue'
import { jellyTap } from '../../composables/useMoppoMotion'
import {
  PLACE_CATEGORIES,
  DEFAULT_PIN_DATE,
  RECENT_DATES_STORAGE_KEY,
  RECENT_DATES_MAX,
  DEFAULT_RECENT_DATES,
} from '../../constants/hubConfig'

const emit = defineEmits(['filter-change'])

// ---- 絞り込み(えらんだカテゴリ「だけ」表示。空=すべて) ----
// 「近くのコンビニだけ」を 1タップで実現するため、全チェックからの引き算ではなく
// 空(=すべて)からの足し算にしている
const filterOpen = ref(false)
const selected = ref([]) // カテゴリ id の配列。空ならすべて表示
const toggleCategory = (id) => {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((c) => c !== id)
    : [...selected.value, id]
  emit('filter-change', selected.value)
}
const clearFilter = () => {
  selected.value = []
  emit('filter-change', selected.value)
}
// チップに出す現在の絞り込み表示
const filterLabel = computed(() => {
  if (selected.value.length === 0) return '絞り込み'
  const first = PLACE_CATEGORIES.find((c) => c.id === selected.value[0])
  const name = first?.label ?? ''
  return selected.value.length === 1 ? name : `${name} 他${selected.value.length - 1}`
})
const filterIcon = computed(() =>
  selected.value.length === 1 ? PLACE_CATEGORIES.find((c) => c.id === selected.value[0])?.icon ?? '' : '',
)

// ---- ピンの登録先 ----
const mode = ref('date') // 'date' | 'unset'
const pinDate = ref({ ...DEFAULT_PIN_DATE })
const calendarOpen = ref(false)
const dateLabel = computed(() => `${pinDate.value.m}月${pinDate.value.d}日`)

// ---- スライドするハイライト(未定⇄日付) ----
const pinMainEl = ref(null)
const segIndicatorEl = ref(null)
const unsetSegEl = ref(null)
const dateSegEl = ref(null)
// アクティブなセグメントの位置・幅へインジケーターを動かす。
// animate=true なら power3.out で「すーっ」と滑る(移動距離に応じて自然減速)
const moveIndicator = (animate = true) => {
  const el = mode.value === 'unset' ? unsetSegEl.value : dateSegEl.value
  if (!el || !segIndicatorEl.value) return
  const to = { x: el.offsetLeft, width: el.offsetWidth }
  if (animate) gsap.to(segIndicatorEl.value, { ...to, duration: 0.42, ease: 'power3.out', overwrite: 'auto' })
  else gsap.set(segIndicatorEl.value, to)
}
onMounted(() => nextTick(() => moveIndicator(false))) // 初期位置は無音で合わせる
watch(mode, () => nextTick(() => moveIndicator(true)))
// 日付の桁数が変わるとセグメント幅も変わるので、日付モード表示中は追従させる
watch(dateLabel, () => {
  if (mode.value === 'date') nextTick(() => moveIndicator(true))
})

// ---- 最近使用した日付(localStorage 保存) ----
const loadRecent = () => {
  try {
    const raw = localStorage.getItem(RECENT_DATES_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // パース失敗時は既定値にフォールバック
  }
  return DEFAULT_RECENT_DATES.map((d) => ({ ...d }))
}
const recentDates = ref(loadRecent())
const sameDate = (a, b) => a.y === b.y && a.m === b.m && a.d === b.d
const pushRecent = (date) => {
  // 既存を除いて先頭へ。上限を超えたら古いものを落とす
  recentDates.value = [date, ...recentDates.value.filter((d) => !sameDate(d, date))].slice(0, RECENT_DATES_MAX)
  try {
    localStorage.setItem(RECENT_DATES_STORAGE_KEY, JSON.stringify(recentDates.value))
  } catch {
    // 保存できなくても選択は成立させる
  }
}

// 未定セグメント: ぷにっと潰して未定へ
const onUnsetSegment = (e) => {
  jellyTap(e.currentTarget)
  mode.value = 'unset'
}
// 日付セグメント: 未定中なら日付へ切替(ぷにっ)、すでに日付ならカレンダーを開く
const onDateSegment = (e) => {
  jellyTap(e.currentTarget)
  if (mode.value === 'unset') {
    mode.value = 'date'
    return
  }
  calendarOpen.value = true
}
const onPick = (date) => {
  pinDate.value = date
  mode.value = 'date'
  pushRecent(date)
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
.filter-chip .fi {
  font-size: 15px;
  line-height: 1;
}
.filter-chip .t {
  font-size: 13px;
  font-weight: 700;
  color: #55504a;
  white-space: nowrap;
}
.filter-chip .caret {
  font-size: 10px;
  color: var(--hub-ink-soft);
}
/* 絞り込み中は色を付けて「効いている」ことを示す */
.filter-chip.active {
  box-shadow: 0 2px 8px rgba(91, 83, 160, 0.22);
}
.filter-chip.active .t {
  color: #4b4590;
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
  position: relative; /* seg-indicator の基準 */
  display: flex;
  align-items: center;
  gap: 8px;
}
/* 現在のセグメントに滑ってくる白いハイライト(位置/幅は GSAP が動かす) */
.seg-indicator {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.12);
  pointer-events: none;
}
.seg {
  position: relative; /* インジケーターの上に文字を出す */
  z-index: 1;
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
  transition: color 0.3s ease; /* 文字色は「すーっ」と馴染ませる */
}
.seg.on {
  color: #3a352b;
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
