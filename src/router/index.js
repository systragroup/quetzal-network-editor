import { createRouter, createWebHistory } from 'vue-router'
import Import from '@page/Import.vue'
import Home from '@page/Home.vue'

// only used to force to see translation to vue-gettext
const $gettext = s => s

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: Import.name,
      component: Import,
      icon: 'fa-solid fa-upload',
      title: $gettext('Import'),
    },
    {
      path: '/Home',
      name: Home.name,
      component: Home,
      icon: 'fa-solid fa-map',
      title: $gettext('Map'),
    },

  ],
})

export default router
