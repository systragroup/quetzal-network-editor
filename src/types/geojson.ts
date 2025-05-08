// GeoJSON Types
type GeoJsonGeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'GeometryCollection'

// type GeoJsonObjectType = 'Feature' | 'FeatureCollection'

// CRS Interface
interface GeoJsonCRS {
  type: 'name'
  properties: {
    name: string // For named CRS (e.g., EPSG codes like "EPSG:4326")

  }
}

// Geometry Interfaces
interface GeoJsonGeometry {
  type: GeoJsonGeometryType
  coordinates: any // Use appropriate types for stricter validation if needed
}

// interface GeoJsonPolygon extends GeoJsonGeometry {
//   type: 'Polygon'
//   coordinates: [number, number][][] // Array of LinearRing coordinate arrays
// }

// interface GeoJsonMultiPolygon extends GeoJsonGeometry {
//   type: 'MultiPolygon'
//   coordinates: [number, number][][][]
// }

// My Geojson types
//

// features

export interface GeoJsonProperties {
  [key: string]: any
}

export interface PointGeometry {
  type: 'Point'
  coordinates: number[]
}

export interface LineStringGeometry {
  type: 'LineString'
  coordinates: number[][]
}

export interface PointFeatures {
  type: 'Feature'
  geometry: PointGeometry
  properties: GeoJsonProperties
}

export interface LineStringFeatures {
  type: 'Feature'
  geometry: LineStringGeometry
  properties: GeoJsonProperties
}

export interface GeoJsonFeatures {
  type: 'Feature'
  geometry: GeoJsonGeometry
  properties: GeoJsonProperties
}

// Geojson

export interface LineStringGeoJson {
  type: 'FeatureCollection'
  features: LineStringFeatures[]
  crs?: GeoJsonCRS // Optional CRS
}

export interface PointGeoJson {
  type: 'FeatureCollection'
  features: PointFeatures[]
  crs?: GeoJsonCRS // Optional CRS
}

export interface GeoJson {
  type: 'FeatureCollection'
  features: GeoJsonFeatures[]
  crs?: GeoJsonCRS // Optional CRS
}

// export Template values

export function basePoint(): PointGeoJson {
  return {
    type: 'FeatureCollection',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features: [],
  }
}
export function baseLineString(): LineStringGeoJson {
  return {
    type: 'FeatureCollection',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features: [],
  }
}
