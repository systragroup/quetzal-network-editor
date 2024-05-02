import { createRouter, createWebHistory } from 'vue-router'
import Import from '@page/Import.vue'
import { useRunStore } from '@src/store/run'
import { useIndexStore } from '../store'
import { useUserStore } from '../store/user'
const Home = () => import('@page/Home.vue')

const ResultMap = () => import('@page/ResultMap.vue')
const Run = () => import('@page/Run.vue')
const ResultPicture = () => import('@page/ResultPicture.vue')
const ResultTable = () => import('@page/ResultTable.vue')
const Microservices = () => import('@page/Microservices.vue')

const basePath = import.meta.env.VITE_BASE_PATH
const $gettext = s => s

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  base: basePath,
  routes: [
    {
      path: '/',
      name: 'Import',
      component: Import,
      icon: 'fa-solid fa-upload',
      title: $gettext('Import'),
    },
    {
      path: '/Microservices',
      name: 'Microservices',
      component: Microservices,
      icon: 'fas fa-tachometer-alt',
      title: $gettext('Microservices'),
      beforeEnter: (to, from, next) => {
        const store = useIndexStore()
        const userStore = useUserStore()
        if (!userStore.loggedIn) {
          store.changeNotification(
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
      name: 'Home',
      component: Home,
      icon: 'fa-solid fa-map',
      title: $gettext('Map'),
    },
    {
      path: '/Run',
      name: 'Run',
      component: Run,
      icon: 'fa-solid fa-play',
      loading: false,
      title: $gettext('Parameters and Run'),
      beforeEnter: (to, from, next) => {
        const store = useIndexStore()
        const runStore = useRunStore()
        if (runStore.parametersIsEmpty) {
          store.changeNotification(
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
      name: 'ResultMap',
      component: ResultMap,
      margin: '5rem',
      icon: 'fa-solid fa-layer-group',
      title: $gettext('Results Map'),
    },
    {
      path: '/ResultPicture',
      name: 'ResultPicture',
      component: ResultPicture,
      icon: 'fas fa-images',
      title: $gettext('Results Pictures'),
    },
    {
      path: '/ResultTable',
      name: 'ResultTable',
      component: ResultTable,
      icon: 'fas fa-table',
      title: $gettext('Result Table'),

    },

  ],
})

router.beforeEach((to, from, next) => {
  if ((!['Import'].includes(to.name)) && !from.name) {
    next({ name: 'Import' })
  } else {
    next() }
})

router.afterEach(() => {
  // remove notification when we enter a page
  const store = useIndexStore()
  store.changeNotification({ text: '', autoClose: true })
})

export default router
