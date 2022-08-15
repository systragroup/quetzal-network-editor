/* eslint-disable import/first */
jest.mock('mapbox-gl/dist/mapbox-gl', () => ({ Map: jest.fn() }))
import { shallowMount, createLocalVue } from '@vue/test-utils'
import NavigationDrawer from '@comp/layout/NavigationDrawer.vue'
import Vuetify from 'vuetify'
import VueRouter from 'vue-router'

const localVue = createLocalVue()
localVue.use(VueRouter)
const router = new VueRouter()
const vuetify = new Vuetify()

describe('NavigationDrawer', () => {
  let wrapper

  const $gettext = jest.fn(txt => txt)
  const $gettextInterpolate = jest.fn(
    (tpl, vars) => Object.entries(vars).reduce((s, [key, value]) => s.replaceAll(`%{${key}}`, value), tpl),
  )
  const $store = {
    commit: jest.fn(),
    getters: {
      route: 'Home',
    },
  }

  beforeEach(() => {
    wrapper = shallowMount(NavigationDrawer, {
      localVue,
      router,
      vuetify,
      mocks: {
        $store,
        $gettext,
        $gettextInterpolate,
      },
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('mounted', () => {
    it('should have been mounted', () => {
      expect(wrapper.find('.drawer').exists()).toBe(true)
    })
  })

  describe('getDisplayedRoutes', () => {
    it('should return routes with have an icon', async () => {
      await wrapper.setData({
        menuItems: [
          {
            name: 'Test1',
            title: 'Test1',
            icon: 'fas fa-edit',
          },
          {
            name: 'Login',
            title: 'Login',
          },
          {
            name: 'Test2',
            title: 'Test2',
            icon: '',
          },
          {
            name: 'Test3',
            title: 'Test3',
            icon: 'fas fa-times',
          },
        ],
      })
      expect(wrapper.vm.getDisplayedRoutes()).toEqual([
        {
          name: 'Test1',
          title: 'Test1',
          icon: 'fas fa-edit',
        },
        {
          name: 'Test3',
          title: 'Test3',
          icon: 'fas fa-times',
        },
      ])
    })
  })

  describe('isLoginPage', () => {
    it('should be false', () => {
      expect(wrapper.vm.isLoginPage).toBe(false)
      expect(wrapper.find('.drawer').isVisible()).toBe(true)
    })
    it('should be true', async () => {
      wrapper.vm.$store.getters.route = 'Login'
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.isLoginPage).toBe(true)
      expect(wrapper.find('.drawer').isVisible()).toBe(false)
    })
  })

  describe('handleClickMenuItem', () => {
    it('should redirect to path and set navigation drawer to mini', () => {
      const menuItem = {
        path: '/map',
        name: 'Map',
        icon: 'fas fa-map-marker',
        title: 'Carte',
      }
      const routerSpy = jest.spyOn(wrapper.vm.$router, 'push')
      wrapper.vm.handleClickMenuItem(menuItem)
      expect(wrapper.vm.mini).toBe(true)
      expect(routerSpy).toHaveBeenCalledWith('/map')
    })
  })

  describe('handleClickMenuItemDisconnect', () => {
    it('should redirect to login if disconnect clicked', () => {
      const menuItem = {
        name: 'Disconnect',
        icon: 'fas fa-sign-out-alt',
        title: 'Se déconnecter',
      }
      const routerSpy = jest.spyOn(wrapper.vm.$router, 'push')
      wrapper.vm.handleClickMenuItem(menuItem)
      expect(routerSpy).toHaveBeenCalledWith('/login')
    })
  })
})
