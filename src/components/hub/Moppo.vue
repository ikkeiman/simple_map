<template>
  <!-- モッポ本体。ジェスチャーの受け口 + 自分の見た目(表情/ゼリー動作)だけを持つ。
       何が起きたかは emit で親(MoppoHub)に渡し、状態遷移の判断はしない。
       絵は assets/moppo.svg を展開したもの(表情差分を Vue で切替えるためインライン化) -->
  <div ref="rootEl" class="moppo-root">
    <div ref="bodyEl" class="moppo-body">
      <div v-if="ring" class="ring"></div>
      <svg viewBox="0 0 480 480" class="svg" :class="{ night }">
        <defs>
          <path id="faceShape" d="M 58.5,3 C 58.5,-19.11 38.5,-50 0,-50 C -38.5,-50 -58.5,-20.58 -58.5,3 C -58.5,31 -44.52,50 0,50 C 44.15,50 58.5,31 58.5,3 Z" />
          <radialGradient id="faceGrad" cx="0.38" cy="0.28" r="0.9">
            <stop offset="0" stop-color="#F8F0DC" />
            <stop offset="0.55" stop-color="#F0E6CB" />
            <stop offset="1" stop-color="#E3D5B2" />
          </radialGradient>
          <linearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#D5BE95" />
            <stop offset="1" stop-color="#B69D72" />
          </linearGradient>
          <radialGradient id="earGrad" cx="0.40" cy="0.32" r="0.9">
            <stop offset="0" stop-color="#E6D5AF" />
            <stop offset="1" stop-color="#CDB588" />
          </radialGradient>
          <linearGradient id="mouthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#B08B6C" />
            <stop offset="1" stop-color="#96714F" />
          </linearGradient>
          <filter id="blurSoft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="blurWide" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="11" /></filter>
          <clipPath id="faceClip"><path d="M 58.5,3 C 58.5,-19.11 38.5,-50 0,-50 C -38.5,-50 -58.5,-20.58 -58.5,3 C -58.5,31 -44.52,50 0,50 C 44.15,50 58.5,31 58.5,3 Z" transform="translate(240 262) scale(2.62)" /></clipPath>
          <clipPath id="earClipL"><path d="M 93.36 252.12 C 73.95 262.36 62 271.5 46 270.5 C 32 269.7 28.5 259 33 244 C 37 231 46 218 55.15 207.5 C 66.37 192.01 81.56 174.29 96.55 183.66 C 111.54 193.02 115.83 240.26 93.36 252.12 Z" /></clipPath>
          <clipPath id="earClipR"><path d="M 386.64 252.12 C 406.05 262.36 418 271.5 434 270.5 C 448 269.7 451.5 259 447 244 C 443 231 434 218 424.85 207.5 C 413.63 192.01 398.44 174.29 383.45 183.66 C 368.46 193.02 364.17 240.26 386.64 252.12 Z" /></clipPath>
        </defs>

        <!-- 接地影(ドラッグで持ち上げたら薄く小さく) -->
        <ellipse ref="shadowEl" cx="240" cy="424" rx="135" ry="17" fill="#8A7550" opacity="0.28" filter="url(#blurWide)" />

        <g id="moppo">
          <g id="ear-l">
            <path d="M 93.36 252.12 C 73.95 262.36 62 271.5 46 270.5 C 32 269.7 28.5 259 33 244 C 37 231 46 218 55.15 207.5 C 66.37 192.01 81.56 174.29 96.55 183.66 C 111.54 193.02 115.83 240.26 93.36 252.12 Z" fill="url(#earGrad)" />
            <g clip-path="url(#earClipL)">
              <ellipse cx="80" cy="198" rx="22" ry="20" fill="#F4EAD0" opacity="0.55" filter="url(#blurSoft)" />
              <ellipse cx="47" cy="256" rx="26" ry="22" fill="#9C835B" opacity="0.5" filter="url(#blurSoft)" />
              <ellipse cx="94" cy="222" rx="14" ry="36" fill="#9C835B" opacity="0.3" filter="url(#blurSoft)" />
            </g>
          </g>
          <g id="ear-r">
            <path d="M 386.64 252.12 C 406.05 262.36 418 271.5 434 270.5 C 448 269.7 451.5 259 447 244 C 443 231 434 218 424.85 207.5 C 413.63 192.01 398.44 174.29 383.45 183.66 C 368.46 193.02 364.17 240.26 386.64 252.12 Z" fill="url(#earGrad)" />
            <g clip-path="url(#earClipR)">
              <ellipse cx="400" cy="198" rx="22" ry="20" fill="#F4EAD0" opacity="0.55" filter="url(#blurSoft)" />
              <ellipse cx="433" cy="256" rx="26" ry="22" fill="#9C835B" opacity="0.5" filter="url(#blurSoft)" />
              <ellipse cx="386" cy="222" rx="14" ry="36" fill="#9C835B" opacity="0.3" filter="url(#blurSoft)" />
            </g>
          </g>

          <g id="head">
            <use id="head-depth" href="#faceShape" transform="translate(240 271) scale(2.85)" fill="#A2895E" />
            <use id="head-rim" href="#faceShape" transform="translate(240 262) scale(2.85)" fill="url(#rimGrad)" />
            <g id="face">
              <use href="#faceShape" transform="translate(240 262) scale(2.62)" fill="url(#faceGrad)" />
              <g clip-path="url(#faceClip)">
                <ellipse cx="208" cy="168" rx="118" ry="62" fill="#FFFDF2" opacity="0.45" filter="url(#blurWide)" />
                <ellipse cx="246" cy="412" rx="185" ry="78" fill="#C2A97C" opacity="0.5" filter="url(#blurWide)" />
                <use href="#faceShape" transform="translate(240 259) scale(2.66)" fill="none" stroke="#B49B70" stroke-width="5" opacity="0.35" filter="url(#blurSoft)" />
              </g>
            </g>

            <g id="face-parts">
              <!-- 目: 表情で切替 -->
              <g v-if="face === 'happy'">
                <path d="M 164 244 Q 186 264 208 244" stroke="#33261B" stroke-width="11" fill="none" stroke-linecap="round" />
                <path d="M 274 244 Q 296 264 318 244" stroke="#33261B" stroke-width="11" fill="none" stroke-linecap="round" />
              </g>
              <g v-else-if="face === 'sleepy' || face === 'asleep'">
                <path d="M 164 250 Q 186 240 208 250" stroke="#33261B" stroke-width="11" fill="none" stroke-linecap="round" />
                <path d="M 274 250 Q 296 240 318 250" stroke="#33261B" stroke-width="11" fill="none" stroke-linecap="round" />
              </g>
              <g v-else-if="face === 'startled'">
                <circle cx="186" cy="244" r="22" fill="#33261B" />
                <circle cx="296" cy="244" r="22" fill="#33261B" />
                <circle cx="179" cy="236" r="7" fill="#FFF8E8" opacity="0.95" />
                <circle cx="289" cy="236" r="7" fill="#FFF8E8" opacity="0.95" />
              </g>
              <g v-else ref="eyesEl">
                <g><circle cx="186" cy="246" r="16.5" fill="#33261B" /><circle cx="180" cy="240" r="4.5" fill="#FFF8E8" opacity="0.9" /></g>
                <g><circle cx="296" cy="246" r="16.5" fill="#33261B" /><circle cx="290" cy="240" r="4.5" fill="#FFF8E8" opacity="0.9" /></g>
              </g>

              <ellipse cx="140" cy="294" rx="24" ry="15" fill="#F2A79C" opacity="0.85" filter="url(#blurSoft)" />
              <ellipse cx="342" cy="294" rx="24" ry="15" fill="#F2A79C" opacity="0.85" filter="url(#blurSoft)" />

              <!-- 口: はなす中は大きく開けてぱくぱく / ふだんは小さな口 -->
              <g v-if="face === 'talking'" ref="talkMouthEl">
                <ellipse cx="240" cy="304" rx="23" ry="19" fill="url(#mouthGrad)" />
                <ellipse cx="240" cy="313" rx="11" ry="6.5" fill="#D98A80" />
              </g>
              <path v-else d="M 240 288 C 231 288 227.5 294.5 232 301 C 235.5 306 244.5 306 248 301 C 252.5 294.5 249 288 240 288 Z" fill="url(#mouthGrad)" />
            </g>

            <!-- 鼻提灯(眠り中だけ)。ふくらんだり縮んだり、起こすとパチンと弾ける -->
            <g v-if="showSleepFx" ref="bubbleEl" class="bubble">
              <circle cx="268" cy="304" r="26" fill="rgba(186, 220, 244, 0.6)" stroke="#9EC4DD" stroke-width="3" />
              <circle cx="259" cy="295" r="7" fill="#FFFFFF" opacity="0.75" />
            </g>
          </g>

          <!-- Zzz...(眠り中だけ)。ふわふわ上っては消える -->
          <g v-if="showSleepFx" class="zzz" :fill="night ? '#E8E2D4' : '#8A8274'">
            <text ref="zzzEls" x="330" y="185" font-size="44" font-weight="700">Z</text>
            <text ref="zzzEls" x="356" y="150" font-size="34" font-weight="700">z</text>
            <text ref="zzzEls" x="378" y="120" font-size="26" font-weight="700">z</text>
          </g>
        </g>
      </svg>

      <!-- セリフ吹き出し(はっくしょん！等)。モッポと一緒に動く -->
      <div v-if="speech" ref="speechEl" class="speech" :class="{ big: speechBig }">{{ speech }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import { useMoppoGesture } from '../../composables/useMoppoGesture'
import { useMoppoMotion } from '../../composables/useMoppoMotion'
import {
  JELLY,
  SPEECH,
  DRAG_PEEK_MAX,
  DRAG_PEEK_LERP,
  DRAG_PEEK_MIN_MOVE,
  DRAG_PEEK_DIR_SMOOTH,
} from '../../constants/hubConfig'

const props = defineProps({
  // idle | talking | happy | sleepy | asleep | grabbed | sneeze | startled
  expression: { type: String, default: 'idle' },
  night: { type: Boolean, default: false },
  ring: { type: Boolean, default: false }, // 待機時の「つかめるよ」点線リング
})
const emit = defineEmits(['grab', 'drag', 'release', 'tap', 'long-press', 'long-press-end', 'shake'])

const rootEl = ref(null)
const bodyEl = ref(null)
const eyesEl = ref(null)
const shadowEl = ref(null)
const bubbleEl = ref(null)
const talkMouthEl = ref(null)
const zzzEls = useTemplateRef('zzzEls')

// 眠り演出中は内部の段階表情が親の表情より優先される
const stageFace = ref(null)
const face = computed(() => stageFace.value ?? props.expression)
// 鼻提灯/Zzz の表示は v-if 直結にせず自前フラグで持つ。
// 起床時に親の表情が先に切り替わっても、破裂アニメを見せてから消すため
const showSleepFx = ref(false)
let waking = false

const motion = useMoppoMotion(bodyEl)

// 指がモッポを隠さないための「先行(のぞき)」。動かした“向き”へ常に一定量ずらして指の外に出す。
// 向きは直前の1ドラッグぶんの移動から決めるので、少し動かすだけで即その側へ出る
// (掴んだ位置からの相対ではないので中心基準に感じない)。停止中は最後の向きを保つ。
let peekX = 0
let peekY = 0
let peekDirX = 0
let peekDirY = 0
let lastDx = 0
let lastDy = 0
const resetPeek = () => {
  peekX = peekY = peekDirX = peekDirY = lastDx = lastDy = 0
}
// 指に足すオフセットを返す。dx/dy は掴んだ位置からの指の変位
const updatePeek = (dx, dy) => {
  const mvx = dx - lastDx // 前回イベントからの動き = いまの向き
  const mvy = dy - lastDy
  lastDx = dx
  lastDy = dy
  const mv = Math.hypot(mvx, mvy)
  if (mv >= DRAG_PEEK_MIN_MOVE) {
    // 瞬間の向きへ即スナップせず EMA でならす(遊び)。細かい左右の往復では側が入れ替わらない
    peekDirX += (mvx / mv - peekDirX) * DRAG_PEEK_DIR_SMOOTH
    peekDirY += (mvy / mv - peekDirY) * DRAG_PEEK_DIR_SMOOTH
  }
  // 常に一定量(DRAG_PEEK_MAX)。向いている側へ寄せていく。
  // ただし下方向(Y正)へは出さない = 左右と上だけ先行させる
  const dirY = Math.min(0, peekDirY)
  peekX += (peekDirX * DRAG_PEEK_MAX - peekX) * DRAG_PEEK_LERP
  peekY += (dirY * DRAG_PEEK_MAX - peekY) * DRAG_PEEK_LERP
  return { x: peekX, y: peekY }
}

// 持ち上げたら接地影を薄く小さく / 離したら戻す
const liftShadow = (lifted) => {
  if (!shadowEl.value) return
  gsap.to(shadowEl.value, {
    opacity: lifted ? 0.1 : 0.28,
    scaleX: lifted ? 0.6 : 1,
    scaleY: lifted ? 0.75 : 1,
    transformOrigin: '50% 50%',
    duration: 0.4,
    overwrite: 'auto',
  })
}

const gesture = useMoppoGesture(rootEl, {
  onGrab: () => {
    resetPeek()
    motion.startFollow()
    liftShadow(true)
    emit('grab')
  },
  onDrag: (p) => {
    // 指の外へモッポを出す(先行)。ホバー判定もモッポ基準にするため、
    // ずらした後のモッポ中心座標(mx/my)を一緒に渡す
    const { x: ox, y: oy } = updatePeek(p.dx, p.dy)
    motion.followTo(p.dx + ox, p.dy + oy)
    emit('drag', { ...p, mx: p.x + ox, my: p.y + oy })
  },
  onRelease: (p) => {
    liftShadow(false)
    emit('release', { ...p, mx: p.x + peekX, my: p.y + peekY })
  },
  onTap: () => emit('tap'),
  onLongPress: () => emit('long-press'),
  onLongPressEnd: () => emit('long-press-end'),
  onShake: () => {
    liftShadow(false)
    emit('shake')
  },
})

let breatheTween = null
const restartBreathe = () => {
  breatheTween?.kill()
  breatheTween = motion.breathe()
}

onMounted(() => {
  gesture.attach()
  restartBreathe()
  blinkLoop()
})

// ときどきまばたき(丸目のときだけ)
const blinkLoop = () => {
  gsap.delayedCall(gsap.utils.random(2.2, 4.5), () => {
    blinkOnce()
    blinkLoop()
  })
}
const blinkOnce = () => {
  if (!eyesEl.value) return
  gsap.to(eyesEl.value, { scaleY: 0.1, transformOrigin: '50% 51%', duration: 0.07, yoyo: true, repeat: 1 })
}

// ---- セリフ吹き出し ----
const speech = ref(null)
const speechBig = ref(false)
const speechEl = ref(null)
let speechHide = null
const say = async (text, holdMs = 900, { big = false, persist = false } = {}) => {
  speechHide?.kill()
  speech.value = text
  speechBig.value = big
  await nextTick()
  if (speechEl.value) {
    gsap.fromTo(
      speechEl.value,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.45, ease: JELLY.popEase, transformOrigin: '10% 100%', overwrite: 'auto' },
    )
  }
  if (persist) return // 探索中の🐾/「タップしてね」等、次の say まで消さない吹き出し
  speechHide = gsap.delayedCall(holdMs / 1000, () => {
    if (!speechEl.value) {
      speech.value = null
      return
    }
    gsap.to(speechEl.value, {
      scale: 0.5,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        speech.value = null
      },
    })
  })
}

