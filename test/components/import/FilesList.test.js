import { shallowMount } from '@vue/test-utils'
import FilesList from '@comp/import/FilesList.vue'

describe('FilesList', () => {
  let wrapper
  const $gettext = jest.fn(txt => txt)
  const $store = {
    commit: jest.fn(),
    getters: {
      otherFiles: [],
      availableLayers: [],
    },
  }

  beforeEach(() => {
    wrapper = shallowMount(FilesList, {

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
      expect(wrapper.find('div').exists()).toBe(true)
    })
  })
})
