<template>
  <!-- 上部の場所検索バー + 絞り込み/ピン登録先ドロップダウン(1a)。昼のみ表示 -->
  <div class="search-area">
    <div class="search-bar">
      <span class="loupe"></span>
      <span class="ph">エリア・スポットを検索</span>
    </div>
    <div class="dropdown-row">
      <button type="button" class="drop">
        <span class="t">絞り込み</span>
        <span class="caret">▾</span>
      </button>
      <button type="button" class="drop plan">
        <span class="stack"><span class="cap">ピンの登録先</span><span class="val">10月20日(火)</span></span>
        <span class="caret purple">▾</span>
      </button>
    </div>
  </div>
</template>

<script setup>
// 見た目のみのプレースホルダ。検索・絞り込みの実処理は本実装の範囲外
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
  gap: 8px;
}
.drop {
  flex: 1;
  height: 38px;
  background: #fff;
  border: 1px solid var(--hub-line);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 11px;
  font-family: var(--hub-font);
  cursor: pointer;
}
.drop.plan {
  border-color: #7b73b0;
}
.t {
  font-size: 11px;
  font-weight: 600;
  color: #55504a;
}
.caret {
  font-size: 10px;
  color: var(--hub-ink-soft);
}
.caret.purple {
  color: #8479c9;
}
.stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.15;
}
.cap {
  font-size: 8px;
  font-weight: 500;
  color: var(--hub-ink-soft);
}
.val {
  font-size: 11px;
  font-weight: 700;
  color: #5b53a0;
}
</style>
