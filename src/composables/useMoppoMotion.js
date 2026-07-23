// 「どう動かすか」だけを担当するモーション層(GSAP)。判定はここに書かない。
// 質感の方針: もちっとしたゼリー(codepen の soft-body / jelly デモ参照)。
//  - 追従は遅れて付いてくる(quickTo + power3.out)
//  - 速度に応じて進行方向へ伸び、直交方向に潰れる(squash & stretch)
//  - 復帰・出現は elastic で数回ぷるんと揺れて減衰する
import gsap from 'gsap'
import { JELLY, SLEEP_STAGES } from '../constants/hubConfig'

/**
 * @param {import('vue').Ref<HTMLElement|null>} bodyRef 動かす要素(モッポ本体)
 */
export function useMoppoMotion(bodyRef) {
  let quickX = null
  let quickY = null
  let quickScaleX = null
  let quickScaleY = null
  let quickRot = null
  let tickerFn = null
  let pendingX = 0 // 指の最新位置。適用は rAF(1フレーム1回)でだけ行う
  let pendingY = 0
  let prevX = 0
  let prevY = 0
  let smoothVX = 0
  let smoothVY = 0
  let walkLoop = null // 探索中の「その場で歩く」ループ tween

  const stopFollow = () => {
    if (tickerFn) gsap.ticker.remove(tickerFn)
    tickerFn = null
    quickX = quickY = quickScaleX = quickScaleY = quickRot = null
  }

  // つかんだ瞬間に呼ぶ。pointermove ごとに tween を作るとイベント高頻度の端末で
  // かくつくため、全部 quickTo(再利用)にして gsap.ticker でフレーム同期に適用する
  const startFollow = () => {
    const el = bodyRef.value
    if (!el) return
    stopFollow()
    gsap.killTweensOf(el) // 帰宅中の elastic 等と喧嘩させない
    gsap.set(el, { transformOrigin: '50% 60%' })
    quickX = gsap.quickTo(el, 'x', { duration: JELLY.followDuration, ease: JELLY.followEase })
    quickY = gsap.quickTo(el, 'y', { duration: JELLY.followDuration, ease: JELLY.followEase })
    quickScaleX = gsap.quickTo(el, 'scaleX', { duration: JELLY.wobbleDuration, ease: JELLY.wobbleEase })
    quickScaleY = gsap.quickTo(el, 'scaleY', { duration: JELLY.wobbleDuration, ease: JELLY.wobbleEase })
    quickRot = gsap.quickTo(el, 'rotation', { duration: JELLY.wobbleDuration, ease: JELLY.wobbleEase })
    pendingX = prevX = Number(gsap.getProperty(el, 'x'))
    pendingY = prevY = Number(gsap.getProperty(el, 'y'))
    smoothVX = smoothVY = 0

    let sentX = null
    let sentY = null
    tickerFn = (time, deltaMs) => {
      // 目標が変わった時だけ再ターゲット(毎フレーム restart すると微妙に粘る)
      if (pendingX !== sentX) {
        quickX(pendingX)
        sentX = pendingX
      }
      if (pendingY !== sentY) {
        quickY(pendingY)
        sentY = pendingY
      }
      // 速度(px/ms)は EMA で平滑化。生の値はノイズだらけで揺れ(かくつき)の原因になる。
      // 横は敏感め(velSmoothX)、縦は控えめに平滑化して「左右のぷるん」を主役にする
      const dt = Math.max(deltaMs, 1)
      const vx = (pendingX - prevX) / dt
      const vy = (pendingY - prevY) / dt
      prevX = pendingX
      prevY = pendingY
      smoothVX += (vx - smoothVX) * JELLY.velSmoothX
      smoothVY += (vy - smoothVY) * JELLY.velSmoothY
      // 速度→変形量。sqrt 応答で小さな速度を持ち上げ、軽い動きでも見えるぷるんにする
      const cap = JELLY.squashSpeedCap
      const hAmt = Math.min(1, Math.sqrt(Math.abs(smoothVX) / cap)) * JELLY.squashMax
      const vAmt = Math.min(1, Math.sqrt(Math.abs(smoothVY) / cap)) * JELLY.squashMax
      // 進行方向へ伸び、直交方向に潰れる(横移動なら横に伸びて縦に潰れる)
      quickScaleX(1 + hAmt - vAmt)
      quickScaleY(1 + vAmt - hAmt)
      quickRot(gsap.utils.clamp(-JELLY.rotMax, JELLY.rotMax, smoothVX * JELLY.rotGain))
    }
    gsap.ticker.add(tickerFn)
  }

  // 指の最新位置を覚えるだけ(適用は ticker がやる)
  const followTo = (dx, dy) => {
    pendingX = dx
    pendingY = dy
  }

  // ⑨ 探索へ「歩いて」出かける。home(0,0)→(dx,dy) をトコトコ跳ねて進み、
  // 到着したら onArrive を呼びつつ、その場で歩きループ(小ホップ＋横ゆれ)を始める。
  // 歩きループは stopWalk() / returnHome() で止める。
  const walkOut = (dx, dy, { onArrive } = {}) => {
    const el = bodyRef.value
    if (!el) return null
    stopFollow()
    stopWalk()
    gsap.killTweensOf(el)
    gsap.set(el, { transformOrigin: '50% 100%' })
    const steps = 6 // 数歩に分けて、1歩ごとに上下＋左右へ小さく傾けて「歩き」に見せる
    const tl = gsap.timeline({
      onComplete: () => {
        walkLoop = gsap
          .timeline({ repeat: -1 })
          .to(el, { y: dy - 9, scaleY: 1.06, scaleX: 0.95, duration: 0.28, ease: 'power1.out' })
          .to(el, { y: dy, scaleY: 0.97, scaleX: 1.03, duration: 0.24, ease: 'power1.in' })
          .to(el, { x: dx + 11, rotation: 4, duration: 0.52, ease: 'sine.inOut' }, 0)
          .to(el, { x: dx - 11, rotation: -4, duration: 0.52, ease: 'sine.inOut' }, 0.52)
        onArrive?.()
      },
    })
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      tl.to(el, {
        x: dx * t,
        y: dy * t - (i % 2 ? 12 : 0), // 一歩ごとにぴょこっと持ち上がる
        rotation: i % 2 ? -6 : 6,
        scaleY: i % 2 ? 1.05 : 0.97,
        scaleX: i % 2 ? 0.96 : 1.04,
        duration: 0.17,
        ease: 'power1.inOut',
      })
    }
    tl.to(el, { rotation: 0, y: dy, scaleY: 1, scaleX: 1, duration: 0.12 })
    return tl
  }

  const stopWalk = () => {
    walkLoop?.kill()
    walkLoop = null
  }

  // ⑩「じゃーん!」の発見ポーズ。予備しゃがみ→大きくジャンプ→着地ぷるん
  const tada = () => {
    const el = bodyRef.value
    if (!el) return null
    stopWalk()
    return gsap
      .timeline()
      .to(el, { y: 8, scaleY: 0.78, scaleX: 1.2, rotation: 0, duration: 0.14, ease: 'power2.out', transformOrigin: '50% 100%' })
      .to(el, { y: -46, scaleY: 1.2, scaleX: 0.84, duration: 0.26, ease: 'power3.out' })
      .to(el, { y: 0, scaleY: 0.9, scaleX: 1.12, duration: 0.18, ease: 'power2.in' })
      .to(el, { scaleY: 1, scaleX: 1, duration: 1.0, ease: JELLY.returnEase })
  }

  // 所定の位置(真ん中下 = transform 0,0)へぷるんと帰る
  const returnHome = (onDone) => {
    if (!bodyRef.value) return
    stopFollow()
    stopWalk()
    gsap.to(bodyRef.value, {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      duration: JELLY.returnDuration,
      ease: JELLY.returnEase,
      overwrite: 'auto',
      onComplete: onDone,
    })
  }

  // タップ時: ぷにっと潰れて戻る
  const squishPop = () => {
    if (!bodyRef.value) return
    gsap
      .timeline()
      .to(bodyRef.value, { scaleX: 1.18, scaleY: 0.8, duration: 0.1, ease: 'power2.out', transformOrigin: '50% 100%' })
      .to(bodyRef.value, { scaleX: 1, scaleY: 1, duration: 0.9, ease: JELLY.returnEase })
  }

  // くしゃみ一式: 画面中央へ移動 → 出そうで出ない予備動作 → 大きく吸って → ヘックシュン!
  // onCue で節目を親に知らせる(セリフ演出用)。onBurst のタイミングで提案カードを出す
  const sneezeAt = (dx, dy, { onCue, onBurst, onDone } = {}) => {
    const el = bodyRef.value
    if (!el) return
    stopFollow()
    const tl = gsap.timeline({ onComplete: onDone })
    // 中央へふわっと移動
    tl.to(el, { x: dx, y: dy, scaleX: 1, scaleY: 1, rotation: 0, duration: 0.55, ease: 'power2.inOut', overwrite: 'auto' })
    // 予備動作1: ふ…ふ…(小さくのけぞって戻る)
    tl.add(() => onCue?.('tease1'))
    tl.to(el, { rotation: -4, scaleY: 1.05, transformOrigin: '50% 90%', duration: 0.3, ease: 'power1.out' })
    tl.to(el, { rotation: -1, scaleY: 1.0, duration: 0.24, ease: 'power1.inOut' })
    // 予備動作2: もう少し大きく…出ない…
    tl.add(() => onCue?.('tease2'))
    tl.to(el, { rotation: -8, scaleY: 1.1, scaleX: 0.96, duration: 0.32, ease: 'power1.out' })
    tl.to(el, { rotation: -3, scaleY: 1.02, scaleX: 1, duration: 0.26, ease: 'power1.inOut' })
    // 大きく吸い込む(ため)
    tl.add(() => onCue?.('inhale'))
    tl.to(el, { rotation: -14, scaleY: 1.2, scaleX: 0.88, y: dy - 10, duration: 0.42, ease: 'power2.out' })
    // 一瞬止めて(出るぞ出るぞ)…ヘックシュン! 前方へ弾ける
    tl.add(() => {
      onCue?.('burst')
      onBurst?.()
    }, '+=0.12')
    tl.to(el, { rotation: 12, scaleY: 0.68, scaleX: 1.36, y: dy + 12, duration: 0.13, ease: 'power3.in' })
    tl.to(el, { rotation: 0, scaleY: 1, scaleX: 1, y: dy, duration: 1.0, ease: JELLY.returnEase })
    return tl
  }

  // 眠りに落ちるシーケンス(長押し保持中)。段階ごとに onStage を呼ぶ。
  // 途中で指を離されたら親が kill する(戻しは cancelSleep)
  const sleepSequence = ({ onStage, onAsleep } = {}) => {
    const el = bodyRef.value
    if (!el) return null
    const tl = gsap.timeline({ onComplete: onAsleep })
    tl.add(() => onStage?.('blink'), SLEEP_STAGES.blink)
    tl.add(() => onStage?.('sleepy'), SLEEP_STAGES.sleepy)
    // 呼吸: 体がゆっくり上下
    tl.add(() => onStage?.('breathe'), SLEEP_STAGES.breathe)
    tl.to(el, { scaleY: 1.06, scaleX: 0.97, transformOrigin: '50% 100%', duration: 0.55, ease: 'sine.inOut', yoyo: true, repeat: 3 }, SLEEP_STAGES.breathe)
    // 頭コクッ
    tl.add(() => onStage?.('nod'), SLEEP_STAGES.nod)
    tl.to(el, { rotation: 10, y: 6, duration: 0.16, ease: 'power3.in' }, SLEEP_STAGES.nod)
    tl.to(el, { rotation: 4, y: 3, duration: 0.55, ease: 'power2.out' }, SLEEP_STAGES.nod + 0.2)
    // 眠り確定: 少し傾いたまま
    tl.to(el, { rotation: 7, y: 5, duration: 0.5, ease: 'sine.inOut' }, SLEEP_STAGES.asleep - 0.4)
    return tl
  }

  // 眠りかけキャンセル: しゃきっと元の姿勢へ
  const cancelSleep = (tl) => {
    tl?.kill()
    if (!bodyRef.value) return
    gsap.to(bodyRef.value, { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, duration: 0.5, ease: 'back.out(2.5)', overwrite: 'auto' })
  }

  // びくっ！と飛び上がって起きる(鼻提灯の破裂は Moppo 側で同時に鳴らす)
  const wakeStartle = (onDone) => {
    const el = bodyRef.value
    if (!el) return
    gsap
      .timeline({ onComplete: onDone })
      .to(el, { y: -48, rotation: 0, scaleY: 1.16, scaleX: 0.9, duration: 0.16, ease: 'power3.out', transformOrigin: '50% 100%', overwrite: 'auto' })
      .to(el, { y: 0, scaleY: 0.82, scaleX: 1.2, duration: 0.2, ease: 'power2.in' })
      .to(el, { scaleY: 1, scaleX: 1, duration: 0.9, ease: JELLY.returnEase })
  }

  // 眠り中のゆったりした呼吸(繰り返し)。起きたら kill する
  const sleepBreathe = () => {
    if (!bodyRef.value) return null
    return gsap.to(bodyRef.value, {
      scaleY: 1.05,
      scaleX: 0.975,
      transformOrigin: '50% 100%',
      duration: 1.4,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })
  }

  // 待機中のゆったりした呼吸(ゼリーがふるふるする程度)
  const breathe = () => {
    if (!bodyRef.value) return null
    return gsap.to(bodyRef.value, {
      scaleY: 1.035,
      scaleX: 0.985,
      transformOrigin: '50% 100%',
      duration: 1.6,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })
  }

  return { startFollow, followTo, returnHome, squishPop, sneezeAt, sleepSequence, cancelSleep, wakeStartle, sleepBreathe, breathe, walkOut, stopWalk, tada }
}

// ボタン等を「ぷにっ」と潰して戻す共通ヘルパ(トグル/チップのタップ演出用)。
// 押した瞬間に横へ伸びて縦に潰れ、elastic で数回ぷるんと揺れて戻る
export function jellyTap(el) {
  if (!el) return
  gsap.killTweensOf(el)
  return gsap
    .timeline()
    .to(el, { scaleX: 1.14, scaleY: 0.82, duration: 0.09, ease: 'power2.out', transformOrigin: '50% 100%' })
    .to(el, { scaleX: 1, scaleY: 1, duration: 0.85, ease: JELLY.returnEase })
}

// コインやカードを「ぷるん」と出す共通ヘルパ(TalkFan / DropZones / SneezeModal 用)
export function jellyPopIn(elements, { stagger = JELLY.popStagger } = {}) {
  return gsap.fromTo(
    elements,
    { scale: 0, opacity: 0 },
    {
      scale: 1,
      opacity: 1,
      duration: JELLY.popDuration,
      ease: JELLY.popEase,
      stagger,
      transformOrigin: '50% 80%',
      clearProps: 'scale',
    },
  )
}
