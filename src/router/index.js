import Vue from 'vue'
import Router from 'vue-router'
import Login from '@page/Login.vue'
import { store } from '../store/index.js'
const Home = () => import('@page/Home.vue')
const DataFrame = () => import('@page/DataFrame.vue')

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
    {
      path: '/DataFrame',
      name: DataFrame.name,
      component: DataFrame,
      icon: 'fa-solid fa-table',
      title: $gettext('Table'),
    },
  ],
})

router.beforeEach((to, from, next) => {
  if (to.name !== 'Login' && store.getters.projectIsUndefined) next({ name: 'Login' })
  else if (to.path === 'login') next('Login')
  else next()
})

export default router
