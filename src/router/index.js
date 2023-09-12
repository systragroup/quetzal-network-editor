import Vue from 'vue'
import Router from 'vue-router'
import Import from '@page/Import.vue'

import auth from '../auth'
import Home from '@page/Home.vue'
import { store } from '../store/index.js'
const Microservices = () => import('@page/Microservices.vue')
const ResultMap = () => import('@page/ResultMap.vue')
const Run = () => import('@page/Run.vue')
const ResultPicture = () => import('@page/ResultPicture.vue')
const ResultTable = () => import('@page/ResultTable.vue')
const basePath = process.env.VUE_APP_BASE_PATH

Vue.use(Router)

// only used to force to see translation to vue-gettext
const $gettext = s => s

const router = new Router({
  linkExactActiveClass: 'active',
  mode: 'history',
  base: basePath,
  routes: [
    {
      path: '/',
      name: Import.name,
      component: Import,
      icon: 'fa-solid fa-upload',
      title: $gettext('Import'),
    },
    {
      path: '/Microservices',
      name: Microservices.name,
      component: Microservices,
      icon: 'fas fa-tachometer-alt',
      title: $gettext('Microservices'),
      beforeEnter: (to, from, next) => {
        if (!store.getters.loggedIn) {
          store.commit('changeNotification',
            {
              text: $gettext('Must be logged in'),
              autoClose: true,
              color: 'error',
            })
        } else {
          next()
        }
      },
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
        if (store.getters['run/parametersIsEmpty']) {
          store.commit('changeNotification',
            {
              text: $gettext('you need parameters to enter this page'),
              autoClose: true,
              color: 'error',
            })
        } else {
          next()
        }
      },
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
      beforeEnter: (to, from, next) => {
        if (store.getters.scenario === null) {
          store.commit('changeNotification',
            {
              text: $gettext('A scenario must be loaded to enter this page'),
              autoClose: true,
              color: 'error',
            })
        } else {
          next()
        }
      },
    },
    {
      path: '/ResultTable',
      name: ResultTable.name,
      component: ResultTable,
      icon: 'fas fa-table',
      title: $gettext('Result Table'),
      beforeEnter: (to, from, next) => {
        if (store.getters.scenario === null) {
          store.commit('changeNotification',
            {
              text: $gettext('A scenario must be loaded to enter this page'),
              autoClose: true,
              color: 'error',
            })
        } else {
          next()
        }
      },
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
