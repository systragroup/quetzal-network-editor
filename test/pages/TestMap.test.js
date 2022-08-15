/* eslint-disable import/first */
jest.mock('mapbox-gl/dist/mapbox-gl', () => {
  class LngLatBounds {
    extend () {}
  }
  return {
    LngLatBounds,
    Map: jest.fn(),
  }
})
import { shallowMount, createLocalVue } from '@vue/test-utils'
import Map from '@page/Map.vue'
import VueRouter from 'vue-router'

const localVue = createLocalVue()
localVue.use(VueRouter)
const router = new VueRouter()

describe('Map', () => {
  let wrapper

  const $gettext = jest.fn(txt => txt)
  const $store = {
    commit: jest.fn(),
    getters: {
      route: 'Test',
    },
  }

  beforeEach(() => {
    wrapper = shallowMount(Map, {
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
    it('should have been mounted', async () => {
      expect(wrapper.find('.map-view').exists()).toBe(true)
      expect(wrapper.vm.$store.commit).toHaveBeenCalledWith('changeRoute', 'Map')
    })
  })

  describe('showLeftPanel', () => {
    it('should show left panel content after 0.5s', async () => {
      jest.useFakeTimers()
      await wrapper.setData({ showLeftPanel: true })
      return wrapper.vm.$nextTick().then(() => {
        jest.advanceTimersByTime(400)
        expect(wrapper.vm.showLeftPanelContent).toBe(false)
        jest.advanceTimersByTime(100)
        expect(wrapper.vm.showLeftPanelContent).toBe(true)
      })
    })
    it('should hide left panel content', async () => {
      await wrapper.setData({ showLeftPanel: true })
      await wrapper.vm.$nextTick(() => {
        return wrapper.setData({ showLeftPanel: false })
      })
      await wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.showLeftPanelContent).toBe(false)
      })
    })
  })

  describe('onMapLoaded', () => {
    const LngLatBounds = require('mapbox-gl/dist/mapbox-gl').LngLatBounds
    it('should define map bounds according to displayed main line', async () => {
      const extendSpy = jest.spyOn(LngLatBounds.prototype, 'extend')
      await wrapper.setData({
        line: {
          features: [{
            geometry: {
              coordinates: [[1, 1], [2, 2]],
            },
          }],
        },
      })
      const event = {
        map: {
          fitBounds: jest.fn(),
        },
      }
      wrapper.vm.onMapLoaded(event)
      expect(event.map.fitBounds).toHaveBeenCalled()
      expect(extendSpy).toHaveBeenCalledTimes(2)
      expect(extendSpy).toHaveBeenCalledWith([1, 1])
      expect(extendSpy).toHaveBeenCalledWith([2, 2])
    })
  })
})
