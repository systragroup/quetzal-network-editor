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

interface GeoJsonMultiPoint extends GeoJsonGeometry {
  type: 'MultiPoint'
  coordinates: [number, number][]
}

interface GeoJsonMultiLineString extends GeoJsonGeometry {
  type: 'MultiLineString'
  coordinates: [number, number][][]
}

interface GeoJsonPolygon extends GeoJsonGeometry {
  type: 'Polygon'
  coordinates: [number, number][][] // Array of LinearRing coordinate arrays
}

interface GeoJsonMultiPolygon extends GeoJsonGeometry {
  type: 'MultiPolygon'
  coordinates: [number, number][][][]
}

interface GeoJsonGeometryCollection extends GeoJsonGeometry {
  type: 'GeometryCollection'
  geometries: GeoJsonGeometry[]
}

// Feature and FeatureCollection
interface GeoJsonFeature {
  type: 'Feature'
  geometry: GeoJsonGeometry | null // Null for features with no geometry
  properties: { [key: string]: any } | null // Can be null
  id?: string | number // Optional ID
  crs?: GeoJsonCRS // Optional CRS
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
  crs?: GeoJsonCRS // Optional CRS
}

//
// My Geojson types
//

// features

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
  properties: { [key: string]: any }
}

export interface LineStringFeatures {
  type: 'Feature'
  geometry: LineStringGeometry
  properties: { [key: string]: any }
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

export type GeoJson =
  | LineStringGeoJson
  | PointGeoJson

// export Template values

export const basePoint: PointGeoJson = {
  type: 'FeatureCollection',
  crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
  features: [],
}

export const baseLineString: LineStringGeoJson = {
  type: 'FeatureCollection',
  crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
  features: [],
}
