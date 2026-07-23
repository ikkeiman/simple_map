<template>
  <!-- 絞り込みドロップダウン。えらんだカテゴリ「だけ」を地図に出す(足し算式)。
       未選択=すべて表示。だから "近くのコンビニだけ" が 1タップで済む -->
  <div class="fd-backdrop" @pointerdown.self="emit('close')">
    <div ref="panelEl" class="panel">
      <!-- すべて表示に戻す(選択が空のとき=これがアクティブ) -->
      <button type="button" class="row all" :class="{ off: selected.length > 0 }" @click="onTap($event, 'all')">
        <span class="badge all-badge"><span class="emoji">🗺️</span></span>
        <span class="lbl">すべて</span>
        <span class="check">{{ selected.length === 0 ? '✓' : '' }}</span>
      </button>
      <div class="sep"></div>
      <button
        v-for="item in PLACE_CATEGORIES"
        :key="item.id"
        type="button"
        class="row"
        :class="{ off: !selected.includes(item.id) }"
        @click="onTap($event, item.id)"
      >
        <span
          class="badge"
          :style="{ background: item.tint + '26', boxShadow: `inset 0 0 0 1.5px ${item.tint}55` }"
        >
          <span class="emoji">{{ item.icon }}</span>
        </span>
        <span class="lbl">{{ item.label }}</span>
        <span class="check" :style="{ color: item.tint }">{{ selected.includes(item.id) ? '✓' : '' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { PLACE_CATEGORIES } from '../../constants/hubConfig'
import { jellyPopIn, jellyTap } from '../../composables/useMoppoMotion'

defineProps({
  selected: { type: Array, required: true }, // 表示中のカテゴリ id(空=すべて)
})
const emit = defineEmits(['toggle', 'clear', 'close'])

// タップ演出(ぷにっ)を出しつつ、すべて=クリア / それ以外=トグル
const onTap = (e, id) => {
  jellyTap(e.currentTarget)
  if (id === 'all') emit('clear')
  else emit('toggle', id)
}

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
  width: 190px;
  max-height: 60vh;
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--hub-line);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  padding: 6px;
  transform-origin: 20% 0%;
}
.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: none;
  background: none;
  border-radius: 12px;
  font-family: var(--hub-font);
  font-size: 12.5px;
  font-weight: 600;
  color: #55504a;
  cursor: pointer;
}
.row:active {
  background: #f6f2ea;
}
.row.off {
  opacity: 0.42;
}
.row.all .lbl {
  font-weight: 800;
  color: #3a352b;
}
.row.all .check {
  color: #5b53a0;
}
.all-badge {
  background: #efe9dd;
  box-shadow: inset 0 0 0 1.5px #cfc6b3;
}
.sep {
  height: 1px;
  background: #efe9dd;
  margin: 4px 6px;
}
.badge {
  width: 30px;
  height: 30px;
  border-radius: 11px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.emoji {
  font-size: 15px;
  line-height: 1;
}
.lbl {
  flex: 1;
  text-align: left;
}
.check {
  font-weight: 800;
  font-size: 13px;
}
</style>
