import { createRouter, createWebHistory } from 'vue-router'
import HubView from '../views/HubView.vue'

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
      component: () => import('../views/PlaceholderScreen.vue'),
    },
  ],
})

export default router
