import line from '@static/links_test.geojson'

// Filter links from selected line


function cutTripFromNode(nodeId) {

  // Get links to delete

  let toDelete = [];

  for (const [i, link] of editorLinks.features.entries()) {

    if (link.properties.b == nodeId) {

      toDelete = editorLinks.features.slice(i + 1);

      break;

    }

  }

  // Delete links

  links.features = links.features.filter(item => !toDelete.includes(item));

}



function cutTripToNode(links,editorLinks,nodeId) {

  // Get links to delete

  let toDelete = [];

  for (const [i, link] of editorLinks.features.entries()) {

    if (link.properties.a == nodeId) {

      toDelete = editorLinks.features.slice(0, i);

      console.log(toDelete)

      break;

    }

  }

  // Delete links

  links.features = links.features.filter(item => !toDelete.includes(item));
  return links

}






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
      test(state,payload){
        console.log(payload)
      },
      cutLineFromNode(state,payload)
      {
        console.log(state.links.features.length)
        // Filter links from selected line
        let activeTrip = payload.editorTrip;

        let nodeId = payload.nodeId

        let editorLinks = {...state.links};

        editorLinks.features = [];
        editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)
        state.links = cutTripToNode(state.links,editorLinks,nodeId)

      }

        
  
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

  



