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
      tripId : Array.from(new Set(line.features.map(item => item.properties.trip_id))), // to change with the actual import.
      newLink: {},
      newNode: {}
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

      setNewLink(state,payload){
        // copy editor links geoJSON, only take first (or last) link.
        // delete some properties like id and index.

        //first create a new Node
        this.commit('setNewNode')

        //create link
        var tempLink = JSON.parse(JSON.stringify(state.editorLinks))
        const filteredKeys = ['id','index','shape_dist_traveled','time']
        console.log(tempLink)
        if (payload.action == 'Extend Line Upward'){
          // put null on values values that should change
          console.log(tempLink.features.length-1)
          var features = tempLink.features[tempLink.features.length-1]
          Object.keys(features.properties)
            .filter((k) => filteredKeys.includes(k))
            .forEach(k => features.properties[k]=null);
          // sequence +1
          features.properties.link_sequence = features.properties.link_sequence+1
          //  replace node a by b and delete node a
          features.properties.a = features.properties.b
          features.geometry.coordinates[0] = features.geometry.coordinates[1]
          //new node index (hash)
          features.properties.b = state.newNode.features[0].properties.index
          
          
        }
        else{
          var features =  tempLink.features[0]
          Object.keys(features.properties)
            .filter((k) => filteredKeys.includes(k))
            .forEach(k => features.properties[k]=null);
          // sequence +1
          features.properties.link_sequence = features.properties.link_sequence-1
          //  replace node b by a and delete node b
          features.properties.b = features.properties.a
          features.geometry.coordinates[1] = features.geometry.coordinates[0]
          // new node index (hash)
          features.properties.a = state.newNode.features[0].properties.index
        }
        tempLink.features = [features]
        state.newLink = tempLink
        state.newLink.action=payload.action
        
      },

      setNewNode(state,payload){
        //node
        var tempNode =  JSON.parse(JSON.stringify(state.editorNodes))
        var features = tempNode.features[0]
        Object.keys(features.properties)
          .forEach(k => features.properties[k]=null);
        features.properties.index = (+new Date).toString(36)
        features.geometry.coordinates=[null,null]
        tempNode.features = [features]
        state.newNode = tempNode
        console.log(state.newNode)
      },

      editNewLink(state,payload){
        // for realtime viz. this method change the linestring to the payload (mouse position)
        // for some reason, it doesnt work when i only apply payload to coordianate[1]
        state.newNode.features[0].geometry.coordinates = payload
        if (state.newLink.action == 'Extend Line Upward'){
          state.newLink.features[0].geometry.coordinates=[state.newLink.features[0].geometry.coordinates[0], payload]
        }
        else{
          state.newLink.features[0].geometry.coordinates=[payload,state.newLink.features[0].geometry.coordinates[1]]
        }
      },
      applyNewLink(state,payload){
        let action = state.newLink.action
        this.commit('editNewLink',payload)
        if (action == 'Extend Line Upward'){
          state.editorLinks.features.push(state.newLink.features[0])
          state.editorNodes.features.push(state.newNode.features[0])
        }else{
          state.editorLinks.features.splice(0,0,state.newLink.features[0])
          state.editorNodes.features.splice(0,0,state.newNode.features[0])
        }
        // reset new link with updated editorLinks
        this.commit('setNewLink',{action:action})

      },

      //apply change to Links
      confirmChanges(state){

        //delete links with trip_id == editorTrip
        var filtered = {...state.links}
        filtered.features = filtered.features.filter(link => link.properties.trip_id == state.editorTrip); 
        let toDelete = filtered.features.filter(item => !state.editorLinks.features.includes(item))
        //find index of soon to be deleted links
        let index = state.links.features.findIndex(link => link.properties.trip_id == state.editorTrip)
        // delete links that were edited.
        state.links.features = state.links.features.filter(item => !toDelete.includes(item));
        //add edited links to links.
        state.links.features.splice(index, 0, ...state.editorLinks.features);


        //TODO : ajouter les noeds si des noeds sont ajout/

        // for each editor nodes, apply new properties.
        state.nodes.features.filter(
          function (node){state.editorNodes.features.forEach(
            function (eNode){
              if (node.properties.index == eNode.properties.index){
                  node.properties = eNode.properties
              }
            })
          })

        // delete every every nodes not in links
        let a = state.links.features.map(item => item.properties.a)
        let b = state.links.features.map(item => item.properties.b)
        let nodesList =  Array.from(new Set([...a, ...b]))
        state.nodes.features = state.nodes.features.filter(node => nodesList.includes(node.properties.index))


        //get tripId list
        this.commit('getTripId')

      },

      deleteTrip(state,payload){
        //set Trip Id
        state.links.features = state.links.features.filter(link => link.properties.trip_id != payload)
        // delete every every nodes not in links
        let a = state.links.features.map(item => item.properties.a)
        let b = state.links.features.map(item => item.properties.b)
        let nodesList =  Array.from(new Set([...a, ...b]))
        state.nodes.features = state.nodes.features.filter(node => nodesList.includes(node.properties.index))
        //get tripId list
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
      editorLineInfo: (state) => state.editorLineInfo,
      newLink: (state)=> state.newLink
      
    },
  }

  
  



