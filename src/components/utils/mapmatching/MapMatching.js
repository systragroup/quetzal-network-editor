import { buildKdTree, knn } from './nearest.js'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import along from '@turf/along'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import { cloneDeep } from 'lodash'
import createGraph from 'ngraph.graph'
import path from 'ngraph.path'
import { onMounted, onUnmounted, shallowRef, toRaw, computed } from 'vue'

// Global state. Can reuuse thoses anywhere in the app.
// onMounted. only init if null (so we do it only once.)
const graph = shallowRef(createGraph())
const kdTree = shallowRef(null)

export function useMapMatching () {
  onMounted(() => {
    if (!kdTree.value) {
      updateGraph()
      updateTree()
    }
  })
  onUnmounted(() => {
    graph.value = createGraph()
    kdTree.value = null
  })

  const store = useIndexStore()
  const routingMode = computed(() => store.routingMode)

  const rlinksStore = userLinksStore()
  const linksStore = useLinksStore()
  const rlinks = rlinksStore.rlinks
  const rnodes = rlinksStore.rnodes
  const links = linksStore.editorLinks
  const nodes = linksStore.editorNodes

  function updateGraph() {
    rlinks.features.forEach(link => {
      graph.value.addLink(link.properties.a, link.properties.b, { weight: link.properties.time })
      if (link.properties.oneway === '0') {
        graph.value.addLink(link.properties.b, link.properties.a, { weight: link.properties.time })
      }
    })
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
    let dist = 500
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
    const filtered = rlinks.features.filter(link => nodesSet.has(link.properties.a))

    const clickedPoint = Array.isArray(node) ? node : node.geometry.coordinates
    const snapped = filtered.map(link => nearestPointOnLine(link, clickedPoint, { units: 'kilometers' }))
    const distArr = snapped.map(el => el.properties.dist)
    const minIndex = distArr.indexOf(Math.min(...distArr))
    const link = cloneDeep(filtered[minIndex])
    return link
  }

  // graph.addLink('a', 'b', {weight: 10});
  function RoutingBetweenTwoPoints(nodeA, nodeB) {
  // takes 2 nodes and return the road geometry between them.

    let fromNodeCandidate = nearest(nodeA, 25)
    let toNodeCandidate = nearest(nodeB, 25)
    const fromSnapped = nodesToLinks(nodeA, fromNodeCandidate)
    const toSnapped = nodesToLinks(nodeB, toNodeCandidate)

    const fromNodeId = fromSnapped.properties.a
    const toNodeId = toSnapped.properties.b
    const nodesList = dijkstra(fromNodeId, toNodeId)
    // nodes to links list [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const linksList = nodesList.map((num, index) => [num, nodesList[index + 1]]).slice(0, -1)

    if (linksList.length == 0) { // CANNOT ROUTE. return simple linestring
      const geomA = Array.isArray(nodeA) ? nodeA : nodeA.geometry.coordinates
      const geomB = Array.isArray(nodeB) ? nodeB : nodeB.geometry.coordinates
      return { geom: [geomA, geomB], indexList: [] }
    } else {
      // add first and last link if missing (because of link direction)
      const lastLink = linksList.slice(-1)[0]
      if ((lastLink[0] !== toSnapped.properties.a) || (lastLink[1] !== toSnapped.properties.b)) {
        linksList.push([toSnapped.properties.b, toSnapped.properties.a])
      }
      const firstLink = linksList[0]
      if ((firstLink[0] !== fromSnapped.properties.a) || (firstLink[1] !== fromSnapped.properties.b)) {
        linksList.splice(0, 0, [fromSnapped.properties.b, fromSnapped.properties.a])
      }
    }

    // filter rlinks for faster search.
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
    const snappedB = nearestPointOnLine(link, geomB, { units: 'kilometers' })
    const indexA = snappedA.properties.index + 1
    const indexB = snappedB.properties.index + 1
    // changing link change editorLinks as it is an observer.
    link.geometry.coordinates = link.geometry.coordinates.slice(indexA, indexB)
    link.geometry.coordinates.splice(0, 0, snappedA.geometry.coordinates)
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
  function toggleRouting() {
    if (Object.keys(links.features[0].properties).includes('road_link_list')) {
      unRoute()
    } else {
      // maybe, add anchor to anchors props
      routing()
    }
  }

  return {
    routing,
    toggleRouting,
    routeLink,
  }
}
