import { LineStringFeatures, LineStringGeoJson, PointFeatures } from '@src/types/geojson'
import along from '@turf/along'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { toRaw } from 'vue'
import { Graph } from 'ngraph.graph'
import { knn } from './nearest.ts'

import path from 'ngraph.path'

type Node = number[]
type KnnData = [number, number, string]
interface Snapped {
  link: string
  a: string
  b: string
  distance: number
  offset: number
}

export function buildGaph(rlinks: LineStringGeoJson, graph: Graph, linksMap: Map<string, string>, linksGeometry: Map<string, number[][]>) {
  rlinks.features.forEach(link => {
    const { a, b, index, length } = link.properties
    graph.addLink(a, b, { weight: length })
    linksMap.set(`${a}-${b}`, index)
    linksGeometry.set(index, link.geometry.coordinates)
    if (link.properties.oneway === '0') {
      graph.addLink(b, a, { weight: length })
      linksMap.set(`${b}-${a}`, index + '_r')
      linksGeometry.set(index + '_r', link.geometry.coordinates.toReversed())
    }
  })
}

export function getMidPoints(rlinks: LineStringGeoJson): KnnData[] {
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
export function buildMapping(
  rlinks: LineStringGeoJson,
  linksNodeA: Map<string, string>,
  linksNodeB: Map<string, string>)
{
  rlinks.features.forEach(link => {
    const { index, a, b } = link.properties
    linksNodeA.set(index, a)
    linksNodeB.set(index, b)
    if (link.properties.oneway === '0') {
      linksNodeA.set(index + '_r', b)
      linksNodeB.set(index + '_r', a)
    }
  })
}

export function getGeometryFromList(rlinksList: string[], linksGeometry: Map<string, number[][]>) {
  let slice = 0
  let geom: number[][] = []
  for (const index of rlinksList) {
    const linkgeom = linksGeometry.get(index)!
    geom = geom.concat(linkgeom.slice(slice))
    slice = 1
  }
  return geom
}

export function getPathWeight(graph: Graph, nodes: string[]): number {
  return nodes.slice(0, -1).reduce((total, node, i) => {
    const link = graph.getLink(node, nodes[i + 1])
    return total + (link?.data.weight ?? 0)
  }, 0)
}

export function dijkstra(graph: Graph, from: string, to: string): string[] {
  const pathFinder = path.aStar(graph, {
    oriented: true,
    distance: (fromNode, toNode, link) => { return link.data.weight },
    heuristic() { return 0 },
  })
  const foundPath = pathFinder.find(from, to)
  const nodesList = foundPath.map(el => el.id).reverse()
  return nodesList as string[]
}

export function getNearest(kdTree: any, node: Node, k = 25): string[] {
  const geom = node
  const resp = knn(kdTree, geom, k)
  const points = resp.points.map((p: KnnData) => p[2]) as string[]
  return points
}

export function nodesToLinks(rlinks: LineStringGeoJson, nodeGeom: Node, candidate: string[]): Snapped[] {
  // from clicked points and candidate nodes, find closest rLink
  const nodesSet = new Set(candidate)
  const filtered = rlinks.features.filter(link => nodesSet.has(link.properties.a) || nodesSet.has(link.properties.b))
  let resp: Snapped[] = []
  filtered.map(rlink => {
    const { index, a, b, oneway, length } = rlink.properties
    const snapped = nearestPointOnLine(rlink, nodeGeom, { units: 'meters' })
    const distance = snapped.properties.dist || Infinity
    const offset = snapped.properties.location ? snapped.properties.location : 0
    resp.push({ link: index, a: a, b: b, distance: distance, offset: offset })
    if (oneway == '0') {
      resp.push({ link: index + '_r', a: b, b: a, distance: distance, offset: length - offset })
    }
  })
  const minDist = Math.min(...resp.map(el => el.distance))

  return resp.filter(el => el.distance <= minDist * 1.01)
}

export function getCandidates(kdTree: any, rlinks: LineStringGeoJson, node: Node, k = 20): Snapped[] {
  const nodeCandidates = getNearest(kdTree, node, k)
  const candidates = nodesToLinks(rlinks, node, nodeCandidates)
  return candidates
}

export function snapToGeom(nodeA: PointFeatures, nodeB: PointFeatures, link: LineStringFeatures) {
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
