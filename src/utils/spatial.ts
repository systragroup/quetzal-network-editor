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
