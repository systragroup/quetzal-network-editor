import { shallowMount } from '@vue/test-utils'
import PostList from '@comp/PostList.vue'

describe('PostList', () => {
  let wrapper

  const $gettext = jest.fn(txt => txt)

  beforeEach(() => {
    wrapper = shallowMount(PostList, {
      propsData: {
        items: [],
        search: '',
      },
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
      expect(wrapper.find('.posts').exists()).toBe(true)
    })
  })

  describe('searchChangeEvent', () => {
    it('should emit correct event', () => {
      wrapper.vm.$emit = jest.fn()
      const searchTerms = 'test'
      wrapper.vm.searchChangeEvent(searchTerms)
      expect(wrapper.vm.$emit).toHaveBeenCalledWith('search', searchTerms)
    })
  })
})
