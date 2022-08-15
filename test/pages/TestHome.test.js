import { shallowMount, createLocalVue } from '@vue/test-utils'
import Home from '@page/Home.vue'
import { getAllPostsQuery } from '@src/queries.js'

const localVue = createLocalVue()

describe('Home', () => {
  let wrapper
  let $store
  let $router
  let $gettext
  let allPosts
  let $apollo

  beforeEach(async () => {
    $store = {
      commit: jest.fn(),
    }
    $router = {
      push: jest.fn(),
    }
    $gettext = jest.fn(txt => txt)
    allPosts = {
      edges: [
        { node: { id: 'post1' } },
        { node: { id: 'post2' } },
      ],
    }
    $apollo = {
      query: jest.fn().mockResolvedValue({
        data: { allPosts },
      }),
    }
    wrapper = await shallowMount(Home, {
      localVue,
      mocks: {
        $store,
        $router,
        $gettext,
        $apollo,
        $flatEdges: localVue.$flatEdges,
      },
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('mounted', () => {
    it('should have been mounted', () => {
      expect(wrapper.find('.home-view').exists()).toBe(true)
      expect(wrapper.vm.$store.commit).toHaveBeenCalledWith('changeRoute', 'Home')
      expect(wrapper.vm.posts.length).toBe(2)
    })
  })

  describe('addPostEvent', () => {
    it('should redirect to post add page', () => {
      wrapper.vm.addPostEvent()
      expect(wrapper.vm.$router.push).toHaveBeenCalledWith({ name: 'PostAdd' })
    })
  })

  describe('searchEvent', () => {
    it('should update results', async () => {
      $apollo.query = jest.fn().mockResolvedValue({
        data: {
          allPosts: {
            edges: [
              { node: { id: 'post2' } },
            ],
          },
        },
      })
      await wrapper.vm.searchEvent('some text')
      expect(wrapper.vm.search).toEqual('some text')
      expect($apollo.query).toHaveBeenCalledWith({
        query: getAllPostsQuery,
        variables: {
          search: 'some text',
        },
      })
      expect(wrapper.vm.posts).toEqual([
        { id: 'post2' },
      ])
    })
  })
})
