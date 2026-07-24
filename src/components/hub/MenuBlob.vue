<template>
  <!-- 展開メニューの下に敷く「角中心のグロー」。境目のない放射グラデを重ね、GSAPで漂わせて
       ゆらゆら揺らす。色は側で違う(きろく=青 / あそぶ=橙)。座標は hub-local px。 -->
  <div class="menu-glow" :class="side">
    <div v-for="i in 3" :key="i" ref="layerEls" class="layer" :style="layerStyle"></div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  x: { type: Number, required: true }, // 角の位置(hub-local px)
  y: { type: Number, required: true },
  r: { type: Number, required: true }, // グロー半径(アイコンの少し外)
  side: { type: String, default: 'right' }, // 'left'=きろく(青) / 'right'=あそぶ(橙)
})

// 各レイヤーは角を中心にした大きな円。放射グラデが端で透明になり境目が出ない
const layerStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
  width: `${props.r * 2}px`,
  height: `${props.r * 2}px`,
  marginLeft: `${-props.r}px`,
  marginTop: `${-props.r}px`,
}))

const layerEls = useTemplateRef('layerEls')
let tweens = []

onMounted(() => {
  const els = layerEls.value
  if (!els?.length) return
  gsap.set(els, { transformOrigin: '50% 50%' })
  // 出現・消滅の「角からじんわり / 角へすぼむ」演出は親(DropZones)の <Transition> が担当。
  // ここは各層を別々の周期で漂わせるだけ(x/y/scale をバラバラの周期で = 有機的な揺らぎ)。
  const cfgs = [
    { dx: 20, dy: -15, s: 1.12, tx: 3.6, ty: 4.6, ts: 5.4 },
    { dx: -17, dy: 13, s: 0.9, tx: 4.4, ty: 3.5, ts: 6.2 },
    { dx: 11, dy: 18, s: 1.06, tx: 5.1, ty: 4.1, ts: 4.8 },
  ]
  els.forEach((el, i) => {
    const c = cfgs[i]
    tweens.push(gsap.to(el, { x: c.dx, duration: c.tx, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
    tweens.push(gsap.to(el, { y: c.dy, duration: c.ty, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
    tweens.push(gsap.to(el, { scale: c.s, duration: c.ts, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
  })
})

onBeforeUnmount(() => {
  tweens.forEach((t) => t.kill())
  tweens = []
})
</script>

<style scoped>
.menu-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.layer {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
}
/* きろく=青 / あそぶ=橙。単一色の透明フェード = 色の境目が出ない */
.menu-glow.left .layer {
  background: radial-gradient(circle, rgba(111, 160, 221, 0.6) 0%, rgba(111, 160, 221, 0.32) 55%, rgba(111, 160, 221, 0) 100%);
}
.menu-glow.right .layer {
  background: radial-gradient(circle, rgba(221, 154, 92, 0.62) 0%, rgba(221, 154, 92, 0.34) 55%, rgba(221, 154, 92, 0) 100%);
}
</style>
