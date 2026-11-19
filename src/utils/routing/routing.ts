import { buildKdTree, knn } from './nearest.ts'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import { cloneDeep } from 'lodash'
import createGraph from 'ngraph.graph'
import path from 'ngraph.path'
import { shallowRef, toRaw, computed, watch, onMounted, ref } from 'vue'
import { calcLengthTimeorSpeed } from '../network.js'
import { isRoutedLink } from '../utils.js'
import { LineStringFeatures, PointFeatures } from '@src/types/geojson.js'

type Node = number[]
type KnnData = [number, number, string]
// Global state. Can reuuse thoses anywhere in the app.
// onMounted. only init if null (so we do it only once.)
const graph = shallowRef(createGraph())
const kdTree = shallowRef(null)
const linksMap = ref<Map<string, string>>(new Map())
const linksGeometry = ref<Map<string, number[][]>>(new Map())

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
    buildGaph()

    if (routingMode.value) {
      if (!kdTree.value) {
        console.time('updateTree')
        buildTree()
        console.timeEnd('updateTree')
      }
    } else {
      graph.value = createGraph()
      kdTree.value = null
    }
  }

  function buildGaph() {
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

  function buildTree() {
    const dataSet = rnodes.features.map(node => [...toRaw(node.geometry.coordinates), node.properties.index])
    kdTree.value = buildKdTree(dataSet as KnnData[])
  }

  function _dijkstra(from: string, to: string): string[] {
    const pathFinder = path.aStar(graph.value, {
      oriented: true,
      distance: (fromNode, toNode, link) => { return link.data.weight },
      heuristic() { return 0 },
    })
    const foundPath = pathFinder.find(from, to)
    const nodesList = foundPath.map(el => el.id).reverse()
    return nodesList as string[]
  }

  function _nearest(node: Node, k = 25): string[] {
    const geom = node
    const resp = knn(kdTree.value, geom, k)
    const points = resp.points.map((p: KnnData) => p[2]) as string[]

    return points
  }

  function _routingBetweenTwoPoints(nodeA: Node, nodeB: Node) {
    // takes 2 nodes and return the roadlinklist
    const fromNode = _nearest(nodeA, 1)[0]
    const toCandidate = _nearest(nodeB, 2)
    const toNode = toCandidate.filter(node => node !== fromNode)[0] // do not route from the same node
    const nodesList = _dijkstra(fromNode, toNode)

    // nodes to links list [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const linksList = nodesList.slice(0, -1).map((a, i) => linksMap.value.get(`${a}-${nodesList[i + 1]}`)!)
    return linksList
  }

  function _getGeom(rlinksList: string[]) {
    let slice = 0
    let geom: number[][] = []
    for (const index of rlinksList) {
      const linkgeom = linksGeometry.value.get(index)!
      geom = geom.concat(linkgeom.slice(slice))
      slice = 1
    }
    return geom
  }

  function _routeLink(nodeA: PointFeatures, nodeB: PointFeatures, anchors: Node[]): string[] {
    // get route between 2 nodes, and its anchor inbetwwen
    const geomA = nodeA.geometry.coordinates
    const geomB = nodeB.geometry.coordinates
    // [1,2,3,4] => [[1,2], [2,3], [3,4]]
    const nodesList = [geomA, ...anchors, geomB]
    const linkList = nodesList.slice(0, -1).map((num, index) => [num, nodesList[index + 1]])
    let rlinksList: string[] = []
    let slice = 0
    for (const tempLink of linkList) {
      const indexList = _routingBetweenTwoPoints(tempLink[0], tempLink[1])
      rlinksList = rlinksList.concat(indexList.slice(slice))
      slice = 1
    }

    return rlinksList
  }

  // exposed function

  function routeLink(linkIndex: string) {
    const link = cloneDeep(editorLinks.value.features.filter(link => link.properties.index === linkIndex)[0])
    const nodeA = cloneDeep(editorNodes.value.features.filter(n => n.properties.index === link.properties.a)[0])
    const nodeB = cloneDeep(editorNodes.value.features.filter(n => n.properties.index === link.properties.b)[0])
    const anchors = link.properties.anchors || []
    // route a link. commit changes
    const rlinksList = _routeLink(nodeA, nodeB, anchors)
    const geometry = _getGeom(rlinksList)

    if (geometry.length > 0) {
      link.geometry.coordinates = geometry
      nodeA.geometry.coordinates = geometry[0]
      nodeB.geometry.coordinates = geometry.slice(-1)[0]
    } else {
      store.changeNotification({ text: 'cannot route', autoClose: true })
    }

    link.properties.road_link_list = rlinksList
    calcLengthTimeorSpeed(link, linksStore.variantChoice, linksStore.speedTimeMethod)

    linksStore.commitChanges({
      name: `Route ${linkIndex}`,
      updateLinks: new Map([link].map(f => [f.properties.index, f])),
      updateNodes: new Map([nodeA, nodeB].map(f => [f.properties.index, f])),
    })
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

  function unroute(link: LineStringFeatures) {
    const modifiedLink = _unrouteLink(cloneDeep(link))
    calcLengthTimeorSpeed(modifiedLink, linksStore.variantChoice, linksStore.speedTimeMethod)
    linksStore.commitChanges({
      name: 'Route Link',
      updateLinks: new Map([modifiedLink].map(f => [f.properties.index, f])) })
  }

  function routeAll() {
    if (routingMode.value) {
      for (const link of editorLinks.value.features) {
        routeLink(link.properties.index)
      }
    }
  }
  function unrouteAll() {
    for (const link of editorLinks.value.features) {
      unroute(link)
    }
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
    routeLink,
    isRouted,
  }
}
