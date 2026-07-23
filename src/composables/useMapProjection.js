// Google Maps の projection を使って「緯度経度 → 地図コンテナ内の画面px」を返す composable。
// 靄セルをジオ座標に固定し、パン/ズームに追従させるために使う。
// 仕組み: 空の OverlayView を地図に載せると draw() がパン/ズームのたびに呼ばれる。
// そこで getProjection().fromLatLngToContainerPixel() が使えるので、tick を進めて
// 消費側(セル矩形の再計算)を反応させる。
import { onBeforeUnmount, ref } from 'vue'

export function useMapProjection() {
  const ready = ref(false)
  const tick = ref(0) // パン/ズームのたびに増える。消費側の computed はこれを touch して追従する
  let overlay = null
  let api = null
  let listeners = []

  const teardown = () => {
    listeners.forEach((l) => l.remove?.())
    listeners = []
    if (overlay) overlay.setMap(null)
    overlay = null
    ready.value = false
  }

  // 地図が用意できたら呼ぶ。map=google.maps.Map / gapi=google.maps 名前空間
  const setup = (map, gapi) => {
    teardown()
    api = gapi
    overlay = new api.OverlayView()
    overlay.onAdd = () => {}
    overlay.onRemove = () => {}
    overlay.draw = () => {
      ready.value = true
      tick.value++
    }
    overlay.setMap(map)
    // draw はズーム時などに呼ばれるが、ドラッグ中の連続追従には bounds_changed も拾う
    listeners.push(map.addListener('bounds_changed', () => tick.value++))
  }

  // 緯度経度 → コンテナ内px({x,y})。未準備なら null
  const project = (lat, lng) => {
    const proj = overlay?.getProjection()
    if (!proj || !api) return null
    const p = proj.fromLatLngToContainerPixel(new api.LatLng(lat, lng))
    return p ? { x: p.x, y: p.y } : null
  }

  onBeforeUnmount(teardown)

  return { ready, tick, setup, teardown, project }
}
