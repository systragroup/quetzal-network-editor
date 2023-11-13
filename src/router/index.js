import { createRouter, createWebHistory } from 'vue-router'
import Home from '@page/Home.vue'

// only used to force to see translation to vue-gettext
const $gettext = s => s

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: Home.name,
      component: Home,
      icon: 'fas fa-house',
      title: $gettext('Home'),
    },

  ],
})

export default router
