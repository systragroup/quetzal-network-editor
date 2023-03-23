import Vue from 'vue'
import Router from 'vue-router'
import Import from '@page/Import.vue'
import ResultPicture from '@page/ResultPicture.vue'
import auth from '../auth'
import Home from '@page/Home.vue'
import Run from '@page/Run.vue'
import ResultMap from '@page/ResultMap.vue'
import { store } from '../store/index.js'

Vue.use(Router)

// only used to force to see translation to vue-gettext
const $gettext = s => s

const router = new Router({
  linkExactActiveClass: 'active',
  mode: 'history',
  base: '/quetzal-network-editor-dev/',
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
    {
      path: '/Run',
      name: Run.name,
      component: Run,
      icon: 'fa-solid fa-play',
      title: $gettext('Parameters and Run'),
      beforeEnter: (to, from, next) => {
        if (store.getters.scenario === null) {
          store.commit('changeNotification', { text: $gettext('A scenario must be loaded to \
          enter this page'), autoClose: true, color: 'error'})
        } else {
          next()
        }
      }
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
    {
      path: '/callback',
      name: 'callback',
      beforeEnter: (to, from, next) => {
        const currUrl = window.location.href
        auth.auth.parseCognitoWebResponse(currUrl)
        next('/')
      },
    },
    {
      path: '/signout',
      name: 'signout',
      beforeEnter: (to, from, next) => {
        next('/')
      },
    },
  ],
})

// router.replace({ 'query.s3Path': null }) // remove query in url when page is load.

router.beforeEach((to, from, next) => {
  if ((!['Import', 'callback', 'signout'].includes(to.name)) &&
      store.getters.projectIsUndefined) {
    next({ name: 'Import' })
  } else next()
})

export default router
