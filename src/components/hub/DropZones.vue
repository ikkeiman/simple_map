<template>
  <!-- つかんだ瞬間、画面の左右端に出る小さなコイン型ゾーン(左=きろく/右=あそぶ)。
       モッポを重ねるとその側のアイコンが斜め配置で展開し、アイコンの上で離すと遷移。
       位置・当たり判定はすべて親(MoppoHub)が計算する。ここは描くだけ -->
  <div class="drop-zones">
    <!-- 角中心のグロー(MenuBlob)は親(MoppoHub)が描画する。ここはゾーン/ピル/アイコンだけ -->
    <div
      v-for="zone in zoneList"
      :key="zone.side"
      ref="zoneEls"
      class="zone"
      :class="[zone.side, { active: activeZone === zone.side, expanded: expandedSide === zone.side, hushed: hiddenSide === zone.side }]"
      :style="{ left: zone.x + 'px', top: zone.y + 'px' }"
    >
      <div class="coin" :style="{ width: ZONE_RADIUS * 2 + 'px', height: ZONE_RADIUS * 2 + 'px' }"></div>
      <div class="label">{{ zone.label }}</div>
    </div>

    <!-- 展開中の方向ラベル(白ピル・参考画像のきろくピル) -->
    <div v-if="pill" :key="pill.side" ref="pillEl" class="pill" :class="pill.side" :style="{ left: pill.x + 'px', top: pill.y + 'px' }">
      {{ pill.label }}
    </div>

    <!-- ゾーンに重ねた時に展開するアイコン(この上で離すと画面遷移) -->
    <div
      v-for="item in icons"
      :key="item.id"
      ref="iconEls"
      class="icon"
      :class="[expandedSide, { hovered: hoveredIcon === item.id }]"
      :style="{ left: item.x + 'px', top: item.y + 'px' }"
    >
      <span class="coin">{{ item.icon }}</span>
      <span class="clab">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import { ZONE_RADIUS, JELLY } from '../../constants/hubConfig'
import { jellyPopIn } from '../../composables/useMoppoMotion'

const props = defineProps({
  zones: { type: Object, required: true }, // { left:{x,y}, right:{x,y} } (px)
  activeZone: { type: String, default: null }, // モッポが重なっているゾーン
  expandedSide: { type: String, default: null }, // アイコン展開中の側
  icons: { type: Array, default: () => [] }, // [{ id, icon, label, x, y }]
  hoveredIcon: { type: String, default: null }, // モッポが重なっているアイコン
  pill: { type: Object, default: null }, // { side, label, x, y }
})

const zoneList = computed(() => [
  { side: 'left', label: 'きろく', ...props.zones.left },
  { side: 'right', label: 'あそぶ', ...props.zones.right },
])

const zoneEls = useTemplateRef('zoneEls')
const iconEls = useTemplateRef('iconEls')
const pillEl = useTemplateRef('pillEl')

onMounted(() => jellyPopIn(zoneEls.value))

// 触れた側(展開中の側。展開前の一瞬は重なっている側)の点線ゾーンは .hushed で要素ごと消す。
// アイコンへ指を移して activeZone が外れても、expandedSide が生きている間は消えたまま。
// 反対側のゾーンは選択肢として残す。CSS の !important で、出現ポップ(jellyPopIn が付ける
// inline opacity)に打ち勝って確実に隠す。フェードは .zone の transition が担う。
const hiddenSide = computed(() => props.expandedSide ?? props.activeZone)

// 展開側が変わったらアイコンとピルをぷるんと出し直す
watch(
  () => props.expandedSide,
  async (side) => {
    if (!side) return
    await nextTick()
    jellyPopIn(iconEls.value)
    if (pillEl.value) jellyPopIn(pillEl.value)
  },
)

// モッポが重なったアイコンはぷくっと膨らむ
watch(
  () => props.hoveredIcon,
  (id) => {
    iconEls.value?.forEach((el, i) => {
      const isHovered = props.icons[i]?.id === id
      gsap.to(el, {
        scale: isHovered ? 1.22 : 1,
        duration: isHovered ? 0.35 : 0.6,
        ease: JELLY.popEase,
        overwrite: 'auto',
      })
    })
  },
)
</script>

<style scoped>
.drop-zones {
  position: absolute;
  inset: 0;
  z-index: 25;
  pointer-events: none; /* 判定は MoppoHub が距離計算で行う。DOMヒットに頼らない */
}
.zone,
.icon,
.pill {
  position: absolute;
  transform: translate(-50%, -50%);
}
.zone,
.icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.zone {
  transition: opacity 0.26s ease, visibility 0.26s ease;
}
/* 触れた側(hushed)は要素ごと消す。!important で出現ポップの inline opacity に打ち勝つ */
.zone.hushed {
  opacity: 0 !important;
  visibility: hidden !important;
}
.coin {
  border-radius: 50%;
  border: 2px dashed;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  background-clip: padding-box;
}
.zone.left .coin,
.icon.left .coin {
  border-color: var(--hub-record-coin);
  background-color: rgba(111, 160, 221, 0.16);
}
.zone.right .coin,
.icon.right .coin {
  border-color: var(--hub-play-coin);
  background-color: rgba(221, 154, 92, 0.16);
}
.zone.active .coin,
.icon.hovered .coin {
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.2);
}
/* 展開中(=触れた側)のゾーンは JS(hiddenSide watch)で要素ごと消す。反対側は残す。 */
.label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
}
.zone.left .label {
  color: var(--hub-record);
}
.zone.right .label {
  color: var(--hub-play);
}
.pill {
  padding: 7px 16px;
  background: var(--hub-pill-bg);
  border-radius: 20px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  white-space: nowrap;
}
.pill.left {
  color: var(--hub-record);
}
.pill.right {
  color: var(--hub-play);
}
.icon .coin {
  width: 62px;
  height: 62px;
  font-size: 26px;
}
/* 展開アイコンは白い実線コイン＋影で、同色のグローに埋もれず浮かせる(同化対策) */
.icon.left .coin,
.icon.right .coin {
  background-color: #fffdf8;
  border-style: solid;
  box-shadow: 0 6px 16px rgba(60, 50, 35, 0.3);
}
.icon.hovered .coin {
  box-shadow: 0 9px 22px rgba(60, 50, 35, 0.4);
}
.icon .clab {
  font-size: 11px;
  font-weight: 600;
  color: #5a5142;
  background: rgba(255, 253, 248, 0.85);
  padding: 1px 7px;
  border-radius: 8px;
}
</style>
