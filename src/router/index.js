import Vue from 'vue'
import Router from 'vue-router'
import Login from '@page/Login.vue'
import ResultPicture from '@page/ResultPicture.vue'
import { store } from '../store/index.js'
import Home from '@page/Home.vue'
import DataFrame from '@page/DataFrame.vue'
import Run from '@page/Run.vue'
import ResultMap from '@page/ResultMap.vue'

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
    {
      path: '/Run',
      name: Run.name,
      component: Run,
      icon: 'fa-solid fa-play',
      title: $gettext('Parameters and Run'),
    },
    {
      path: '/ResultMap',
      name: ResultMap.name,
      component: ResultMap,
      icon: 'fa-solid fa-layer-group',
      title: $gettext('Results Map'),
    },
    {
      path: '/ResultPicture',
      name: ResultPicture.name,
      component: ResultPicture,
      icon: 'fas fa-images',
      title: $gettext('Results Pictures'),
    },
  ],
})

router.beforeEach((to, from, next) => {
  if (to.name !== 'Login' && store.getters.projectIsUndefined) next({ name: 'Login' })
  else if (to.path === 'login') next('Login')
  else next()
})

export default router
