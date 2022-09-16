//import line from '@static/links_test.geojson'
//import points from '@static/nodes_test.geojson'
import length from '@turf/length'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import Linestring from 'turf-linestring'
import Point from 'turf-point'

export default {
    state: {
      filesAreLoaded: {links:false,nodes:false},
      links: {}, 
      editorTrip: null,
      editorNodes: {},
      editorLinks: {},
      editorLineInfo:{},
      nodes: {}, 
      tripId : [], // to change with the actual import.
      newLink: {},
      newNode: {},
      history: []
    },
  
    mutations: {
      loadLinks(state,payload) {

        state.links = JSON.parse(JSON.stringify(payload))

        if (state.links.crs.properties.name == 'urn:ogc:def:crs:OGC:1.3:CRS84'){
          var linksHeader = {...state.links}
          linksHeader.features = []
          state.editorLinks = linksHeader
          this.commit('getTripId')
          state.filesAreLoaded.links = true
        }
        else{alert('invalid CRS. use CRS84 / EPSG:4326')}

        
      },
      loadNodes(state,payload) {
        
        state.nodes = JSON.parse(JSON.stringify(payload))

        if (state.nodes.crs.properties.name == 'urn:ogc:def:crs:OGC:1.3:CRS84'){

          var nodesHeader = {...state.nodes}
          nodesHeader.features = []
          state.editorNodes = nodesHeader

          state.filesAreLoaded.nodes = true
        }
        else{alert('invalid CRS. use CRS84 / EPSG:4326')}
      },
      addToHistory(state,payload){
        state.history.push(payload)
      },
      cleanHistory(state){state.history = []},

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
        if (payload.action == 'Extend Line Upward'){
          // put null on values values that should change
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
          features.properties.index = 'link_' + (+new Date).toString(36)
          
          
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
          features.properties.index = 'link_' + (+new Date).toString(36)

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
        features.properties.index = 'node_' + (+new Date).toString(36)
        features.geometry.coordinates = payload?.coordinates? payload.coordinates:[null,null]
        tempNode.features = [features]
        state.newNode = tempNode
      },

      editNewLink(state,payload){
        // for realtime viz. this method change the linestring to the payload (mouse position)
        // for some reason, it doesnt work when i only apply payload to coordinates[1]
        state.newNode.features[0].geometry.coordinates = payload
        if (state.newLink.action == 'Extend Line Upward'){
          state.newLink.features[0].geometry.coordinates=[state.newLink.features[0].geometry.coordinates[0], payload]
        }
        else{
          state.newLink.features[0].geometry.coordinates=[payload,state.newLink.features[0].geometry.coordinates[1]]
        }
      },
      applyNewLink(state,payload){

        // get linestring length in km
        let distance = length(state.newLink)
        state.newLink.features[0].properties.shape_dist_traveled = distance*1000 // metres
        let time = distance/20*3600 // 20kmh hard code speed. time in secs
        state.newLink.features[0].properties.time = Number(time.toFixed(0)) // rounded to 0 decimals

        let action = state.newLink.action
        this.commit('editNewLink',payload)
        if (action == 'Extend Line Upward'){
          state.editorLinks.features.push(state.newLink.features[0])
          state.editorNodes.features.push(state.newNode.features[0])
        }else{
          state.editorLinks.features.splice(0,0,state.newLink.features[0])
          state.editorNodes.features.splice(0,0,state.newNode.features[0])

          state.editorLinks.features.forEach(link => link.properties.link_sequence+=1)
        }
        // reset new link with updated editorLinks
        this.commit('setNewLink',{action:action})

      },

      deleteNode(state,payload){
        const nodeIndex = payload.selectedNode.index
        // remove node
        state.editorNodes.features=state.editorNodes.features.filter(node=>node.properties.index!=nodeIndex)
        // changing link1 change editorLinks as it is an observer.
        let link1 = state.editorLinks.features.filter(link => link.properties.b==nodeIndex)[0] // this link is extented
        let link2 = state.editorLinks.features.filter(link => link.properties.a==nodeIndex)[0] // this link is deleted
        // if the last or first node is selected, there is only one link. The node and the link are deleted.
        if (!link1) {
          state.editorLinks.features = state.editorLinks.features.filter(link => link.properties.index!=link2.properties.index)
          // a link was remove, link_sequence -1
          state.editorLinks.features.forEach(link => link.properties.link_sequence-=1)
        }
        else if (!link2) {
          state.editorLinks.features = state.editorLinks.features.filter(link => link.properties.index!=link1.properties.index)
        }
        // the node is inbetween 2 links. 1 link is deleted, and the other is extented.
        else {
          link1.geometry.coordinates = [link1.geometry.coordinates[0],link2.geometry.coordinates[1]]
          link1.properties.b = link2.properties.b
          link1.properties.shape_dist_traveled += link2.properties.shape_dist_traveled
          link1.properties.time += link2.properties.time
          // find removed link index. drop everylinks link_sequence after by 1
          let featureIndex = state.editorLinks.features.findIndex(link => link.properties.index == link2.properties.index)
          state.editorLinks.features.slice(featureIndex).forEach(link => link.properties.link_sequence-=1)
          //delete link2
          state.editorLinks.features = state.editorLinks.features.filter(link => link.properties.index!=link2.properties.index)
        }
      },
      splitLink(state,payload){
        const linkIndex = payload.selectedLink.index
        let featureIndex = state.editorLinks.features.findIndex(link => link.properties.index == linkIndex)
        // changing link1 change editorLinks as it is an observer.
        let link1 = state.editorLinks.features[featureIndex] // this link is extented
        let link2 = JSON.parse(JSON.stringify(link1))
        // distance du point (entre 0 et 1) sur le lien original
        const ratio = payload.offset

        link1.properties.b = state.newNode.features[0].properties.index
        link1.geometry.coordinates[1] = state.newNode.features[0].geometry.coordinates
        link1.properties.index = 'link_' + (+new Date).toString(36)+'1' //link1.properties.index+ '-1'
        link1.properties.shape_dist_traveled = link1.properties.shape_dist_traveled*ratio
        link1.properties.time = link1.properties.time*ratio

        link2.properties.a = state.newNode.features[0].properties.index
        link2.geometry.coordinates[0] = state.newNode.features[0].geometry.coordinates
        link2.properties.index ='link_' + (+new Date).toString(36)+'2' // link2.properties.index+ '-2'
        link2.properties.shape_dist_traveled = link2.properties.shape_dist_traveled*(1-ratio)
        link2.properties.time = link2.properties.time*(1-ratio)

        state.editorLinks.features.splice(featureIndex+1, 0, link2);
        state.editorNodes.features.push(state.newNode.features[0])
      },
      addNodeInline(state,payload){
        // payload contain selectedLink and event.lngLat (clicked point)
          let linkGeom = state.editorLinks.features.filter((link)=>link.properties.index == payload.selectedLink.index)
          linkGeom = Linestring(linkGeom[0].geometry.coordinates)
          let clickedPoint = Point(Object.values(payload.lngLat))
          var snapped = nearestPointOnLine(linkGeom, clickedPoint, {units: 'kilometers'});
          const dist = length(linkGeom, {units: 'kilometers'}); //dist

          const offset = snapped.properties.location / dist
          this.commit('setNewNode',{coordinates:snapped.geometry.coordinates})
          this.commit('splitLink',{selectedLink:payload.selectedLink, offset:offset})
      },

      moveNode(state,payload){
        const nodeIndex = payload.selectedNode.properties.index
        // remove node
        let newNode = state.editorNodes.features.filter(node=>node.properties.index == nodeIndex)[0]
        newNode.geometry.coordinates=payload.lngLat

        // changing links
        let link1 = state.editorLinks.features.filter(link => link.properties.b == nodeIndex)[0] 
        let link2 = state.editorLinks.features.filter(link => link.properties.a == nodeIndex)[0] 
        // update links geometry. check if exist first (if we take the first|last node there is only 1 link)
        if (link1) {
          // note: props are unchanged. even tho the length change, the time and shape_dist_travel are unchanged.
          link1.geometry.coordinates = [link1.geometry.coordinates[0], payload.lngLat]
        }
        if (link2) {
          link2.geometry.coordinates = [payload.lngLat, link2.geometry.coordinates[1]]
        }
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


        //all new nodes.
        let nodesList  = state.nodes.features.map(item => item.properties.index)
        let newNodes = {...state.editorNodes}
        newNodes.features = newNodes.features.filter(node => !nodesList.includes(node.properties.index))
        state.nodes.features.push(...newNodes.features)

        // for each editor nodes, apply new properties.
        state.nodes.features.filter(
          function (node){state.editorNodes.features.forEach(
            function (eNode){
              if (node.properties.index == eNode.properties.index){
                  node.properties = eNode.properties
                  node.geometry = eNode.geometry
              }
            })
          })

        // delete every every nodes not in links
        let a = state.links.features.map(item => item.properties.a)
        let b = state.links.features.map(item => item.properties.b)
        let nodesInLinks =  Array.from(new Set([...a, ...b]))
        state.nodes.features = state.nodes.features.filter(node => nodesInLinks.includes(node.properties.index))


        // For every Links containing an editor Nodes. update Geometry (this is necessary when we move a node that is share between multiplde lines)
        // get a list of all links (excluding editorLinks) that contain the selected node
        let editorNodesList  = state.editorNodes.features.map(item => item.properties.index)
        //get list of link with a node A modifieed
        let linksA = state.links.features.filter(link => link.properties.trip_id !== state.editorTrip).filter(item => editorNodesList.includes(item.properties.a) )
        // apply new node geometry
        linksA.forEach(link => link.geometry.coordinates = [state.editorNodes.features.filter(node => node.properties.index == link.properties.a )[0].geometry.coordinates,link.geometry.coordinates[1]])
        // same for nodes b
        let linksB = state.links.features.filter(link => link.properties.trip_id !== state.editorTrip).filter(item => editorNodesList.includes(item.properties.b) )
        linksB.forEach(link => link.geometry.coordinates = [link.geometry.coordinates[0], state.editorNodes.features.filter(node => node.properties.index == link.properties.b )[0].geometry.coordinates])
  
        
        state.newLink = {}
        state.newNode = {}

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

        // Update link_sequence
        for (const [i, link] of state.editorLinks.features.entries()) {
          console.log()
          link.properties.link_sequence = i + 1;
        }
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
      linksAreLoaded: (state) => state.filesAreLoaded.links,
      nodesAreLoaded: (state) => state.filesAreLoaded.nodes,
      filesAreLoaded: (state) => state.filesAreLoaded.links==true & state.filesAreLoaded.nodes==true, 
      history: (state) => state.history,
      links: (state) => state.links,
      nodes: (state) => state.nodes,
      route_id: (state) => state.route_id,
      editorTrip: (state) => state.editorTrip,
      editorLinks: (state) => state.editorLinks,
      editorNodes: (state) => state.editorNodes,
      tripId: (state) => state.tripId,
      editorLineInfo: (state) => state.editorLineInfo,
      newLink: (state)=> state.newLink,
      newNode: (state)=> state.newNode
      
    },
  }

  
  



