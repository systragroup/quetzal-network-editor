import length from '@turf/length'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import Linestring from 'turf-linestring'
import Point from 'turf-point'

export default {
    state: {
      filesAreLoaded: {links: false, nodes: false},
      links: {}, 
      editorTrip: null,
      editorNodes: {},
      editorLinks: {},
      editorLineInfo:{},
      nodes: {}, 
      tripId : [], // to change with the actual import.
      newLink: {},
      newNode: {},
      history: [],
      lineAttributes: ['trip_id', 'route_id', 'agency_id', 'direction_id', 
                        'headway', 'route_long_name', 'route_short_name',
                        'route_type', 'route_color'],
    },
  
    mutations: {
      loadLinks(state, payload) {
        state.links = JSON.parse(JSON.stringify(payload));
        if (['urn:ogc:def:crs:OGC:1.3:CRS84','EPSG:4326'].includes(state.links.crs.properties.name)){
          var linksHeader = {...state.links};
          linksHeader.features = [];
          state.editorLinks = linksHeader;
          this.commit('getTripId');
          state.filesAreLoaded.links = true;
        }
        else{alert('invalid CRS. use CRS84 / EPSG:4326')}
      },

      loadNodes(state, payload) {
        state.nodes = JSON.parse(JSON.stringify(payload));
        if (['urn:ogc:def:crs:OGC:1.3:CRS84','EPSG:4326'].includes(state.nodes.crs.properties.name)){
          var nodesHeader = {...state.nodes};
          nodesHeader.features = [];
          state.editorNodes = nodesHeader;
          state.filesAreLoaded.nodes = true;
        }
        else{alert('invalid CRS. use CRS84 / EPSG:4326')}
      },
      unloadFiles(state){
        //when we reload files (some were already loaded.)
        state.filesAreLoaded = {links: false, nodes: false}
        state.links = {}
        state.nodes = {}
      },

      addToHistory(state, payload){
        state.history.push(payload);
      },

      cleanHistory(state) {state.history = []},

      setEditorTrip(state, payload){
        //set Trip Id
        state.editorTrip = payload
        // set editor links corresponding to trip id
        //var filtered = {...state.links}
        var filtered = JSON.parse(JSON.stringify(state.links))
        filtered.features = filtered.features.filter(link => link.properties.trip_id == state.editorTrip); 
        state.editorLinks = filtered
        // get the corresponding nodes
        this.commit('getEditorNodes', {nodes: state.nodes})
        this.commit('getEditorLineInfo')
      },

      getEditorNodes(state, payload){
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
        //empty trip, when its a newLine
        if ( state.editorLinks.features.length == 0 ) {

          var filtered = state.lineAttributes.reduce(
            (acc,curr) => (acc[curr]={'value':null, 'disabled':false},acc),{}
            );
          filtered.trip_id = {'value': state.editorTrip,'disabled':false}
        }
        else {
          var properties = state.editorLinks.features[0].properties
   
          const uneditable = []
          var filtered = Object.keys(properties)
            .filter(key => state.lineAttributes.includes(key))
            .reduce((obj, key) => {
              obj[key] = {'value': properties[key],
                          'disabled': uneditable.includes(key)}
              return obj;
            }, {});
        }
      state.editorLineInfo = filtered
        
      },

      getTripId(state){
        state.tripId = Array.from(new Set(state.links.features.map(item => item.properties.trip_id)));
      },

      createNewLink(state){

      },

      setNewLink(state, payload){
        // copy editor links geoJSON, only take first (or last) link.
        // delete some properties like id and index.
        const uncopiedPropeties = {
          'index': null,
          'length': null,  
          'time': null,
          'pickup_type': 0,
          'drop_off_type': 0
        }
        //create link
        var tempLink = JSON.parse(JSON.stringify(state.editorLinks))
        // if there is no link to copy, create one. (new Line)
        if (tempLink.features.length==0){
          // copy Line properties.
          var lineProperties={}
          Object.keys(state.editorLineInfo).forEach((key)=>{
            lineProperties[key]=state.editorLineInfo[key].value
          })
          const linkProperties = {
            'index': 'link_' + (+new Date).toString(36),
            'a': state.editorNodes.features[0].properties.index,
            'b': state.editorNodes.features[0].properties.index,
            'length': null,  
            'time': null,
            'pickup_type': 0,
            'drop_off_type': 0,
            'trip_id':state.editorTrip,
            ...lineProperties
           
          }
          const linkGeometry = {
            'coordinates': [state.editorNodes.features[0].geometry.coordinates,state.editorNodes.features[0].geometry.coordinates],
            'type': "LineString"
          }
          let linkFeature =  {geometry: linkGeometry, properties: linkProperties, type: "Feature"}
          tempLink.features = [linkFeature]
        } 

        if (payload.action == 'Extend Line Upward'){
          // Take last link and copy properties
          var features = tempLink.features[tempLink.features.length - 1]
          Object.assign(features.properties, uncopiedPropeties)
          // sequence +1
          features.properties.link_sequence = features.properties.link_sequence + 1
          // replace node a by b and delete node a
          features.properties.a = features.properties.b
          features.geometry.coordinates[0] = features.geometry.coordinates[1]
          //new node index (hash)
          payload.nodeCopyId = features.properties.a
          this.commit('setNewNode', payload)

          features.properties.b = state.newNode.features[0].properties.index
          features.properties.index = 'link_' + (+new Date).toString(36)
        }
        else if (payload.action == 'Extend Line Downward'){
          // Take first link and copy properties
          var features = tempLink.features[0]
          Object.assign(features.properties, uncopiedPropeties)
          // sequence + 1
          features.properties.link_sequence = features.properties.link_sequence - 1
          //  replace node b by a and delete node b
          features.properties.b = features.properties.a
          features.geometry.coordinates[1] = features.geometry.coordinates[0]
          // new node index (hash)
          payload.nodeCopyId = features.properties.b
          this.commit('setNewNode', payload)
          features.properties.a = state.newNode.features[0].properties.index
          features.properties.index = 'link_' + (+new Date).toString(36)
        }
        tempLink.features = [features]
        state.newLink = tempLink
        state.newLink.action = payload.action 
      },
      createNewNode(state,payload){
        const nodeProperties = {
          'index': 'node_' + (+new Date).toString(36),
          'stop_code': null,
          'stop_name': null,
        }
        const nodeGeometry = {
          'coordinates': payload,
          'type': "Point"
        }
        // Copy specified node
        let nodeFeatures =  {geometry: nodeGeometry, properties: nodeProperties, type: "Feature"}
        state.editorNodes.features=[nodeFeatures]
      },

      setNewNode(state, payload){
        const { coordinates = [null, null] } = payload
        const uncopiedPropeties = {
          'index': null,
          'stop_code': null,
          'stop_name': null,
        }
        // Copy specified node
        var tempNode =  JSON.parse(JSON.stringify(state.editorNodes))
        var features = tempNode.features.filter(node => node.properties.index == payload.nodeCopyId)[0]
        Object.assign(features.properties, uncopiedPropeties)
        features.properties.index = 'node_' + (+new Date).toString(36)
        features.geometry.coordinates = coordinates
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
        state.newLink.features[0].properties.length = Number((distance*1000).toFixed(0)) // metres
        let time = distance/20*3600 // 20kmh hard code speed. time in secs
        state.newLink.features[0].properties.time = Number(time.toFixed(0)) // rounded to 0 decimals

        let action = state.newLink.action
        this.commit('editNewLink', payload)
        if (action == 'Extend Line Upward'){
          state.editorLinks.features.push(state.newLink.features[0])
          state.editorNodes.features.push(state.newNode.features[0])
        }
        else if (action == 'Extend Line Downward'){
          state.editorLinks.features.splice(0,0,state.newLink.features[0])
          state.editorNodes.features.splice(0,0,state.newNode.features[0])
          state.editorLinks.features.forEach(link => link.properties.link_sequence+=1)
        }
        // reset new link with updated editorLinks
        this.commit('setNewLink', {action:action})
      },

      deleteNode(state,payload){
        const nodeIndex = payload.selectedNode.index
        // remove node
        state.editorNodes.features=state.editorNodes.features.filter(node => node.properties.index != nodeIndex)
        // changing link1 change editorLinks as it is an observer.
        let link1 = state.editorLinks.features.filter(link => link.properties.b == nodeIndex)[0] // this link is extented
        let link2 = state.editorLinks.features.filter(link => link.properties.a == nodeIndex)[0] // this link is deleted
        // if the last or first node is selected, there is only one link. The node and the link are deleted.
        if (!link1) {
          state.editorLinks.features = state.editorLinks.features.filter(link => link.properties.index != link2.properties.index)
          // a link was remove, link_sequence -1
          state.editorLinks.features.forEach(link => link.properties.link_sequence -= 1)
        }
        else if (!link2) {
          state.editorLinks.features = state.editorLinks.features.filter(link => link.properties.index != link1.properties.index)
        }
        // the node is inbetween 2 links. 1 link is deleted, and the other is extented.
        else {
          link1.geometry.coordinates = [link1.geometry.coordinates[0], link2.geometry.coordinates[1]]
          link1.properties.b = link2.properties.b
          link1.properties.length += link2.properties.length
          link1.properties.time += link2.properties.time
          // find removed link index. drop everylinks link_sequence after by 1
          let featureIndex = state.editorLinks.features.findIndex(link => link.properties.index == link2.properties.index)
          state.editorLinks.features.slice(featureIndex).forEach(link => link.properties.link_sequence -= 1)
          //delete link2
          state.editorLinks.features = state.editorLinks.features.filter(link => link.properties.index != link2.properties.index)
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
        link1.properties.length = link1.properties.length*ratio
        link1.properties.time = link1.properties.time*ratio

        link2.properties.a = state.newNode.features[0].properties.index
        link2.geometry.coordinates[0] = state.newNode.features[0].geometry.coordinates
        link2.properties.index ='link_' + (+new Date).toString(36)+'2' // link2.properties.index+ '-2'
        link2.properties.length = link2.properties.length*(1-ratio)
        link2.properties.time = link2.properties.time*(1-ratio)

        state.editorLinks.features.splice(featureIndex+1, 0, link2);
        state.editorNodes.features.push(state.newNode.features[0])

        // add +1 to every link sequence afer link1
        let seq = link1.properties.link_sequence
        // everything after link1 except link2
        state.editorLinks.features.filter(link => link.properties.link_sequence>seq).forEach(link => link.properties.link_sequence+=1)
        // add link2 sequence after.
        link2.properties.link_sequence+=1
        

      },

      addNodeInline(state,payload){
        // payload contain selectedLink and event.lngLat (clicked point)
          let linkGeom = state.editorLinks.features.filter((link) => link.properties.index == payload.selectedLink.index)
          const  nodeCopyId = linkGeom[0].properties.a
          linkGeom = Linestring(linkGeom[0].geometry.coordinates)
          let clickedPoint = Point(Object.values(payload.lngLat))
          var snapped = nearestPointOnLine(linkGeom, clickedPoint, {units: 'kilometers'});
          const dist = length(linkGeom, {units: 'kilometers'}); //dist

          const offset = snapped.properties.location / dist
          this.commit('setNewNode',{coordinates: snapped.geometry.coordinates, nodeCopyId: nodeCopyId})
          this.commit('splitLink',{selectedLink: payload.selectedLink, offset: offset})
          //this.commit('setNewNode', null) // init new node to null
      },

      moveNode(state,payload){
        const nodeIndex = payload.selectedNode.properties.index
        // remove node
        let newNode = state.editorNodes.features.filter(node => node.properties.index == nodeIndex)[0]
        newNode.geometry.coordinates = payload.lngLat

        // changing links
        let link1 = state.editorLinks.features.filter(link => link.properties.b == nodeIndex)[0] 
        let link2 = state.editorLinks.features.filter(link => link.properties.a == nodeIndex)[0] 
        // update links geometry. check if exist first (if we take the first|last node there is only 1 link)
        if (link1) {
          // note: props are unchanged. even tho the length change, the time and length are unchanged.
          link1.geometry.coordinates = [link1.geometry.coordinates[0], payload.lngLat]
        }
        if (link2) {
          link2.geometry.coordinates = [payload.lngLat, link2.geometry.coordinates[1]]
        }
      },

      cutLineFromNode(state,payload) {
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

      cutLineAtNode(state,payload) {
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

      editLineInfo(state, payload) {
        state.editorLineInfo = payload
      },

      editLinkInfo(state, payload) {
        // get selected link in editorLinks and modify the changes attributes.
        const {selectedLinkId, info} = payload
        let props = Object.keys(info)
        state.editorLinks.features.filter(
          function (link){
            if (link.properties.index == selectedLinkId){
              props.forEach((key) => link.properties[key] = info[key].value )
            }
          }
        )
      },

      editNodeInfo(state, payload) {
        // get selected node in editorNodes and modify the changes attributes.
        const {selectedNodeId, info} = payload
        let props = Object.keys(info)
        state.editorNodes.features.filter(
          function (node){
            if (node.properties.index == selectedNodeId){
              props.forEach((key) => node.properties[key] = info[key].value )
            }
          }
        )
      },
    

      confirmChanges(state) { //apply change to Links
        // add editor Line info to each editor links
        let props = Object.keys(state.editorLineInfo)
        state.editorLinks.features.forEach((features) => props.forEach((key) => features.properties[key] = state.editorLineInfo[key].value ))

        var filtered = {...state.links}

        filtered.features = filtered.features.filter(link => link.properties.trip_id == state.editorTrip); 
        let toDelete = filtered.features.filter(item => !state.editorLinks.features.includes(item))
        //find index of soon to be deleted links
        if (state.tripId.includes(state.editorTrip)) 
        {
          var index = state.links.features.findIndex(link => link.properties.trip_id == state.editorTrip)
        }else
        {
          var index = 0
        }
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

      exportFiles(state){
        let data = JSON.stringify(state.links)
        let blob = new Blob([data], {type: 'application/json'})
        let e = document.createEvent('MouseEvents'),
        a = document.createElement('a');
        a.download = "links.geojson";
        a.href = window.URL.createObjectURL(blob);
        a.dataset.downloadurl = ['application/json', a.download, a.href].join(':');
        e.initEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        a.dispatchEvent(e);
    
        data = JSON.stringify(state.nodes)
        blob = new Blob([data], {type: 'application/json'})
        e = document.createEvent('MouseEvents'),
        a = document.createElement('a');
        a.download = "nodes.geojson";
        a.href = window.URL.createObjectURL(blob);
        a.dataset.downloadurl = ['application/json', a.download, a.href].join(':');
        e.initEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        a.dispatchEvent(e);
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
      newLink: (state) => state.newLink,
      newNode: (state) => state.newNode,
      firstNodeId: (state) => state.editorNodes.features.length>1? state.editorLinks.features[0].properties.a : state.editorNodes.features[0].properties.index,
      lastNodeId: (state) => state.editorNodes.features.length>1? state.editorLinks.features.slice(-1)[0].properties.b: state.editorNodes.features[0].properties.index,
      firstNode: (state, getters) => state.editorTrip? state.editorNodes.features.filter((node) => node.properties.index == getters.firstNodeId)[0] : null,
      lastNode: (state, getters) => state.editorTrip? state.editorNodes.features.filter((node) => node.properties.index == getters.lastNodeId)[0] : null,
      linkAttributes: (state) => state.linkAttributes, 
      lineAttributes: (state) => state.lineAttributes, 
      nodeAttributes: (state) => state.nodeAttributes, 
    },
  }

  
  



