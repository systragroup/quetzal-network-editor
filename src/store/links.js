import line from '@static/links_test.geojson'


export default {
    state: {
      linksAreLoaded: false,
      links: line, //links: {},
      trip_id : []//Array.from(new Set(line.features.map(item => item.properties.trip_id)))
    },
  
    mutations: {
      linksLoaded(state) {
        state.linksAreLoaded = true
      },
  
    },
  
    getters: {
      linksAreLoaded: (state) => state.linksAreLoaded,
      links: (state) => state.links,
      route_id: (state) => state.route_id,
      trip_id (state) {
        return Array.from(new Set(state.links.features.map(item => item.properties.trip_id)))
      }
    },
  }