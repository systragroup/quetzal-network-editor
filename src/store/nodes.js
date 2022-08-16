import points from '@static/nodes_test.geojson'

export default {
    state: {
      nodesAreLoaded: false,
      nodes: points, 

    },
  
    mutations: {
      nodeLoaded(state) {
        state.nodesAreLoaded = true
      },
  
    },
  
    getters: {
      nodesAreLoaded: (state) => state.nodesAreLoaded,
      nodes: (state) => state.nodes,
    
    },
  }