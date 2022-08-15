import { shallowMount, createLocalVue } from '@vue/test-utils'
import Toolbar from '@comp/layout/Toolbar.vue'
import Vuetify from 'vuetify'
import VueRouter from 'vue-router'

const localVue = createLocalVue()
localVue.use(VueRouter)
const router = new VueRouter()
const vuetify = new Vuetify()

describe('Toolbar', () => {
  let wrapper

  const $gettext = jest.fn(txt => txt)
  const $language = {
    current: 'en',
    available: {
      en: 'English',
      fr: 'Français',
    },
  }
  const $store = {
    commit: jest.fn(),
    getters: {
      route: 'Home',
    },
  }
  const _i18n = {
    locale: 'en',
  }

  beforeEach(() => {
    wrapper = shallowMount(Toolbar, {
      localVue,
      router,
      vuetify,
      mocks: {
        $store,
        $gettext,
        $language,
        _i18n,
      },
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('mounted', () => {
    it('should have been mounted', () => {
      expect(wrapper.find('.app-toolbar').exists()).toBe(true)
    })
  })

  describe('isLoginPage', () => {
    it('should be false', () => {
      expect(wrapper.vm.isLoginPage).toBe(false)
      expect(wrapper.find('.project-name').exists()).toBe(true)
    })
    it('should be true', async () => {
      wrapper.vm.$store.getters.route = 'Login'
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.isLoginPage).toBe(true)
      expect(wrapper.find('.project-name').exists()).toBe(false)
    })
  })

  describe('handleChangeLanguage', () => {
    it('should change app and vuetify language', () => {
      expect(wrapper.vm.$vuetify.lang.current).toEqual('en')
      expect(wrapper.vm.$language.current).toEqual('en')
      const lang = 'fr'
      wrapper.vm.handleChangeLanguage(lang)
      expect(wrapper.vm.$vuetify.lang.current).toEqual('fr')
      expect(wrapper.vm.$language.current).toEqual('fr')
    })
  })
})
