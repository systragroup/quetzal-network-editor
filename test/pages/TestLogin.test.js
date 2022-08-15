import { shallowMount, createLocalVue } from '@vue/test-utils'
import Login from '@page/Login.vue'
import VueRouter from 'vue-router'

const localVue = createLocalVue()
localVue.use(VueRouter)
const router = new VueRouter()

describe('Login', () => {
  let wrapper

  const $gettext = jest.fn(txt => txt)
  const $store = {
    commit: jest.fn(),
    getters: {
      route: 'Test',
    },
  }

  beforeEach(() => {
    router.push = jest.fn()
    wrapper = shallowMount(Login, {
      localVue,
      router,
      mocks: {
        $store,
        $gettext,
      },
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('mounted', () => {
    it('should have been mounted', () => {
      expect(wrapper.find('.layout').exists()).toBe(true)
      expect(wrapper.vm.$store.commit).toHaveBeenCalledWith('changeRoute', 'Login')
      expect(wrapper.vm.loggedIn).toBe(false)
    })
  })

  describe('login', () => {
    it('should go to home page after animation delay', () => {
      jest.useFakeTimers()
      const routerSpy = jest.spyOn(wrapper.vm.$router, 'push')
      wrapper.vm.login()
      expect(wrapper.vm.loggedIn).toBe(true)
      jest.advanceTimersByTime(1000)
      expect(routerSpy).toHaveBeenCalledWith('/')
    })
  })
})
