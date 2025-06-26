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

// TODO MultiPolygon

interface GeoJsonGeometry {
  type: GeoJsonGeometryType
  coordinates: any // Use appropriate types for stricter validation if needed
}

export interface PointGeometry {
  type: 'Point'
  coordinates: number[]
}

export interface LineStringGeometry {
  type: 'LineString'
  coordinates: number[][]
}

export type Position = number[]

export interface PolygonGeometry {
  type: 'Polygon'
  coordinates: Position[][]
}

export interface GeoJsonProperties {
  [key: string]: any
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

export interface PolygonFeatures {
  type: 'Feature'
  geometry: PolygonGeometry
  properties: GeoJsonProperties | null
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

export interface PolygonGeoJson {
  type: 'FeatureCollection'
  features: PolygonFeatures[]
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
export function basePolygon(): PolygonGeoJson {
  return {
    type: 'FeatureCollection',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features: [],
  }
}
export function basePolygonFeature(): PolygonFeatures {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [],
    },
    properties: null,
  }
}
