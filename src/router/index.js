import Vue from 'vue'
import Router from 'vue-router'
import Login from '@page/Login.vue'
import Home from '@page/Home.vue'
import Map from '@page/Map.vue'
import PostAdd from '@page/PostAdd.vue'
import Post from '@page/Post.vue'
import Category from '@page/Category.vue'

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
    },
    {
      path: '/',
      name: Home.name,
      component: Home,
      icon: 'fas fa-home',
      title: $gettext('Home'),
    },
    {
      path: '/map',
      name: Map.name,
      component: Map,
      icon: 'fas fa-map-marker',
      title: $gettext('Map'),
    },
    {
      path: '/add-post',
      name: PostAdd.name,
      component: PostAdd,
      icon: 'fas fa-plus',
      title: $gettext('Add a blog post'),
    },
    {
      path: '/post/:id',
      name: Post.name,
      component: Post,
    },
    {
      path: '/category/:id',
      name: Category.name,
      component: Category,
    },
  ],
})
