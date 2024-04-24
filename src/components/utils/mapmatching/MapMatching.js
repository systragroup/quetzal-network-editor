import { buildKdTree, knn } from './nearest.js'
import nearestPointOnLine from '@turf/nearest-point-on-line'

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
    console.log('updateGraph')
    rlinks.features.forEach(link => {
      graph.value.addLink(link.properties.a, link.properties.b, { weight: link.properties.time })
      if (link.properties.oneway === '0') {
        graph.value.addLink(link.properties.b, link.properties.a, { weight: link.properties.time })
      }
    })
  }
  function updateTree() {
    const dataSet = rnodes.features.map(node => [...toRaw(node.geometry.coordinates), node.properties.index])
    kdTree.value = buildKdTree(dataSet)
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
        geom = geom.concat(toRaw(tlink.geometry.coordinates).slice(slice))
        slice = 1 // dont slice first time
      } else {
        tlink = filtered.filter(link => link.properties.a === index[1] && link.properties.b === index[0])[0]
        geom = geom.concat((tlink.geometry.coordinates).reverse().slice(slice))
        slice = 1 // dont slice first time
      }
      indexList.concat(tlink.properties.index)
    }
    return { geom, indexList }
  }

  function nearest(node, k = 25) {
    // find 30 nearrest. proj on links. find link intersection...
    // can take a node or geometries.
    // for links over 100km. add points?
    // proj on links!

    const geom = Array.isArray(node) ? node : node.geometry.coordinates
    console.time('knn')
    const resp = knn(kdTree.value, geom, k)
    console.timeEnd('knn')

    return resp.points.map(p => p[2])
  }
  function testNearest() {
    const indexA = links.features[0].properties.a
    const node = nodes.features.filter(node => node.properties.index === indexA)[0]
    const test = knn(kdTree.value, node.geometry.coordinates, 25)
    const index = test.points.map(el => el[2])
    const tempNodes = cloneDeep(rnodes)
    tempNodes.features = rnodes.features.filter(node => index.includes(node.properties.index))
    return tempNodes
  }

  function nodesToLinks(node, candidate) {
    console.time('filter')
    const nodesSet = new Set(candidate)
    const filtered = rlinks.features.filter(link => nodesSet.has(link.properties.a))
    console.timeEnd('filter')
    console.time('proj')
    const clickedPoint = Array.isArray(node) ? node : node.geometry.coordinates
    const test = filtered.map(link => nearestPointOnLine(link, clickedPoint, { units: 'kilometers' }))
    console.log(test)
    console.timeEnd('proj')
  }

  // graph.addLink('a', 'b', {weight: 10});
  function RoutingBetweenTwoPoints(nodeA, nodeB) {
  // takes 2 nodes and return the road geometry between them.

    let fromNodeCandidate = nearest(nodeA)
    let toNodeCandidate = nearest(nodeB)
    nodesToLinks(nodeA, fromNodeCandidate)

    const fromNodeId = fromNodeCandidate[0]
    const toNodeId = toNodeCandidate[0]
    const nodesList = dijkstra(fromNodeId, toNodeId)
    // nodes to links list [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const linksList = nodesList.map((num, index) => [num, nodesList[index + 1]]).slice(0, -1)
    // filter rlinks for faster search.
    const nodesSet = new Set(nodesList)
    const filtered = rlinks.features.filter(link => nodesSet.has(link.properties.a) || nodesSet.has(link.properties.b))
    return getGeom(filtered, linksList)
  }

  function routeLink(link) {
    const indexA = link.properties.a
    const indexB = link.properties.b
    const nodeA = nodes.features.filter(node => node.properties.index === indexA)[0]
    const nodeB = nodes.features.filter(node => node.properties.index === indexB)[0]
    const geom = RoutingBetweenTwoPoints(nodeA, nodeB)
    link.geometry.coordinates = geom
  }
  function routeLinkWithAnchor(link) {
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
  }

  function routing() {
    if (routingMode.value) {
      for (const link of links.features) {
        routeLinkWithAnchor(link)
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
    testNearest,
    toggleRouting,
    routeLinkWithAnchor,
    routeLink,
  }
}
