<template>
  <!-- くしゃみ提案(1f)。つかんだままシェイクで開くランダム候補カード。
       隠し味: 同じ行き先にはタップ(おまかせ)でも到達できる(唯一の導線にしない) -->
  <div class="sneeze-backdrop" @pointerdown.self="emit('close')">
    <div ref="cardEl" class="card">
      <div class="cap">くしゃみで飛んできた候補</div>
      <div class="name">{{ candidate.name }}</div>

      <div class="rating">
        <span class="stars">
          <span v-for="n in 5" :key="n" class="star" :class="{ on: n <= Math.round(candidate.rating) }">★</span>
        </span>
        <span class="score">{{ candidate.rating.toFixed(1) }}</span>
        <span class="meta">徒歩{{ candidate.walkMin }}分・{{ candidate.tags }}</span>
      </div>

      <!-- 店の画像(プレースホルダ3枚) -->
      <div class="photos">
        <div v-for="(photo, i) in candidate.photos" :key="i" class="photo" :class="`p${i}`">{{ photo }}</div>
      </div>

      <!-- モッポが提案した理由 -->
      <div class="reason">
        <span class="who">モッポのはなが むずむずした理由</span>
        <p>{{ candidate.reason }}</p>
      </div>

      <p class="desc">{{ candidate.description }}</p>

      <div class="actions">
        <button type="button" class="redraw" @click="redraw">引き直す</button>
        <button type="button" class="go" @click="emit('go', candidate)">ここへ行く</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import gsap from 'gsap'
import { SNEEZE_CANDIDATES, JELLY } from '../../constants/hubConfig'

const emit = defineEmits(['go', 'close'])

const pickRandom = (exclude) => {
  const pool = SNEEZE_CANDIDATES.filter((c) => c.name !== exclude?.name)
  return pool[Math.floor(Math.random() * pool.length)]
}
const candidate = ref(pickRandom(null))

const cardEl = ref(null)
onMounted(() => {
  // くしゃみで上(中央のモッポの顔)から飛び出してくる
  gsap.fromTo(
    cardEl.value,
    { scale: 0, rotation: -5, y: -60, transformOrigin: '50% 0%' },
    { scale: 1, rotation: 0, y: 0, duration: JELLY.popDuration, ease: JELLY.popEase },
  )
})

// 引き直し: ぷにっと縮んで別候補でぷるんと戻る
const redraw = () => {
  gsap
    .timeline()
    .to(cardEl.value, { scale: 0.85, scaleY: 0.7, duration: 0.14, ease: 'power2.in' })
    .add(() => {
      candidate.value = pickRandom(candidate.value)
    })
    .to(cardEl.value, { scale: 1, scaleY: 1, duration: 0.8, ease: JELLY.popEase })
}
</script>

<style scoped>
.sneeze-backdrop {
  position: absolute;
  inset: 0;
  z-index: 25; /* モッポ(30)より下 = 中央のモッポがくしゃみした顔のまま見える */
  background: rgba(40, 34, 24, 0.14);
}
.card {
  /* 画面中央のモッポのすぐ下に出す */
  position: absolute;
  left: 22px;
  right: 22px;
  top: 46%;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.16);
  padding: 18px 16px 16px;
  text-align: center;
}
.cap {
  font-size: 10px;
  color: #9c8f78;
  margin-bottom: 6px;
}
.name {
  font-family: var(--hub-font-display);
  font-weight: 700;
  font-size: 19px;
  color: #3a352b;
}
.rating {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 6px 0 10px;
}
.star {
  font-size: 13px;
  color: #ded5c2;
}
.star.on {
  color: #e0b84a;
}
.score {
  font-size: 12px;
  font-weight: 700;
  color: #8a7c60;
}
.meta {
  font-size: 10px;
  color: #7a6f5a;
}
.photos {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}
.photo {
  flex: 1;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}
.photo.p0 {
  background: linear-gradient(135deg, #e8dcc4, #d9c9a8);
}
.photo.p1 {
  background: linear-gradient(135deg, #d8e2d2, #bccdb4);
}
.photo.p2 {
  background: linear-gradient(135deg, #e4d5d0, #d0b8ae);
}
.reason {
  background: #f6f1e6;
  border-radius: 12px;
  padding: 9px 11px;
  text-align: left;
  margin-bottom: 10px;
}
.reason .who {
  font-size: 9px;
  font-weight: 700;
  color: #a08c5e;
}
.reason p {
  font-size: 11px;
  line-height: 1.55;
  color: #5a5142;
  margin-top: 2px;
}
.desc {
  font-size: 10.5px;
  line-height: 1.6;
  color: #7a6f5a;
  text-align: left;
  margin-bottom: 14px;
}
.actions {
  display: flex;
  gap: 10px;
}
.actions button {
  flex: 1;
  height: 40px;
  border-radius: 20px;
  font-family: var(--hub-font);
  font-size: 12px;
  cursor: pointer;
}
.redraw {
  border: 1.5px solid #c9bda0;
  background: #fff;
  font-weight: 500;
  color: #8a7c60;
}
.go {
  border: 1.5px solid #9fc7bd;
  background: #eef4f2;
  font-weight: 700;
  color: #2f6b5f;
}
</style>
