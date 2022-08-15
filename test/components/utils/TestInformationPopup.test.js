import { shallowMount } from '@vue/test-utils'
import InformationPopup from '@comp/utils/InformationPopup.vue'

describe('InformationPopup', () => {
  let wrapper

  const $gettext = jest.fn(txt => txt)
  const $gettextInterpolate = jest.fn(
    (tpl, vars) => Object.entries(vars).reduce((s, [key, value]) => s.replaceAll(`%{${key}}`, value), tpl),
  )

  beforeEach(() => {
    wrapper = shallowMount(InformationPopup, {
      propsData: {
        model: true,
        title: 'test',
        buttons: [],
      },
      mocks: {
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
      expect(wrapper.find('.text').exists()).toBe(true)
    })
  })

  describe('handleButtonClick', () => {
    it('should emit correct event without params', () => {
      const button = {
        label: 'Annuler',
        icon: 'fas fa-times',
        color: 'lightgrey',
        event: 'toggleAddProjectDialog',
        params: [],
      }
      wrapper.vm.$emit = jest.fn()
      wrapper.vm.handleButtonClick(button)
      expect(wrapper.vm.$emit).toHaveBeenCalledWith('toggleAddProjectDialog')
    })
    it('should emit correct event with params', () => {
      const button = {
        label: 'Détruire',
        icon: 'fas fa-trash',
        color: 'lightgrey',
        event: 'destroy',
        params: ['p1', 'p2'],
      }
      wrapper.vm.$emit = jest.fn()
      wrapper.vm.handleButtonClick(button)
      expect(wrapper.vm.$emit).toHaveBeenCalledWith('destroy', 'p1', 'p2')
    })
  })
})
