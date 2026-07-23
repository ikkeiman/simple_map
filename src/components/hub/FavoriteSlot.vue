<template>
  <!-- ★スロット1個分。fav=null は空き枠(＋)、fixed は「ぜんぶ」固定席 -->
  <button type="button" class="slot" :class="{ empty: !fav && !fixed, fixed }" @click="emit('activate')">
    <span class="tile">{{ tileIcon }}</span>
    <span class="lbl">{{ label }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  fav: { type: Object, default: null }, // { icon, label, screen } | null
  fixed: { type: Boolean, default: false }, // 「ぜんぶ」= 削除・移動・上書き不可の固定席
})
const emit = defineEmits(['activate'])

const tileIcon = computed(() => (props.fixed ? '📚' : (props.fav?.icon ?? '＋')))
const label = computed(() => (props.fixed ? 'ぜんぶ' : (props.fav?.label ?? 'とうろく')))
</script>

<style scoped>
.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  font-family: var(--hub-font);
  cursor: pointer;
}
.tile {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid var(--hub-line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
.lbl {
  font-size: 9px;
  font-weight: 500;
  color: #6a655c;
}
.empty .tile {
  border: 1.5px dashed #b9b2a2;
  background: rgba(255, 255, 255, 0.6);
  color: #8a8272;
  font-size: 16px;
}
.empty .lbl {
  color: #8a8272;
}
.fixed .tile {
  border: 1.5px dashed #a99ec9;
  background: #f1eef6;
  border-radius: 50%;
}
.fixed .lbl {
  color: #6a5fa0;
}
</style>
