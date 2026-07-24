import { createRouter, createWebHistory } from 'vue-router'
import HubView from '../views/HubView.vue'
// 遷移先はプレースホルダ1種。遅延importにすると初回遷移でチャンク取得待ちが入り、
// その間モッポの選択演出が一瞬見えてしまうので、静的importで即時遷移にする
import PlaceholderScreen from '../views/PlaceholderScreen.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'hub',
      component: HubView,
    },
    {
      // 遷移先11種はプレースホルダ(タイトル+戻るだけ)
      path: '/screen/:id',
      name: 'screen',
      component: PlaceholderScreen,
    },
  ],
})

export default router
