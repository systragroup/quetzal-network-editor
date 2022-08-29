import line from '@static/links_test.geojson'
import points from '@static/nodes_test.geojson'


// Filter links from selected line








var linksHeader = {...line}
linksHeader.features = []
var nodesHeader = {...points}
nodesHeader.features = []


export default {
    state: {
      linksAreLoaded: false,
      nodesAreLoaded: false,
      links: line, 
      editorTrip: null,
      editorNodes: nodesHeader,
      editorLinks: linksHeader,
      editorLineInfo:{},
      nodes: points, 
      tripId : Array.from(new Set(line.features.map(item => item.properties.trip_id))) // to change with the actual import.
    },
  
    mutations: {
      linksLoaded(state) {
        state.linksAreLoaded = true
      },
      nodeLoaded(state) {
        state.nodesAreLoaded = true
      },

      setEditorTrip(state,payload){
        //set Trip Id
        state.editorTrip = payload
        // set editor links corresponding to trip id
        //var filtered = {...state.links}
        var filtered = JSON.parse(JSON.stringify(state.links))
        filtered.features = filtered.features.filter(link => link.properties.trip_id == state.editorTrip); 
        state.editorLinks = filtered
        // get the corresponding nodes
        this.commit('getEditorNodes',{nodes:state.nodes})
        this.commit('getEditorLineInfo')
      },
      getEditorNodes(state,payload){
        // payload contain nodes. state.nodes or state.editorNodes
        // find the nodes in the editor links
        let a = state.editorLinks.features.map(item => item.properties.a)
        let b = state.editorLinks.features.map(item => item.properties.b)
        let editorNodesList =  Array.from(new Set([...a, ...b]))
        // set nodes corresponding to trip id
        var filtered = JSON.parse(JSON.stringify(payload.nodes))
        filtered.features = filtered.features.filter(node => editorNodesList.includes(node.properties.index)); 
        state.editorNodes = filtered
      },

      getEditorLineInfo(state){
        if (state.editorLinks.features.length==0){
          state.editorLineInfo={}
        }
        else{
        const filteredKeys = ['id','index','a','b','shape_dist_traveled','link_sequence','pickup_type','drop_off_type','time'];
        let filtered = Object.keys(state.editorLinks.features[0].properties)
          .filter(key => !filteredKeys.includes(key))
          .reduce((obj, key) => {
            obj[key] = state.editorLinks.features[0].properties[key];
            return obj;
          }, {});
        state.editorLineInfo = filtered
        }
      },
      getTripId(state){
        state.tripId = Array.from(new Set(state.links.features.map(item => item.properties.trip_id)))
      },

      //apply change to Links
      confirmChanges(state){

        //delete links with trip_id == editorTrip
        var filtered = {...state.links}
        filtered.features = filtered.features.filter(link => link.properties.trip_id == state.editorTrip); 
        let toDelete = filtered.features.filter(item => !state.editorLinks.features.includes(item))
        //find index of soon to be deleted links
        let index = state.links.features.findIndex(link => link.properties.trip_id == state.editorTrip)
        state.links.features = state.links.features.filter(item => !toDelete.includes(item));
        //add edited links to links.
        state.links.features.splice(index, 0, ...state.editorLinks.features);



        state.nodes.features.filter(
          function (node){state.editorNodes.features.forEach(
            function (eNode){
              if (node.properties.index == eNode.properties.index){
                  node.properties = eNode.properties
              }
            }
          )
    
          }
        )

        this.commit('getTripId')

      },

      

      //
      //actions
      //

      cutLineFromNode(state,payload)
      {
        // Filter links from selected line
        let nodeId = payload.selectedNode.index
        state.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)

        let toDelete = [];
        for (const [i, link] of state.editorLinks.features.entries()) {
          if (link.properties.b == nodeId) {
            toDelete = state.editorLinks.features.slice(i + 1);
            break;
          }
        }
        // Delete links
        state.editorLinks.features = state.editorLinks.features.filter(item => !toDelete.includes(item));
        this.commit('getEditorNodes',{nodes:state.editorNodes})
      },

      cutLineAtNode(state,payload)
      {
        // Filter links from selected line
        let nodeId = payload.selectedNode.index
        state.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)

        let toDelete = [];
        for (const [i, link] of state.editorLinks.features.entries()) {
          if (link.properties.a == nodeId) {
            toDelete = state.editorLinks.features.slice(0, i);
            break;
          }
        }
        // Delete links
        state.editorLinks.features = state.editorLinks.features.filter(item => !toDelete.includes(item));
        this.commit('getEditorNodes',{nodes:state.editorNodes})
      },
      editLineInfo(state,payload)
      {
        state.editorLineInfo = payload
        let props = Object.keys(payload)
        state.editorLinks.features.forEach((features)=> props.forEach((key) => features.properties[key]=payload[key] ))
      },

      editLinkInfo(state,payload)
      {
        // get selected link in editorLinks and modify the changes attributes.
        let props = Object.keys(payload.info)
        state.editorLinks.features.filter(
          function (link){
            if (link.properties.index==payload.selectedLinkId){
              props.forEach((key) => link.properties[key] = payload.info[key] )
            }
          }
        )
      },
      editNodeInfo(state,payload)
      {
        // get selected node in editorNodes and modify the changes attributes.
        let props = Object.keys(payload.info)
        state.editorNodes.features.filter(
          function (node){
            if (node.properties.index==payload.selectedNodeId){
              props.forEach((key) => node.properties[key] = payload.info[key] )
            }
          }
        )
      },
      

        
  
    },
  
    getters: {
      linksAreLoaded: (state) => state.linksAreLoaded,
      nodesAreLoaded: (state) => state.nodesAreLoaded,
      links: (state) => state.links,
      nodes: (state) => state.nodes,
      route_id: (state) => state.route_id,
      editorTrip: (state) => state.editorTrip,
      editorLinks: (state) => state.editorLinks,
      editorNodes: (state) => state.editorNodes,
      tripId: (state) => state.tripId,
      editorLineInfo: (state) => state.editorLineInfo
      
    },
  }

  
  



