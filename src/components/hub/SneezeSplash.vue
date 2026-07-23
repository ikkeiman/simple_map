<template>
  <!-- くしゃみの飛沫演出。💦が飛び散り、数滴が画面(ガラス)に貼り付いて、
       一拍おいてからスーッと垂れて消える。表示だけの使い捨てレイヤー -->
  <div ref="rootEl" class="sneeze-splash">
    <!-- 飛び散る飛沫 -->
    <span
      v-for="p in spray"
      :key="`s${p.id}`"
      ref="sprayEls"
      class="spray"
      :style="{ left: origin.x + 'px', top: origin.y + 'px', fontSize: p.size + 'px' }"
    >{{ p.emoji }}</span>

    <!-- 画面に貼り付く滴(+垂れた跡) -->
    <div v-for="d in drops" :key="`d${d.id}`" class="drop-wrap" :style="{ left: d.x + 'px', top: d.y + 'px' }">
      <div ref="trailEls" class="trail"></div>
      <div ref="dropEls" class="drop" :style="{ transform: `scale(${d.scale})` }">
        <div class="shape"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import gsap from 'gsap'
import { SNEEZE_SPLASH, JELLY } from '../../constants/hubConfig'

const props = defineProps({
  origin: { type: Object, required: true }, // 飛沫の発生点(モッポの顔) hub座標(px)
})
const emit = defineEmits(['done'])

const rand = gsap.utils.random

// 飛沫: 顔から下向きの扇に飛び散る
const spray = Array.from({ length: SNEEZE_SPLASH.sprayCount }, (_, id) => ({
  id,
  emoji: SNEEZE_SPLASH.sprayEmojis[id % SNEEZE_SPLASH.sprayEmojis.length],
  size: rand(13, 26),
}))

// 貼り付く滴: 顔のまわりにばらけた固定位置
const drops = Array.from({ length: SNEEZE_SPLASH.stickCount }, (_, id) => ({
  id,
  x: props.origin.x + rand(-SNEEZE_SPLASH.stickSpreadX, SNEEZE_SPLASH.stickSpreadX),
  y: props.origin.y + rand(SNEEZE_SPLASH.stickSpreadY[0], SNEEZE_SPLASH.stickSpreadY[1]),
  scale: rand(0.8, 1.3),
}))

const rootEl = ref(null)
const sprayEls = useTemplateRef('sprayEls')
const dropEls = useTemplateRef('dropEls')
const trailEls = useTemplateRef('trailEls')

let tl = null
onMounted(() => {
  tl = gsap.timeline({ onComplete: () => emit('done') })

  // 1. 💦が放射状に飛び散る(少し飛んでから重力で落ちる)
  sprayEls.value?.forEach((el) => {
    const angle = rand(-0.25, 1.25) * Math.PI // 左右〜下方向の扇
    const dist = rand(60, 170)
    const px = Math.cos(angle) * dist
    const py = Math.sin(angle) * dist * 0.6
    tl.to(el, { x: px, y: py, rotation: rand(-90, 90), duration: 0.32, ease: 'power2.out' }, 0)
    tl.to(el, { y: py + rand(40, 90), opacity: 0, scale: 0.6, duration: 0.45, ease: 'power1.in' }, 0.3)
  })

  // 2. 滴がベチャッと画面に貼り付く
  dropEls.value?.forEach((el, i) => {
    tl.fromTo(
      el,
      { scale: 0, opacity: 0 },
      { scale: drops[i].scale, opacity: 1, duration: 0.55, ease: JELLY.popEase },
      0.06 + i * 0.05,
    )
  })

  // 3. 一拍おいて…スーッと垂れる(跡を残しながら)
  dropEls.value?.forEach((el, i) => {
    const dist = rand(SNEEZE_SPLASH.dripDistance[0], SNEEZE_SPLASH.dripDistance[1])
    const dur = rand(SNEEZE_SPLASH.dripDuration[0], SNEEZE_SPLASH.dripDuration[1])
    const start = SNEEZE_SPLASH.dripDelay + i * 0.3
    // 垂れ始めは滴が縦に伸びる
    tl.to(el, { scaleY: drops[i].scale * 1.35, duration: 0.4, ease: 'power1.in' }, start)
    tl.to(el, { y: dist, duration: dur, ease: 'power2.in' }, start)
    const trail = trailEls.value?.[i]
    if (trail) tl.to(trail, { height: dist, opacity: 1, duration: dur, ease: 'power2.in' }, start)
  })

  // 4. ぜんぶ薄くなって消える
  tl.to(rootEl.value, { opacity: 0, duration: 0.7, ease: 'power1.in' }, '>-0.3')
})

onBeforeUnmount(() => tl?.kill())
</script>

<style scoped>
.sneeze-splash {
  position: absolute;
  inset: 0;
  z-index: 24; /* 提案カード(z25)より奥。カードの文字に滴が被って読みづらくならないように */
  pointer-events: none;
  overflow: hidden;
}
.spray {
  position: absolute;
  transform: translate(-50%, -50%);
  will-change: transform;
}
.drop-wrap {
  position: absolute;
}
/* ガラスに付いた水滴。外側(.drop)は GSAP の移動/伸び担当、内側(.shape)がしずく型 */
.drop {
  position: absolute;
  width: 16px;
  height: 20px;
  margin: -10px 0 0 -8px;
  will-change: transform;
}
.shape {
  width: 15px;
  height: 15px;
  margin-top: 3px;
  /* 角1つだけ尖らせて45°回す = 先端が上を向くしずく型 */
  border-radius: 0 50% 50% 50%;
  transform: rotate(45deg);
  background: radial-gradient(circle at 30% 65%, rgba(255, 255, 255, 0.92), rgba(165, 208, 245, 0.6) 45%, rgba(120, 175, 230, 0.5));
  box-shadow:
    inset -1px -2px 3px rgba(90, 140, 200, 0.35),
    1px 1px 2px rgba(60, 100, 160, 0.2);
}
/* 垂れた跡。滴の初期位置から下へ伸びる */
.trail {
  position: absolute;
  top: -8px;
  left: -2px;
  width: 4px;
  height: 0;
  background: linear-gradient(to top, rgba(165, 208, 245, 0.5), rgba(165, 208, 245, 0.06));
  border-radius: 2px;
  opacity: 0;
}
</style>
