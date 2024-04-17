<script setup>
import { buildKdTree, findNearestPoint } from './nearest.js'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import { cloneDeep } from 'lodash'
import createGraph from 'ngraph.graph'
import path from 'ngraph.path'
import { onMounted, ref, toRaw } from 'vue'
const rlinksStore = userLinksStore()
const linksStore = useLinksStore()
onMounted(() => {
  console.time('updateGraph')
  updateGraph()
  console.timeEnd('updateGraph')
  console.time('BuidTree')
  updateTree()
  console.timeEnd('BuidTree')
})

const rlinks = rlinksStore.rlinks
const rnodes = rlinksStore.rnodes
const links = linksStore.editorLinks
const nodes = linksStore.editorNodes
const graph = ref(createGraph())
const kdTree = ref()
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
  const geom = []
  const indexList = []
  for (const index of linksList) {
    let tlink = filtered.filter(link => link.properties.a === index[0] && link.properties.b === index[1])[0]
    if (tlink) { // not founded check reversed (oneway encode only one time...)
      geom.push(...cloneDeep(tlink.geometry.coordinates))
    } else {
      tlink = filtered.filter(link => link.properties.a === index[1] && link.properties.b === index[0])[0]
      geom.push(...cloneDeep(tlink.geometry.coordinates).reverse())
    }
    indexList.push(tlink.properties.index)
  }
  return { geom, indexList }
}

function fastNearest(node) {
  const geom = node.geometry.coordinates
  const resp = findNearestPoint(kdTree.value, geom)
  return resp.point[2]
}

// graph.addLink('a', 'b', {weight: 10});
function RoutingBetweenTwoPoints(nodeA, nodeB) {
  // takes 2 nodes and return the road geometry between them.

  console.time('nearest')
  let fromNodeId = fastNearest(nodeA)
  let toNodeId = fastNearest(nodeB)
  console.timeEnd('nearest')
  console.time('routing')
  const nodesList = dijkstra(fromNodeId, toNodeId)
  console.timeEnd('routing')
  console.time('apply')
  // nodes to links list [1,2,3,4] => [[1,2], [2,3], [3,4]]
  console.time('map')
  const linksList = nodesList.map((num, index) => [num, nodesList[index + 1]]).slice(0, -1)
  console.timeEnd('map')
  // filter rlinks for faster search.
  console.time('filter')
  const nodesSet = new Set(nodesList)
  const filtered = rlinks.features.filter(link => nodesSet.has(link.properties.a) || nodesSet.has(link.properties.b))
  console.timeEnd('filter')
  console.time('getGeom')
  const { geom, indexList } = getGeom(filtered, linksList)
  console.timeEnd('getGeom')
  console.timeEnd('apply')

  return geom
}

function Routing() {
  for (const link of links.features) {
    const indexA = link.properties.a
    const nodeA = nodes.features.filter(node => node.properties.index === indexA)[0]
    const indexB = link.properties.b
    const nodeB = nodes.features.filter(node => node.properties.index === indexB)[0]
    const geom = RoutingBetweenTwoPoints(nodeA, nodeB)
    link.geometry.coordinates = geom
  }
}

</script>

<template>
  <v-btn
    size="small"
    icon="fas fa-road"
    @click="Routing"
  />
</template>
