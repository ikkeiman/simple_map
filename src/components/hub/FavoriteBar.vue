<template>
  <!-- 足元の★4スロット(1a の千鳥配置)。1〜3=自由枠 / 4=「ぜんぶ」固定席。
       つかんでいる間は沈める(★とドロップゾーンが同じ側にあり誤爆するため) -->
  <div ref="barEl" class="favorite-bar">
    <FavoriteSlot class="s1" :fav="favorites[0]" @activate="onSlot(0)" @longpress="onEdit(0)" />
    <FavoriteSlot class="s2" :fav="favorites[1]" @activate="onSlot(1)" @longpress="onEdit(1)" />
    <FavoriteSlot class="s3" :fav="favorites[2]" @activate="onSlot(2)" @longpress="onEdit(2)" />
    <FavoriteSlot class="s4" fixed @activate="emit('open-all')" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import gsap from 'gsap'
import FavoriteSlot from './FavoriteSlot.vue'
import { FAVORITES_STORAGE_KEY, DEFAULT_FAVORITES } from '../../constants/hubConfig'

const props = defineProps({
  sunk: { type: Boolean, default: false }, // つかんでいる間 true
})
const emit = defineEmits(['open-all', 'pick-for-slot', 'go'])

const favorites = ref(loadFavorites())

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* 壊れた保存データは初期値に戻す */
  }
  return structuredClone(DEFAULT_FAVORITES)
}

const save = () => localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites.value))

const onSlot = (index) => {
  const fav = favorites.value[index]
  if (fav) emit('go', fav.screen)
  else emit('pick-for-slot', index) // 空き枠 → 登録先を選ばせる
}

// 中身のある枠を長押し → 「ぜんぶ」画面(pick)で選び直し。空き枠登録と同じ経路を再利用
const onEdit = (index) => {
  if (favorites.value[index]) emit('pick-for-slot', index)
}

// 親(AllScreensSheet 経由)からの登録
const setSlot = (index, fav) => {
  favorites.value[index] = fav
  save()
}
defineExpose({ setSlot })

const barEl = ref(null)
// 沈む/浮くは GSAP で。透明度を下げて少し下へ
watch(
  () => props.sunk,
  (sunk) => {
    if (!barEl.value) return
    gsap.to(barEl.value, {
      y: sunk ? 16 : 0,
      opacity: sunk ? 0.25 : 1,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  },
)
</script>

<style scoped>
.favorite-bar {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}
.favorite-bar > * {
  position: absolute;
  pointer-events: auto;
}
/* 千鳥配置(1a): モッポを囲むように左右2段 */
.s1 {
  bottom: 108px;
  left: 16px;
}
.s2 {
  bottom: 62px;
  left: 64px;
}
.s3 {
  bottom: 62px;
  right: 60px;
}
.s4 {
  bottom: 110px;
  right: 12px;
}
</style>
