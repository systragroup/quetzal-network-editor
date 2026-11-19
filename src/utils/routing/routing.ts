import { buildKdTree } from './nearest.ts'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import { cloneDeep } from 'lodash'
import createGraph from 'ngraph.graph'
import { shallowRef, toRaw, computed, watch, onMounted, ref } from 'vue'
import { calcLengthTimeorSpeed } from '../network.js'
import { isRoutedLink } from '../utils.js'
import { LineStringFeatures, PointFeatures } from '@src/types/geojson.js'
import { buildGaph, buildMapping, dijkstra, getCandidates, getGeometryFromList, getMidPoints, getNearest, getPathWeight, snapToGeom } from './routing_utils.ts'
import { Snapped } from './routing_links copy.ts'

type Node = number[]
type KnnData = [number, number, string]
// Global state. Can reuuse thoses anywhere in the app.
// onMounted. only init if null (so we do it only once.)
const graph = shallowRef(createGraph())
const kdTree = shallowRef(null)
const linksMap = ref<Map<string, string>>(new Map())
const linksGeometry = ref<Map<string, number[][]>>(new Map())
const onlinks = ref(true)

const linksNodeA = ref<Map<string, string>>(new Map())
const linksNodeB = ref<Map<string, string>>(new Map())

export function useRouting () {
  const store = useIndexStore()
  const linksStore = useLinksStore()
  const rlinksStore = userLinksStore()

  const routingMode = computed(() => linksStore.routingMode)
  const editorLinks = computed(() => linksStore.editorLinks)
  const editorNodes = computed(() => linksStore.editorNodes)
  const rlinks = cloneDeep(rlinksStore.rlinks)
  const rnodes = cloneDeep(rlinksStore.rnodes)

  onMounted(() => init())
  watch(routingMode, () => init())

  function init() {
    if (routingMode.value) {
      buildGaph(rlinks, graph.value, linksMap.value, linksGeometry.value)

      if (!kdTree.value) {
        buildTree()
      }
    } else {
      graph.value = createGraph()
      kdTree.value = null
    }
  }

  function buildTree() {
    let dataSet = rnodes.features.map(node => [...toRaw(node.geometry.coordinates), node.properties.index])
    if (onlinks.value) {
      const midpoints = getMidPoints(rlinks)
      dataSet.concat(midpoints)
      buildMapping(rlinks, linksNodeA.value, linksNodeB.value)
    }
    kdTree.value = buildKdTree(dataSet as KnnData[])
  }

  function _routingBetweenTwoPoints(nodeA: Node, nodeB: Node) {
    // takes 2 nodes and return the roadlinklist

    const fromNode = getNearest(kdTree.value, nodeA, 1)[0]
    const toCandidate = getNearest(kdTree.value, nodeB, 2)
    const toNode = toCandidate.filter(node => node !== fromNode)[0] // do not route from the same node
    const nodesList = dijkstra(graph.value, fromNode, toNode)
    // nodes to links list [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const linksList = nodesList.slice(0, -1).map((a, i) => linksMap.value.get(`${a}-${nodesList[i + 1]}`)!)
    return linksList
  }

  // graph.addLink('a', 'b', {weight: 10});
  function _routingBetweenTwoCandidates(fromCandidateLinks: Snapped[], toCandidateLinks: Snapped[]) {
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
          nodePath = dijkstra(graph.value, fromLink.b, toLink.a)
          routingDist = getPathWeight(graph.value, nodePath)
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

    const firstNode = fromCandidateLinks[fromidx].a
    const lastNode = toCandidateLinks[toidx].b
    bestPath = [firstNode, ...bestPath, lastNode]

    if (bestPath.length == 2) { // CANNOT ROUTE. return simple linestring
      return []
    }

    // nodes to links list [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const linksList = bestPath.slice(0, -1).map((a, i) => linksMap.value.get(`${a}-${bestPath[i + 1]}`)!)

    // geom = geom.slice(fromIndex)
    return linksList
  }

  function _routeLinkOnNodes(nodeA: PointFeatures, nodeB: PointFeatures, anchors: Node[]): string[] {
    // get route between 2 nodes, and its anchor inbetwwen
    const geomA = nodeA.geometry.coordinates
    const geomB = nodeB.geometry.coordinates
    // [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const nodesList = [geomA, ...anchors, geomB]
    const linkList = nodesList.slice(0, -1).map((num, index) => [num, nodesList[index + 1]])
    let rlinksList: string[] = []
    let slice = 0
    for (const [a, b] of linkList) {
      const indexList = _routingBetweenTwoPoints(a, b)
      rlinksList = rlinksList.concat(indexList.slice(slice))
      slice = 1
    }

    return rlinksList
  }

  function _routeLinkOnLinks(nodeA: PointFeatures, nodeB: PointFeatures, anchors: Node[]) {
    // dont modify object directly
    const geomA = nodeA.geometry.coordinates
    const geomB = nodeB.geometry.coordinates
    // [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const nodesList = [geomA, ...anchors, geomB]
    const linkList = nodesList.slice(0, -1).map((num, index) => [num, nodesList[index + 1]])

    let fixedLink: undefined | string = undefined
    const prevLink = editorLinks.value.features.filter(link => link.properties.b === nodeA.properties.index)[0]
    if (prevLink && prevLink.properties.road_link_list) {
      fixedLink = prevLink.properties.road_link_list.slice(-1)[0]
    }

    let rlinksList: string[] = []
    let slice = 0
    for (const [nodeA, nodeB] of linkList) {
      let fromCandidateLinks = getCandidates(kdTree.value, rlinks, nodeA)
      if (fixedLink) {
        const filtered = fromCandidateLinks.filter(el => el.link == fixedLink)
        if (filtered.length == 1) fromCandidateLinks = filtered
      }

      const toCandidateLinks = getCandidates(kdTree.value, rlinks, nodeB)
      const indexList = _routingBetweenTwoCandidates(fromCandidateLinks, toCandidateLinks)
      fixedLink = indexList.slice(-1)[0]
      rlinksList = rlinksList.concat(indexList.slice(slice))
      slice = 1
    }
    return rlinksList
  }

  function routeLinkOnLinks(link: LineStringFeatures, nodeA: PointFeatures, nodeB: PointFeatures) {
    const anchors = link.properties.anchors || []
    // route a link. commit changes
    const rlinksList = _routeLinkOnLinks(nodeA, nodeB, anchors)
    const geometry = getGeometryFromList(rlinksList, linksGeometry.value)
    if (geometry.length > 0) {
      link.geometry.coordinates = geometry
    } else {
      store.changeNotification({ text: 'cannot route', autoClose: true })
    }
    link.properties.road_link_list = rlinksList
    snapToGeom(nodeA, nodeB, link)
  }

  function routeLinkOnNodes(link: LineStringFeatures, nodeA: PointFeatures, nodeB: PointFeatures) {
    const anchors = link.properties.anchors || []
    // route a link. commit changes
    const rlinksList = _routeLinkOnNodes(nodeA, nodeB, anchors)
    const geometry = getGeometryFromList(rlinksList, linksGeometry.value)

    if (geometry.length > 0) {
      link.geometry.coordinates = geometry
      nodeA.geometry.coordinates = geometry[0]
      nodeB.geometry.coordinates = geometry.slice(-1)[0]
    } else {
      store.changeNotification({ text: 'cannot route', autoClose: true })
    }

    link.properties.road_link_list = rlinksList
  }

  // exposed function
  function routeLinks(linkIndexList: string[]) {
    const updateLinks = new Map()
    const updateNodes = new Map()
    for (const linkIndex of linkIndexList) {
      const link = cloneDeep(editorLinks.value.features.filter(link => link.properties.index === linkIndex)[0])
      const nodeA = cloneDeep(editorNodes.value.features.filter(n => n.properties.index === link.properties.a)[0])
      const nodeB = cloneDeep(editorNodes.value.features.filter(n => n.properties.index === link.properties.b)[0])
      if (onlinks.value) routeLinkOnLinks(link, nodeA, nodeB)
      else routeLinkOnNodes(link, nodeA, nodeB)
      calcLengthTimeorSpeed(link, linksStore.variantChoice, linksStore.speedTimeMethod)
      updateLinks.set(linkIndex, link)
      updateNodes.set(nodeA.properties.index, nodeA)
      updateNodes.set(nodeB.properties.index, nodeB)
    }

    linksStore.commitChanges({
      name: `Route Links`,
      updateLinks: updateLinks,
      updateNodes: updateNodes,
    })
  }

  function _unrouteLink(link: LineStringFeatures) {
    const nodeA = link.geometry.coordinates[0]
    const nodeB = link.geometry.coordinates.slice(-1)[0]
    const anchors = link.properties.anchors || []
    // [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const geom = [nodeA, ...anchors, nodeB]
    link.geometry.coordinates = geom
    link.properties.road_link_list = undefined
  }

  function unroute(linkIndexList: string[]) {
    const updateLinks = new Map()
    for (const linkIndex of linkIndexList) {
      const link = cloneDeep(editorLinks.value.features.filter(link => link.properties.index === linkIndex)[0])
      _unrouteLink(link)
      calcLengthTimeorSpeed(link, linksStore.variantChoice, linksStore.speedTimeMethod)
      updateLinks.set(linkIndex, link)
    }
    linksStore.commitChanges({
      name: 'Unroute Links',
      updateLinks: updateLinks })
  }

  function routeAll() {
    if (routingMode.value) {
      routeLinks(editorLinks.value.features.map(el => el.properties.index))
    }
  }
  function unrouteAll() {
    unroute(editorLinks.value.features.map(el => el.properties.index))
  }

  const isRouted = computed(() => {
    return isRoutedLink(editorLinks.value.features[0])
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
    routeLinks,
    isRouted,
  }
}
