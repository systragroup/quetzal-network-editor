import { LineStringGeoJson, PointGeoJson, GeoJson } from '@src/types/geojson'
import bearing from '@turf/bearing'
import { round } from './utils'

function isLineStringGeoJson(geojson: GeoJson): geojson is LineStringGeoJson {
  return geojson.features[0].geometry.type === 'LineString'
}

export function simplifyGeometry<T extends LineStringGeoJson | PointGeoJson>(geojson: T) {
  if (isLineStringGeoJson(geojson)) {
    geojson.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
      points => points.map(coord => round(coord, 6))))
  } else {
    geojson.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
      coord => round(coord, 6)))
  }
}

export function getDirection(geom: number[][], reversed = false) {
  if (reversed) {
    return bearing(geom[geom.length - 1], geom[0])
  } else {
    return bearing(geom[0], geom[geom.length - 1])
  }
}

export type Point = number[]
export type Vector = number[] // TS is annoying if using [number,number]

export function toMeters(point: Point, origin: Point): Point {
  // project a point to meters from an origin.
  // points and origin in [lon, lat], return point [x, y]
  const R = 6371000 // Earth radius
  const [lon, lat] = point
  const [lon0, lat0] = origin
  const latRad = lat0 * Math.PI / 180
  const x = (lon - lon0) * Math.PI / 180 * R * Math.cos(latRad)
  const y = (lat - lat0) * Math.PI / 180 * R
  return [x, y]
}

export function toDegrees(point: Point, origin: Point): Point {
  // project a point in meter to lon lat relative to the origin
  // point in meter [x, y] and origin [lon, lat]. return a point [lon, lat]
  const R = 6371000 // Earth radius
  const [x, y] = point
  const [lon0, lat0] = origin
  const latRad = lat0 * Math.PI / 180
  const lon = lon0 + (x / (R * Math.cos(latRad))) * 180 / Math.PI
  const lat = lat0 + (y / R) * 180 / Math.PI
  return [lon, lat]
}

export function rotatePoint(point: Point, center: Point, theta: number): Point {
  // offset points on a circle
  const [x, y] = point
  const [cx, cy] = center
  const rotated = [
    Math.cos(theta) * (x - cx) - Math.sin(theta) * (y - cy) + cx,
    Math.sin(theta) * (x - cx) + Math.cos(theta) * (y - cy) + cy,
  ]
  return rotated
}

export function cross(v1: Vector, v2: Vector): number {
  // Cross product (matrixc determinant)
  return (v1[0] * v2[1] - v1[1] * v2[0])
}

export function getNorm(vect: Vector): number {
  // get length of a vector
  return Math.sqrt(vect[0] ** 2 + vect[1] ** 2)
}
