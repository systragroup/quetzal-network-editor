import Vue from 'vue'
import Router from 'vue-router'
import Login from '@page/Login.vue'
import Home from '@page/Home.vue'


Vue.use(Router)

// only used to force to see translation to vue-gettext
const $gettext = s => s

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/login',
      name: Login.name,
      component: Login,
      icon: 'fa-light fa-file-import',
      title: $gettext('Login'),
    },
    {
      path: '/',
      name: Home.name,
      component: Home,
      icon: 'fas fa-home',
      title: $gettext('Home'),
    }
  ],
})
