import { buildKdTree, knn } from './nearest.js'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import along from '@turf/along'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import { cloneDeep } from 'lodash'
import createGraph from 'ngraph.graph'
import path from 'ngraph.path'
import { shallowRef, toRaw, computed, watch } from 'vue'

// Global state. Can reuuse thoses anywhere in the app.
// onMounted. only init if null (so we do it only once.)
const graph = shallowRef(createGraph())
const kdTree = shallowRef(null)

export function useRouting () {
  const store = useIndexStore()
  const routingMode = computed(() => store.routingMode)
  watch(routingMode, (val) => {
    // update graph and tree when routing mode activated. only once (if !kdTree.value)
    if (val) {
      if (!kdTree.value) {
        updateGraph()
        updateTree()
      }
    } else {
      graph.value = createGraph()
      kdTree.value = null
    }
  })

  const rlinksStore = userLinksStore()
  const linksStore = useLinksStore()
  const rlinks = rlinksStore.rlinks
  const rnodes = rlinksStore.rnodes
  const links = linksStore.editorLinks
  const nodes = linksStore.editorNodes

  function updateGraph() {
    rlinks.features.forEach(link => {
      graph.value.addLink(link.properties.a, link.properties.b, { weight: link.properties.length })
      if (link.properties.oneway === '0') {
        graph.value.addLink(link.properties.b, link.properties.a, { weight: link.properties.length })
      }
    })
  }

  function addVirtualOrigin(link, offset, vindex = 'origin') {
    if (link.properties.oneway === '0') { // if oneway: only use B for source. and A for destination
      graph.value.addLink(vindex, link.properties.a, { weight: offset })
    }
    graph.value.addLink(vindex, link.properties.b, { weight: 1 - offset })
  }

  function addVirtualDestination(link, offset, vindex = 'destination') {
    if (link.properties.oneway === '0') { // if oneway: only use B for source. and A for destination
      graph.value.addLink(link.properties.b, vindex, { weight: 1 - offset })
    }
    graph.value.addLink(link.properties.a, vindex, { weight: offset })
  }

  function removeVirtualNodes(nodes = ['origin', 'destination']) {
    nodes.forEach(id => graph.value.removeNode(id))
  }

  function updateTree() {
    const dataSet = rnodes.features.map(node => [...toRaw(node.geometry.coordinates), node.properties.index])
    const midpoints = getMidPoints()
    kdTree.value = buildKdTree(dataSet.concat(midpoints))
  }

  function getMidPoints() {
    // for links longeur than 500m, get points along every 500m
    // dist in meters.
    const limit = 1 // % of links to process
    let dist = 250
    let filtered = rlinks.features.filter(link => link.properties.length > 2 * dist)
    // while the number of links is larger than 1% of links. increase dist.
    while ((100 * filtered.length / rlinks.features.length) > limit) {
      dist = dist * 2
      filtered = rlinks.features.filter(link => link.properties.length > 2 * dist)
    }

    const midPts = []
    for (const link of filtered) {
      const numPoints = Math.floor(link.properties.length / dist)
      for (let i = 1; i < numPoints + 1; i++) {
        const newPoint = along(link, (dist * i) / 1000, { units: 'kilometers' })
        midPts.push([...toRaw(newPoint.geometry.coordinates), link.properties.a])
      }
    }
    return midPts
  }

  function dijkstra(from, to) {
    const pathFinder = path.aStar(graph.value, {
      oriented: true,
      distance: (fromNode, toNode, link) => { return link.data.weight },
      heuristic() { return 0 },
    })
    const foundPath = pathFinder.find(from, to)
    const nodesList = foundPath.map(el => el.id).reverse()
    return nodesList
  }

  function getGeom(filtered, linksList) {
    let slice = 0 // we want to skip first geom (first node) every rlink except first one.
    let geom = []
    let indexList = []
    for (const index of linksList) {
      let tlink = filtered.filter(link => link.properties.a === index[0] && link.properties.b === index[1])[0]
      if (tlink) { // not founded check reversed (oneway encode only one time...)
        geom = geom.concat(cloneDeep(tlink.geometry.coordinates).slice(slice))
        slice = 1 // dont slice first time
      } else {
        tlink = filtered.filter(link => link.properties.a === index[1] && link.properties.b === index[0])[0]
        geom = geom.concat(cloneDeep(tlink.geometry.coordinates).reverse().slice(slice))
        slice = 1 // dont slice first time
      }
      indexList = indexList.concat(tlink.properties.index)
    }
    return { geom, indexList }
  }

  function nearest(node, k = 25) {
    const geom = Array.isArray(node) ? node : node.geometry.coordinates
    const resp = knn(kdTree.value, geom, k)
    return resp.points.map(p => p[2])
  }

  function nodesToLinks(node, candidate) {
    // from clicked points and candidate nodes, find closest rLink
    const nodesSet = new Set(candidate)
    const filtered = rlinks.features.filter(link => nodesSet.has(link.properties.a) | nodesSet.has(link.properties.b))
    const clickedPoint = Array.isArray(node) ? node : node.geometry.coordinates
    const snapped = filtered.map(link => nearestPointOnLine(link, clickedPoint, { units: 'kilometers' }))
    const distArr = snapped.map(el => el.properties.dist)
    const minIndex = distArr.indexOf(Math.min(...distArr))
    const link = filtered[minIndex]
    const offset = (1000 * snapped[minIndex].properties.location / link.properties.length)
    return { link, offset }
  }

  // graph.addLink('a', 'b', {weight: 10});
  function RoutingBetweenTwoPoints(nodeA, nodeB) {
  // takes 2 nodes and return the road geometry between them.
    let fromNodeCandidate = nearest(nodeA, 50)
    let toNodeCandidate = nearest(nodeB, 50)
    const { link: fromLink, offset: fromOffset } = nodesToLinks(nodeA, fromNodeCandidate)
    const { link: toLink, offset: toOffset } = nodesToLinks(nodeB, toNodeCandidate)
    let nodesList = []
    // if on the same link we and in the correct direction, we return the link.
    if ((fromLink === toLink) && (fromOffset < toOffset)) {
      nodesList = [fromLink.properties.a, fromLink.properties.b]
    // if its in the reverse direction but both way, we need to return the inverse
    } else if ((fromLink === toLink) && (fromOffset > toOffset) && (fromLink.properties.oneway === '0')) {
      nodesList = [fromLink.properties.b, fromLink.properties.a]
      // else we route. (if on the the same oneway but not the correct direction. we route)
    } else {
      // add virtual node snap point to a,b, dijkstra then remove them
      addVirtualOrigin(fromLink, fromOffset, 'origin')
      addVirtualDestination(toLink, toOffset, 'destination')

      nodesList = dijkstra('origin', 'destination')
      removeVirtualNodes(['origin', 'destination'])
    }

    // replace virtual nodes ('origin' 'destination') with actual first link node. (a or b)
    const firstNode = (nodesList[1] === fromLink.properties.a) ? fromLink.properties.b : fromLink.properties.a
    // eslint-disable-next-line max-len
    const lastNode = (nodesList[nodesList.length - 2] === toLink.properties.a) ? toLink.properties.b : toLink.properties.a
    nodesList.splice(0, 1, firstNode)
    nodesList.splice(-1, 1, lastNode)

    // routing on the same link, remove the last point (fait des aller-retour sinon)
    if (firstNode === lastNode && nodesList.length === 3) {
      nodesList = nodesList.slice(0, 2)
    }
    if (nodesList.length <= 1) { // CANNOT ROUTE. return simple linestring
      const geomA = Array.isArray(nodeA) ? nodeA : nodeA.geometry.coordinates
      const geomB = Array.isArray(nodeB) ? nodeB : nodeB.geometry.coordinates
      store.changeNotification({ text: 'cannot route', autoClose: true })
      return { geom: [geomA, geomB], indexList: [] }
    }

    // nodes to links list [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const linksList = nodesList.map((num, index) => [num, nodesList[index + 1]]).slice(0, -1)
    const nodesSet = new Set(nodesList)
    const filtered = rlinks.features.filter(link => nodesSet.has(link.properties.a) || nodesSet.has(link.properties.b))
    const geomObj = getGeom(filtered, linksList)
    return geomObj
  }

  function snapToGeom(nodeA, nodeB, link) {
    // this move the nodes on links and crop the Linestring to the nodes.
    // do it after routing (on the complete geom), so the geom is the correct direction
    const geomA = Array.isArray(nodeA) ? nodeA : nodeA.geometry.coordinates
    const geomB = Array.isArray(nodeB) ? nodeB : nodeB.geometry.coordinates
    const snappedA = nearestPointOnLine(link, geomA, { units: 'kilometers' })
    const indexA = snappedA.properties.index + 1
    link.geometry.coordinates = link.geometry.coordinates.slice(indexA)
    link.geometry.coordinates.splice(0, 0, snappedA.geometry.coordinates)

    const snappedB = nearestPointOnLine(link, geomB, { units: 'kilometers' })
    const indexB = snappedB.properties.index + 1
    link.geometry.coordinates = link.geometry.coordinates.slice(0, indexB)
    link.geometry.coordinates.push(snappedB.geometry.coordinates)

    nodeA.geometry.coordinates = snappedA.geometry.coordinates
    nodeB.geometry.coordinates = snappedB.geometry.coordinates
  }

  function routeLink(link) {
    const indexA = link.properties.a
    const indexB = link.properties.b
    const nodeA = nodes.features.filter(node => node.properties.index === indexA)[0]
    const nodeB = nodes.features.filter(node => node.properties.index === indexB)[0]
    const anchors = link.properties.anchors || []
    // [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const nodesList = [nodeA, ...anchors, nodeB]
    const linkList = nodesList.map((num, index) => [num, nodesList[index + 1]]).slice(0, -1)

    let geomTot = []
    let rlinksList = []
    for (const tempLink of linkList) {
      const { geom, indexList } = RoutingBetweenTwoPoints(tempLink[0], tempLink[1])
      geomTot = geomTot.concat(geom)
      rlinksList = rlinksList.concat(indexList)
    }
    link.geometry.coordinates = geomTot
    link.properties.road_link_list = rlinksList

    // this move the nodes on links and crop the Linestring to the nodes.
    snapToGeom(nodeA, nodeB, link)

    linksStore.calcLengthTime(link)
  }

  function routing() {
    if (routingMode.value) {
      for (const link of links.features) {
        routeLink(link)
      }
    }
  }

  function unRoute() {
    for (const link of links.features) {
      const indexA = link.properties.a
      const indexB = link.properties.b
      const nodeA = nodes.features.filter(node => node.properties.index === indexA)[0]
      const nodeB = nodes.features.filter(node => node.properties.index === indexB)[0]
      const anchors = link.properties.anchors || []
      // [1,2,3,4] => [[1,2], [2,3], [3,4]]
      const geom = [nodeA.geometry.coordinates, ...anchors, nodeB.geometry.coordinates]
      link.geometry.coordinates = geom
      delete link.properties.road_link_list
      // delete link.properties.anchors
    }
  }

  const isRouted = computed(() => {
    if (links.features.length === 0) {
      return false
    } else {
      return Object.keys(links.features[0].properties).includes('road_link_list') }
  })

  function toggleRouting() {
    if (isRouted.value) {
      unRoute()
    } else {
      // maybe, add anchor to anchors props
      routing()
    }
  }

  return {
    toggleRouting,
    routeLink,
    isRouted,
  }
}
