// 「何が起きたか」だけを判定して返すジェスチャー判定層。
// 見た目(どう動かすか)は useMoppoMotion に任せ、ここには一切書かない。
// ジェスチャーは grab / drag / release / tap / longPress / shake の5系統で打ち止め。
//
// pointerdown だけを要素で受け、move/up/cancel は window で追跡する。
// (要素の当たり判定は小さく、モッポは遅れて追従するため、要素上だけで
//  move を拾うと指が少し先行しただけでドラッグが途切れる)
import { onBeforeUnmount } from 'vue'
import {
  TAP_MAX_MOVE_PX,
  TAP_MAX_MS,
  LONG_PRESS_MS,
  SHAKE_REVERSALS,
  SHAKE_WINDOW_MS,
  SHAKE_MIN_SPEED,
} from '../constants/hubConfig'

/**
 * @param {import('vue').Ref<HTMLElement|null>} targetRef ジェスチャーを受ける要素
 * @param {{
 *   onGrab?: () => void,
 *   onDrag?: (p: {dx:number, dy:number, x:number, y:number}) => void,
 *   onRelease?: (p: {dx:number, dy:number, x:number, y:number}) => void,
 *   onTap?: () => void,
 *   onLongPress?: () => void,
 *   onLongPressEnd?: () => void,
 *   onShake?: () => void,
 * }} handlers
 */
export function useMoppoGesture(targetRef, handlers) {
  let pointerId = null
  let startX = 0
  let startY = 0
  let startTime = 0
  let grabbed = false
  let consumedBy = null // 'longPress' | 'shake'。発火後は release/tap を出さない

  // シェイク判定用: 横方向の移動符号が反転した時刻を溜める
  let lastMoveX = 0
  let lastMoveTime = 0
  let lastDirection = 0
  let reversalTimes = []

  let longPressTimer = null

  const clearLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  const attachWindow = () => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }
  const detachWindow = () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
  }

  const reset = () => {
    clearLongPress()
    detachWindow()
    pointerId = null
    grabbed = false
    consumedBy = null
    lastDirection = 0
    reversalTimes = []
  }

  const onPointerDown = (e) => {
    if (pointerId !== null) return // 2本目の指は無視
    pointerId = e.pointerId
    startX = e.clientX
    startY = e.clientY
    startTime = performance.now()
    grabbed = false
    consumedBy = null
    lastMoveX = e.clientX
    lastMoveTime = startTime
    lastDirection = 0
    reversalTimes = []
    try {
      // 画面外まで持って行かれてもイベントが続くように(失敗しても window 追跡で拾える)
      targetRef.value?.setPointerCapture(e.pointerId)
    } catch {
      /* 合成イベント等で pointerId が無効な場合は capture なしで続行 */
    }
    attachWindow()

    longPressTimer = setTimeout(() => {
      // 静止したままなら長押し成立。以降は保持継続 → 指を離した時に onLongPressEnd を返す
      consumedBy = 'longPress'
      handlers.onLongPress?.()
    }, LONG_PRESS_MS)
  }

  const onPointerMove = (e) => {
    if (e.pointerId !== pointerId || consumedBy) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (!grabbed && Math.hypot(dx, dy) >= TAP_MAX_MOVE_PX) {
      // タップの許容量を超えたら「つかんだ」。長押しはもう成立しない
      grabbed = true
      clearLongPress()
      handlers.onGrab?.()
    }
    if (!grabbed) return

    handlers.onDrag?.({ dx, dy, x: e.clientX, y: e.clientY })
    detectShake(e.clientX)
  }

  // 掴んだまま左右反転 SHAKE_REVERSALS 回 / SHAKE_WINDOW_MS 以内でくしゃみ
  const detectShake = (x) => {
    const now = performance.now()
    const moveX = x - lastMoveX
    const dt = now - lastMoveTime
    lastMoveX = x
    lastMoveTime = now
    if (dt <= 0) return
    const speed = Math.abs(moveX) / dt
    if (speed < SHAKE_MIN_SPEED) return // ゆっくりの往復では発火させない

    const direction = Math.sign(moveX)
    if (direction !== 0 && lastDirection !== 0 && direction !== lastDirection) {
      reversalTimes.push(now)
      reversalTimes = reversalTimes.filter((t) => now - t <= SHAKE_WINDOW_MS)
      if (reversalTimes.length >= SHAKE_REVERSALS) {
        consumedBy = 'shake'
        clearLongPress()
        handlers.onShake?.()
        return
      }
    }
    if (direction !== 0) lastDirection = direction
  }

  const onPointerUp = (e) => {
    if (e.pointerId !== pointerId) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const elapsed = performance.now() - startTime
    const wasGrabbed = grabbed
    const wasConsumedBy = consumedBy
    reset()

    if (wasConsumedBy === 'longPress') {
      // 長押し保持が終わった(眠り演出の途中キャンセル判断は親がする)
      handlers.onLongPressEnd?.()
      return
    }
    if (wasConsumedBy) return
    if (wasGrabbed) {
      handlers.onRelease?.({ dx, dy, x: e.clientX, y: e.clientY })
      return
    }
    if (Math.hypot(dx, dy) < TAP_MAX_MOVE_PX && elapsed < TAP_MAX_MS) {
      handlers.onTap?.()
    }
  }

  const onPointerCancel = (e) => {
    if (e.pointerId !== pointerId) return
    const wasGrabbed = grabbed && !consumedBy
    const wasLongPress = consumedBy === 'longPress'
    reset()
    if (wasLongPress) handlers.onLongPressEnd?.()
    else if (wasGrabbed) handlers.onRelease?.({ dx: 0, dy: 0, x: startX, y: startY })
  }

  const attach = () => {
    targetRef.value?.addEventListener('pointerdown', onPointerDown)
  }
  const detach = () => {
    targetRef.value?.removeEventListener('pointerdown', onPointerDown)
    detachWindow()
  }

  onBeforeUnmount(detach)

  return { attach, detach }
}
