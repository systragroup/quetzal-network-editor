/* eslint-disable import/first */
jest.mock('mapbox-gl/dist/mapbox-gl', () => ({ Map: jest.fn() }))
import { shallowMount, createLocalVue } from '@vue/test-utils'
import App from '@src/App.vue'
import VueRouter from 'vue-router'

const localVue = createLocalVue()
localVue.use(VueRouter)

describe('App', () => {
  let wrapper

  const $gettext = jest.fn(txt => txt)
  const $store = {
    commit: jest.fn(),
    getters: {
      route: 'Home',
      notification: {},
      isAuthenticated: true,
    },
  }

  beforeEach(() => {
    wrapper = shallowMount(App, {
      mocks: {
        $gettext,
        $store,
      },
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('mounted', () => {
    it('should have been mounted', () => {
      expect(wrapper.find('.app').exists()).toBe(true)
    })
  })

  describe('closeSnackbar', () => {
    it('should hide snackbar', () => {
      wrapper.vm.closeSnackbar()
      expect(wrapper.vm.snackbar).toBe(false)
    })
  })

  describe('notification', () => {
    it('should open snackbar', () => {
      const notification = {
        text: 'Error message',
        autoClose: false,
        type: 'error',
      }
      expect(wrapper.find('.snackbar').element.className).toBe('snackbar snackbar-undefined')
      wrapper.vm.$store.getters.notification = notification
      wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.snackbar).toBe(true)
        expect(wrapper.find('.snackbar').element.className).toBe('snackbar snackbar-error')
        expect(wrapper.text()).toContain('Error message')
      })
    })
  })
})
