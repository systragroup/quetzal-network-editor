import { shallowMount } from '@vue/test-utils'
import Welcome from '@comp/Welcome.vue'

describe('Welcome', () => {
  let wrapper

  const $gettext = jest.fn(txt => txt)

  beforeEach(() => {
    wrapper = shallowMount(Welcome, {
      mocks: {
        $gettext,
      },
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('mounted', () => {
    it('should have been mounted', () => {
      expect(wrapper.find('.welcome').exists()).toBe(true)
    })
  })

  describe('emitAddPostEvent', () => {
    it('should emit correct event', () => {
      wrapper.vm.$emit = jest.fn()
      wrapper.vm.emitAddPostEvent()
      expect(wrapper.vm.$emit).toHaveBeenCalledWith('addPost', 'Add')
    })
  })
})