// ---- はなす中の口ぱくぱくループ ----
let talkTween = null
watch(face, async (f) => {
  talkTween?.kill()
  talkTween = null
  if (f !== 'talking') return
  await Promise.resolve() // v-if 反映待ち
  if (!talkMouthEl.value) return
  // 口の上端(240,286)を支点に開閉 → 喋っている風
  talkTween = gsap.fromTo(
    talkMouthEl.value,
    { scaleY: 0.3, svgOrigin: '240 286' },
    { scaleY: 1, duration: 0.22, yoyo: true, repeat: -1, ease: 'sine.inOut' },
  )
})

// ---- 眠り中の鼻提灯 & Zzz ループ ----
let bubbleTween = null
let zzzTween = null
let sleepBreatheTween = null
const killSleepFx = () => {
  bubbleTween?.kill()
  zzzTween?.kill()
  sleepBreatheTween?.kill()
}
watch(face, async (f) => {
  if (f !== 'asleep') {
    // 起床演出中(waking)は破裂アニメを見せてから消すので触らない
    if (!waking) {
      killSleepFx()
      showSleepFx.value = false
    }
    return
  }
  killSleepFx()
  showSleepFx.value = true
  await Promise.resolve() // v-if 反映待ち
  if (bubbleEl.value) {
    bubbleTween = gsap.fromTo(
      bubbleEl.value,
      { scale: 0.55, transformOrigin: '247px 292px' },
      { scale: 1.15, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' },
    )
  }
  if (zzzEls.value?.length) {
    zzzTween = gsap.fromTo(
      zzzEls.value,
      { opacity: 0, y: 18, scale: 0.6, transformOrigin: '50% 50%' },
      { opacity: 1, y: -14, scale: 1, duration: 1.1, stagger: 0.45, repeat: -1, yoyo: true, ease: 'sine.inOut' },
    )
  }
  sleepBreatheTween = motion.sleepBreathe()
})

// ---- 親(MoppoHub)から呼ぶ。判断はせず動きと情報だけ提供する ----
const returnHome = (onDone) => {
  motion.returnHome(() => {
    restartBreathe()
    onDone?.()
  })
}
const squishPop = () => motion.squishPop()

// くしゃみ: 中央へ移動→予備動作→ヘックシュン(onBurst でカードを出す)。節目ごとにセリフ
const SNEEZE_LINES = {
  tease1: [SPEECH.sneezeTease1, 600],
  tease2: [SPEECH.sneezeTease2, 700],
  inhale: [SPEECH.sneezeInhale, 700],
  burst: [SPEECH.sneezeBurst, 1500],
}
const playSneezeAt = (dx, dy, { onBurst, onDone } = {}) =>
  motion.sneezeAt(dx, dy, {
    onCue: (cue) => {
      const line = SNEEZE_LINES[cue]
      if (line) say(line[0], line[1], { big: cue === 'burst' })
    },
    onBurst,
    onDone,
  })

// 眠りシーケンス(長押し保持中)。段階表情はここで切り替える
let sleepTl = null
const startSleepSequence = (onAsleep) => {
  breatheTween?.kill()
  sleepTl = motion.sleepSequence({
    onStage: (stage) => {
      if (stage === 'blink') {
        blinkOnce()
        gsap.delayedCall(0.3, blinkOnce)
      } else {
        stageFace.value = 'sleepy'
      }
      if (stage === 'sleepy') say(SPEECH.drowsy, 1100)
      if (stage === 'nod') say(SPEECH.drowsier, 1100)
    },
    onAsleep: () => {
      stageFace.value = null // 以降は親の expression('asleep') に委ねる
      say(SPEECH.asleep, 1300)
      onAsleep?.()
    },
  })
}
const cancelSleepSequence = () => {
  motion.cancelSleep(sleepTl)
  sleepTl = null
  stageFace.value = null
  restartBreathe()
}

// びくっ！と起きる: 鼻提灯がパチンと弾けてから飛び上がる
const wakeStartle = (onDone) => {
  waking = true
  zzzTween?.kill()
  sleepBreatheTween?.kill()
  stageFace.value = 'startled'
  say(SPEECH.wake, 1100, { big: true })
  if (bubbleEl.value) {
    bubbleTween?.kill()
    gsap.to(bubbleEl.value, {
      scale: 2.0,
      opacity: 0,
      duration: 0.16,
      ease: 'power2.out',
      transformOrigin: '247px 292px',
      onComplete: () => {
        showSleepFx.value = false
      },
    })
  } else {
    showSleepFx.value = false
  }
  motion.wakeStartle(() => {
    stageFace.value = null
    waking = false
    restartBreathe()
    onDone?.()
  })
}

// 定位置(ホーム)の中心。root はドラッグしても動かないのでホーム座標が取れる
const getHomeCenter = () => {
  const r = rootEl.value?.getBoundingClientRect()
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null
}

// ---- ⑨⑩ 探検モーション。判断は親、動きはここ ----
const walkOut = (dx, dy, opts) => {
  breatheTween?.kill() // 待機呼吸を止めてから歩き出す(帰宅時 returnHome が呼び直す)
  return motion.walkOut(dx, dy, opts)
}
const stopWalk = () => motion.stopWalk()
const tada = () => motion.tada()

defineExpose({ returnHome, squishPop, playSneezeAt, startSleepSequence, cancelSleepSequence, wakeStartle, getHomeCenter, say, walkOut, stopWalk, tada })
</script>

<style scoped>
.moppo-root {
  position: absolute;
  bottom: 26px;
  left: 50%;
  margin-left: -46px; /* transform は GSAP 専用にするため margin で中央寄せ */
  width: 92px;
  height: 92px;
  z-index: 30;
  touch-action: none; /* ドラッグ中に画面スクロールさせない */
  cursor: grab;
}
.moppo-root:active {
  cursor: grabbing;
}
.moppo-body {
  position: absolute;
  inset: 0;
  will-change: transform;
}
.svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.svg.night {
  filter: brightness(0.72) saturate(0.75);
}
.zzz {
  font-family: var(--hub-font);
}
.speech {
  position: absolute;
  bottom: 92%;
  left: 62%;
  padding: 5px 11px;
  background: var(--hub-pill-bg);
  border-radius: 14px 14px 14px 4px; /* 左下だけ尖らせてしっぽにする */
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.14);
  font-size: 12px;
  font-weight: 700;
  color: var(--hub-ink);
  white-space: nowrap;
  pointer-events: none;
}
.speech.big {
  font-size: 16px;
  color: #c0503f;
}
.ring {
  position: absolute;
  inset: -2px 0 6px 0;
  border: 1.5px dashed #b6a9d0;
  border-radius: 50%;
}
</style>
