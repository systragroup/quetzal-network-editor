import { Map, MapMouseEvent } from 'mapbox-gl'
import { GeoJsonFeatures, GeoJsonProperties } from './geojson'
import { LinksAction, LinksAction2, RoadsAction, RoadsAction2 } from './typesStore'

export interface CustomMapEvent {
  layerId: string
  map: Map
  mapboxEvent: MapMouseEvent
}

export interface MapSelectorEvent {
  mapboxEvent: MapMouseEvent
  polygon: number[][][]
  selectedId: Set<string>
}

export interface HoverState {
  layerId: string
  featureId: string
  feature: GeoJsonFeatures
}

export interface HoverStateRoad {
  layerId: string
  id: string[]
  properties?: GeoJsonProperties
}

export interface ActionClick {
  action: string
  feature: GeoJsonFeatures
  coordinates: number[]
}

export interface ActionClickRoad {
  action: RoadsAction | RoadsAction2
  feature: string[]
}

export interface ContextMenuAction<T> {
  name: T
  text: string
}

export interface ContextMenu {
  coordinates: number[]
  showed: boolean
  actions: ContextMenuAction<LinksAction | LinksAction2>[]
  feature: GeoJsonFeatures
  type: string | null
}

export interface ContextMenuRoad {
  coordinates: number[] | null
  showed: boolean
  actions: ContextMenuAction<RoadsAction | RoadsAction2>[]
  ids: string[]
  type: string | null
}
