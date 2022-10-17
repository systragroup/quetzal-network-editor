import Vue from 'vue'
import Router from 'vue-router'
import Login from '@page/Login.vue'
import Home from '@page/Home.vue'
import { store } from '../store/index.js'

Vue.use(Router)

// only used to force to see translation to vue-gettext
const $gettext = s => s

const router = new Router({
  linkExactActiveClass: 'active',
  mode: 'history',
  base: '/quetzal-network-editor/',
  routes: [
    {
      path: '/',
      name: Login.name,
      component: Login,
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

router.beforeEach((to, from, next) => {
  if (to.name !== 'Login' && !store.getters.filesAreLoaded) next({ name: 'Login' })
  else if (to.path === 'login') next('Login')
  else next()
})

export default router
