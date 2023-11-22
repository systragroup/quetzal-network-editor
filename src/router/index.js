import { createRouter, createWebHistory } from 'vue-router'
import Import from '@page/Import.vue'
import Home from '@page/Home.vue'
import { useRunStore } from '@src/store/run'
import { useIndexStore } from '../store'

const ResultMap = () => import('@page/ResultMap.vue')
const Run = () => import('@page/Run.vue')
const ResultPicture = () => import('@page/ResultPicture.vue')
const ResultTable = () => import('@page/ResultTable.vue')
// import Run from '@page/Run.vue'
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
    {
      path: '/Run',
      name: Run.name,
      component: Run,
      icon: 'fa-solid fa-play',
      title: $gettext('Parameters and Run'),
      beforeEnter: (to, from, next) => {
        const store = useIndexStore()
        const runStore = useRunStore()
        if (runStore.parametersIsEmpty) {
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
    },
    {
      path: '/ResultTable',
      name: ResultTable.name,
      component: ResultTable,
      icon: 'fas fa-table',
      title: $gettext('Result Table'),

    },

  ],
})

export default router
