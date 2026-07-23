<template>
  <!-- ⑨ るすの席。モッポが探索に出ている間、席に置く からっぽの ざぶとん＋「るす」木札。
       ただの飾りではなく、ここをタップ/つかむと通常どおりナビが起動する(席の機能を保持)。
       判定は useMoppoGesture、遷移の判断は親(MoppoHub)が行う。 -->
  <div ref="rootEl" class="cushion-root">
    <div ref="bodyEl" class="cushion-body">
      <div class="cushion">
        <div class="dent"></div>
        <div class="seam"></div>
      </div>
      <div class="fuda"><span>るす</span></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useMoppoGesture } from '../../composables/useMoppoGesture'
import { useMoppoMotion, jellyTap } from '../../composables/useMoppoMotion'

// モッポと同じジェスチャーを emit。親は onTap/onGrab/onDrag/onRelease にそのまま流せる
const emit = defineEmits(['grab', 'drag', 'release', 'tap'])

const rootEl = ref(null)
const bodyEl = ref(null)
const motion = useMoppoMotion(bodyEl) // 探索中は「るす木札を動かして操作する」= ざぶとんが指に追従

const gesture = useMoppoGesture(rootEl, {
  onGrab: () => {
    motion.startFollow() // つまむと指に追従(ゼリー質感)
    emit('grab')
  },
  onDrag: (p) => {
    motion.followTo(p.dx, p.dy) // 指の変位ぶん動かす。mx/my は付けない → 親は p.x/p.y で判定
    emit('drag', p)
  },
  onRelease: (p) => {
    motion.returnHome() // 離すと定位置(席)へぷるんと戻る
    emit('release', p)
  },
  onTap: () => {
    jellyTap(bodyEl.value) // ぷにっ
    emit('tap')
  },
})

onMounted(() => gesture.attach())
</script>

<style scoped>
.cushion-root {
  position: absolute;
  bottom: 26px;
  left: 50%;
  margin-left: -46px; /* モッポの席と同じ定位置 */
  width: 92px;
  height: 92px;
  z-index: 28; /* モッポ(30)より下、★お気に入り(20)より上 */
  touch-action: none;
  cursor: grab;
}
.cushion-root:active {
  cursor: grabbing;
}
.cushion-body {
  position: absolute;
  inset: 0;
  will-change: transform;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
/* ゼリー質感の丸ざぶとん。やわらかい陰影＋接地影 */
.cushion {
  position: relative;
  width: 84px;
  height: 46px;
  border-radius: 50%;
  background: radial-gradient(60% 70% at 42% 32%, #f3e9d3 0%, #e7d6b4 55%, #d3bd93 100%);
  box-shadow: 0 8px 14px rgba(120, 96, 60, 0.28), inset 0 -4px 8px rgba(150, 120, 78, 0.35),
    inset 0 3px 6px rgba(255, 253, 244, 0.6);
}
/* 中央のへこみ(だれか座っていた跡) */
.dent {
  position: absolute;
  top: 34%;
  left: 50%;
  width: 46px;
  height: 16px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(150, 120, 78, 0.4), rgba(150, 120, 78, 0));
}
/* ふちの縫い目 */
.seam {
  position: absolute;
  inset: 6px 8px;
  border-radius: 50%;
  border: 1.5px dashed rgba(150, 120, 78, 0.45);
}
/* 「るす」木札。ざぶとんの上にちょこんと立てかける */
.fuda {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(-4deg);
  padding: 3px 10px 4px;
  background: linear-gradient(#c79a63, #b5824f);
  border: 1.5px solid #9c6c3f;
  border-radius: 5px;
  box-shadow: 0 3px 6px rgba(90, 60, 30, 0.35);
}
.fuda span {
  font-family: var(--hub-font-display, serif);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #4a3420;
}
</style>
