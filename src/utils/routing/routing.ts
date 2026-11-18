import { buildKdTree, knn } from './nearest.ts'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import along from '@turf/along'
import path from 'ngraph.path'

import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import { cloneDeep } from 'lodash'
import createGraph from 'ngraph.graph'
import { shallowRef, toRaw, computed, watch, onMounted, ref } from 'vue'
import { calcLengthTimeorSpeed } from '../network.js'
import { isRoutedLink } from '../utils.js'
import { LineStringFeatures, PointFeatures } from '@src/types/geojson.js'

type Node = PointFeatures | number[]
type KnnData = [number, number, string]

interface Snapped {
  link: string
  a: string
  b: string
  distance: number
  offset: number
}
// Global state. Can reuuse thoses anywhere in the app.
// onMounted. only init if null (so we do it only once.)
const graph = shallowRef(createGraph())
const kdTree = shallowRef(null)

const linksMap = ref<Map<string, string>>(new Map())
const linksGeometry = ref<Map<string, number[][]>>(new Map())
const linksNodeA = ref<Map<string, string>>(new Map())
const linksNodeB = ref<Map<string, string>>(new Map())
export function useRouting () {
  const store = useIndexStore()
  const linksStore = useLinksStore()
  const routingMode = computed(() => linksStore.routingMode)

  onMounted(() => init())
  watch(routingMode, () => init())

  function init() {
    updateGraph()

    if (routingMode.value) {
      if (!kdTree.value) {
        console.time('updateTree')
        updateTree()
        console.timeEnd('updateTree')
      }
    } else {
      graph.value = createGraph()
      kdTree.value = null
    }
  }

  const rlinksStore = userLinksStore()
  const rlinks = rlinksStore.rlinks
  const rnodes = rlinksStore.rnodes

  // const rnodes = cloneDeep(rlinksStore.rnodes)

  function updateGraph() {
    rlinks.features.forEach(link => {
      const { a, b, index, length } = link.properties
      graph.value.addLink(a, b, { weight: length })
      linksMap.value.set(`${a}-${b}`, index)
      linksGeometry.value.set(index, link.geometry.coordinates)

      if (link.properties.oneway === '0') {
        graph.value.addLink(b, a, { weight: length })
        linksMap.value.set(`${b}-${a}`, index + '_r')
        linksGeometry.value.set(index + '_r', link.geometry.coordinates.toReversed())
      }
    })
  }

  function updateTree() {
    const dataSet: KnnData[] = rnodes.features.map(node => [...toRaw(node.geometry.coordinates), node.properties.index])
    const midpoints = getMidPoints()
    kdTree.value = buildKdTree(dataSet.concat(midpoints))
    makeDict()
  }

  function getMidPoints(): KnnData[] {
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

    const midPts: KnnData[] = []
    for (const link of filtered) {
      const numPoints = Math.floor(link.properties.length / dist)
      for (let i = 1; i < numPoints + 1; i++) {
        const newPoint = along(link, (dist * i) / 1000, { units: 'kilometers' })
        midPts.push([...toRaw(newPoint.geometry.coordinates), link.properties.a])
      }
    }
    return midPts
  }
  function makeDict() {
    // return rlinks.features.flatMap(link => link.geometry.coordinates.slice(1, -1).map(
    //   (coord, i) => [...toRaw(coord), link.properties.a, i + 1])) as KnnData[]
    rlinks.features.forEach(link => {
      const { index, a, b } = link.properties
      linksNodeA.value.set(index, a)
      linksNodeB.value.set(index, b)
      if (link.properties.oneway === '0') {
        linksNodeA.value.set(index + '_r', b)
        linksNodeB.value.set(index + '_r', a)
      }
    })
  }

  function getPathWeight(nodes: string[]) {
    return nodes.slice(0, -1).reduce((total, nodeId, i) => {
      const nextId = nodes[i + 1]

      const link = graph.value.getLink(nodeId, nextId)

      return total + (link?.data.weight ?? 0)
    }, 0)
  }

  function dijkstra(from: string, to: string) {
    const pathFinder = path.aStar(graph.value, {
      oriented: true,
      distance: (fromNode, toNode, link) => { return link.data.weight },
    })
    const foundPath = pathFinder.find(from, to)
    const nodesList = foundPath.map(el => el.id).reverse()
    return nodesList as string[]
  }

  function nearest(node: Node, k = 25) {
    const geom = Array.isArray(node) ? node : node.geometry.coordinates
    const resp = knn(kdTree.value, geom, k)
    const points = resp.points.map((p: KnnData) => p[2]) as string[]

    return points
  }

  function nodesToLinks(node: Node, candidate: string[]): Snapped[] {
    // from clicked points and candidate nodes, find closest rLink
    const nodesSet = new Set(candidate)
    const filtered = rlinks.features.filter(link => nodesSet.has(link.properties.a) || nodesSet.has(link.properties.b))
    const clickedPoint = Array.isArray(node) ? node : node.geometry.coordinates
    let resp: Snapped[] = []
    filtered.map(link => {
      const { index, a, b, oneway, length } = link.properties
      const snapped = nearestPointOnLine(link, clickedPoint, { units: 'meters' })
      const distance = snapped.properties.dist || Infinity
      const offset = snapped.properties.location ? snapped.properties.location : 0
      resp.push({
        link: index,
        a: a,
        b: b,
        distance: distance,
        offset: offset,
      })
      if (oneway == '0') {
        resp.push({
          link: index + '_r',
          a: b,
          b: a,
          distance: distance,
          offset: length - offset,
        })
      }
    })
    const minDist = Math.min(...resp.map(el => el.distance))

    return resp.filter(el => el.distance <= minDist * 1.01)
  }

  // graph.addLink('a', 'b', {weight: 10});
  function RoutingBetweenTwoPoints(nodeA: Node, nodeB: Node) {
    console.time('tot')
    // takes 2 nodes and return the road geometry between them.
    // const pointsDist = haversine(nodeA, nodeB)
    console.time('knn')
    const fromNodeCandidate = nearest(nodeA, 20)
    const toNodeCandidate = nearest(nodeB, 20)
    console.timeEnd('knn')
    console.time('proj')
    const fromCandidateLinks = nodesToLinks(nodeA, fromNodeCandidate)
    const toCandidateLinks = nodesToLinks(nodeB, toNodeCandidate)
    console.timeEnd('proj')

    console.time('dijkstra')
    let bestCost = Infinity
    let fromidx = 0
    let toidx = 0
    let bestPath: string[] = []
    fromCandidateLinks.forEach((fromLink, i) => {
      toCandidateLinks.forEach((toLink, j) => {
        let nodePath: string[] = []
        let routingDist = 0
        if (fromLink.link == toLink.link) {
          routingDist = fromLink.offset < toLink.offset ? 0 : Infinity
          nodePath = []
        } else {
          nodePath = dijkstra(fromLink.b, toLink.a)
          routingDist = getPathWeight(nodePath)
        }

        const totDist = routingDist - fromLink.offset + toLink.offset
        const cost = (totDist) + 2 * (fromLink.distance + toLink.distance)
        if (cost < bestCost) {
          bestCost = cost
          fromidx = i
          toidx = j
          bestPath = nodePath
        }
      })
    })
    console.timeEnd('dijkstra')
    const bestFrom = fromCandidateLinks[fromidx]
    const bestTo = toCandidateLinks[toidx]
    // if ((bestFrom.link === bestTo.link) && (bestFrom.offset < bestFrom.offset)) {
    //   bestPath = []
    // }

    const firstNode = bestFrom.a
    const lastNode = bestTo.b
    bestPath = [firstNode, ...bestPath, lastNode]

    if (bestPath.length == 2) { // CANNOT ROUTE. return simple linestring
      store.changeNotification({ text: 'cannot route', autoClose: true })
      return []
    }

    // nodes to links list [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const linksList = bestPath.slice(0, -1).map((a, i) => linksMap.value.get(`${a}-${bestPath[i + 1]}`)!)

    // geom = geom.slice(fromIndex)
    console.timeEnd('tot')

    return linksList
  }

  function snapToGeom(nodeA: PointFeatures, nodeB: PointFeatures, link: LineStringFeatures) {
    // this move the nodes on links and crop the Linestring to the nodes.
    // do it after routing (on the complete geom), so the geom is the correct direction
    const geomA = nodeA.geometry.coordinates
    const geomB = nodeB.geometry.coordinates
    const snappedA = nearestPointOnLine(link, geomA, { units: 'kilometers' })
    const indexA = snappedA.properties.index ? snappedA.properties.index + 1 : 1
    link.geometry.coordinates = link.geometry.coordinates.slice(indexA)
    link.geometry.coordinates.splice(0, 0, snappedA.geometry.coordinates)

    const snappedB = nearestPointOnLine(link, geomB, { units: 'kilometers' })
    const indexB = snappedB.properties.index ? snappedB.properties.index + 1 : 1
    link.geometry.coordinates = link.geometry.coordinates.slice(0, indexB)
    link.geometry.coordinates.push(snappedB.geometry.coordinates)

    nodeA.geometry.coordinates = snappedA.geometry.coordinates
    nodeB.geometry.coordinates = snappedB.geometry.coordinates
  }

  function _routeLink(link: LineStringFeatures) {
    // dont modify object directly
    const nodeA = link.geometry.coordinates[0]
    const nodeB = link.geometry.coordinates.slice(-1)[0]
    const anchors = link.properties.anchors || []
    // [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const nodesList = [nodeA, ...anchors, nodeB]
    const linkList = nodesList.map((num, index) => [num, nodesList[index + 1]]).slice(0, -1)

    let rlinksList: string[] = []
    let slice = 0
    for (const tempLink of linkList) {
      const indexList = RoutingBetweenTwoPoints(tempLink[0], tempLink[1])
      rlinksList = rlinksList.concat(indexList.slice(slice))
      slice = 1
    }
    slice = 0
    let geom: number[][] = []
    for (const index of rlinksList) {
      const linkgeom = linksGeometry.value.get(index)!
      geom = geom.concat(linkgeom.slice(slice))
      slice = 1
    }
    if (geom.length == 0) {
      geom = [nodeA, nodeB]
    }
    link.geometry.coordinates = geom
    link.properties.road_link_list = rlinksList
    // const geomA = Array.isArray(nodeA) ? nodeA : nodeA.geometry.coordinates
    // const geomB = Array.isArray(nodeB) ? nodeB : nodeB.geometry.coordinates
    return link
  }
  function _unrouteLink(link: LineStringFeatures) {
    // dont modify object directly
    const nodeA = link.geometry.coordinates[0]
    const nodeB = link.geometry.coordinates.slice(-1)[0]
    const anchors = link.properties.anchors || []
    // [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const geom = [nodeA, ...anchors, nodeB]
    link.geometry.coordinates = geom
    link.properties.road_link_list = undefined
    return link
  }
  // exposed function
  const links = computed(() => linksStore.editorLinks)
  const nodes = computed(() => linksStore.editorNodes)

  function routeLink(link: LineStringFeatures) {
    // route a link. commit changes
    const routedLink = _routeLink(cloneDeep(link))
    calcLengthTimeorSpeed(link, linksStore.variantChoice, linksStore.speedTimeMethod)

    const nodeA = cloneDeep(nodes.value.features.filter(node => node.properties.index === routedLink.properties.a)[0])
    const nodeB = cloneDeep(nodes.value.features.filter(node => node.properties.index === routedLink.properties.b)[0])
    // this move the nodes on links and crop the Linestring to the nodes.
    snapToGeom(nodeA, nodeB, routedLink)
    linksStore.commitChanges({
      name: 'Route Link',
      updateLinks: new Map([routedLink].map(f => [f.properties.index, f])),
      updateNodes: new Map([nodeA, nodeB].map(f => [f.properties.index, f])),
    })
  }

  function unroute(link: LineStringFeatures) {
    const modifiedLink = _unrouteLink(cloneDeep(link))
    calcLengthTimeorSpeed(modifiedLink, linksStore.variantChoice, linksStore.speedTimeMethod)
    linksStore.commitChanges({
      name: 'Route Link',
      updateLinks: new Map([modifiedLink].map(f => [f.properties.index, f])) })
  }

  function routeAll() {
    if (routingMode.value) {
      for (const link of links.value.features) {
        routeLink(link)
      }
    }
  }
  function unrouteAll() {
    for (const link of links.value.features) {
      unroute(link)
    }
  }

  const isRouted = computed(() => {
    return isRoutedLink(links.value.features[0])
  })

  function toggleRouting() {
    if (isRouted.value) {
      unrouteAll()
    } else {
      routeAll()
    }
  }

  return {
    toggleRouting,
    routeLink,
    isRouted,
  }
}
