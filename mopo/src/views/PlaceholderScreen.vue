<template>
  <div class="placeholder">
    <div class="icon">{{ screen.icon }}</div>
    <h1>{{ screen.label }}</h1>
    <p>この画面はプレースホルダです</p>
    <button type="button" @click="router.back()">← もどる</button>
  </div>
</template>

<script setup>
// 遷移先11種の共通プレースホルダ。タイトルと戻るボタンだけ(仕様書 §8)
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SCREENS } from '../constants/hubConfig'

const route = useRoute()
const router = useRouter()
const screen = computed(() => SCREENS[route.params.id] ?? { icon: '❓', label: route.params.id })
</script>

<style scoped>
.placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--hub-bg);
}
.icon {
  font-size: 56px;
}
h1 {
  font-family: var(--hub-font-display);
  font-size: 26px;
  color: var(--hub-ink);
}
p {
  font-size: 12px;
  color: var(--hub-ink-soft);
}
button {
  margin-top: 16px;
  padding: 10px 26px;
  border-radius: 22px;
  border: 1.5px solid var(--hub-line);
  background: var(--hub-pill-bg);
  font-family: var(--hub-font);
  font-weight: 700;
  font-size: 13px;
  color: var(--hub-ink);
  cursor: pointer;
}
</style>
