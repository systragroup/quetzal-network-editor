import { GroupForm } from './components'
import { LineStringGeoJson, LineStringFeatures, PointGeoJson, PointFeatures } from './geojson'

// payloads

export type LinksAction = ''
  | 'Edit Group Info'
  | 'Edit Line Info'
  | 'Edit Link Info'
  | 'Edit Node Info'
  | 'Extend Line Upward'
  | 'Extend Line Downward'

export type RoadsAction = ''
  | 'Edit Road Group Info'
  | 'Edit rLink Info'
  | 'Edit rNode Info'

export type ODAction = ''
  | 'Edit OD Info'

export interface FilesPayload {
  path: string
  content: LineStringGeoJson | PointGeoJson
}

export interface ConnectedLinks {
  a: LineStringFeatures[]
  b: LineStringFeatures[]
  anchor: LineStringFeatures[]
}

export interface NewAttribute {
  name: string
}

export interface CloneTrip {
  tripId: string
  name: string
  cloneNodes: boolean
  reverse: boolean
}

export interface EditNewLinkPayload {
  geom: number[]
  action: LinksAction
}

export interface NewLinkPayload {
  nodeId: string
  geom: number[]
  action: LinksAction
  nodeCopyId?: string
}

export interface NewNodePayload {
  coordinates: number[]
  nodeCopyId: string
}

export interface SelectedNode {
  selectedNode: { [key: string]: any }
}

export interface SelectedLink {
  selectedLink: { [key: string]: any }
}

export interface SplitLinkPayload extends SelectedLink {
  offset: number
  sliceIndex: number
}

export interface AddNodeInlinePayload extends SelectedLink {
  lngLat: number[]
  nodes: 'editorNodes' | 'anchorNodes'
}

export interface AnchorPayload extends SelectedLink {
  coordinates: number[]
  sliceIndex: number
}
export interface MoveNode extends SelectedNode {
  lngLat: number[]
}

export interface StickyNodePayload {
  selectedNodeId: string
  stickyNodeId: string
}

export interface EditGroupPayload {
  info: GroupForm
  selectedArray: string[]
}

export interface EditLinkPayload {
  info: GroupForm
  selectedIndex: string
}

// store values

export type AttributeTypes = 'String' | 'Number'

export interface Attributes {
  name: string
  type: AttributeTypes
  value?: string | number
}

export type AttributesChoice = Record<string, (string | number)[]>

export interface LinksStore {
  links: LineStringGeoJson
  nodes: PointGeoJson
  visibleNodes: PointGeoJson
  editorNodes: PointGeoJson
  editorLinks: LineStringGeoJson
  editorTrip: string | null
  defaultLink: LineStringGeoJson
  tripList: string[]
  scheduledTrips: Set<string>
  selectedTrips: string[]
  newLink: LineStringGeoJson
  newNode: PointGeoJson
  connectedLinks: ConnectedLinks
  lineAttributes: string[]
  nodeAttributes: string[]
  linksAttributesChoices: AttributesChoice
  defaultAttributes: Attributes[]

}

// road

export interface RoadConnectedLinks {
  a: LineStringFeatures[]
  b: LineStringFeatures[]
  visibleLinksList: LineStringFeatures[]
}

export type ShowMethod = 'showAll' | 'hideAll' | 'add' | 'remove'

export interface ChangeVisibleLinks {
  category: string
  data: string[]
  method: ShowMethod
}

export interface ChangeVisibleNodes {
  method: ShowMethod
}

export interface EditRoadPayload {
  info: GroupForm[]
  selectedArr: string[]
}

export interface SplitRoadPayload {
  offset: number
  sliceIndex: number
  selectedFeature: LineStringFeatures
}
export interface AddRoadNodeInlinePayload {
  lngLat: number[]
  selectedIndex: string[]
  nodes: 'anchorrNodes' | 'rnodes'
}

export interface AnchorRoadPayload {
  coordinates: number[]
  sliceIndex: number
  selectedLink: LineStringFeatures
}

export interface CreateRlinkPayload {
  nodeIdA: string
  nodeIdB?: string // could be null, a node or a link.
  linksId?: string[]
  geom: number[]
}

// road store types

export interface UpdateFeatures {
  type: 'Feature'
  id: string
}

export interface SavedRoadNetwork {
  rlinks: string
  rnodes: string
}

export interface RlinksStore {
  rlinks: LineStringGeoJson
  rnodes: PointGeoJson
  selectedrFilter: string
  selectedrGroup: string[]
  filteredrCategory: string[]
  rlineAttributes: string[]
  rnodeAttributes: string[]
  newrNode: PointGeoJson
  visiblerLinks: LineStringGeoJson
  visiblerNodes: PointGeoJson
  connectedLinks: RoadConnectedLinks
  defaultHighway: string
  roadSpeed: number
  rlinksDefaultColor: string
  rlinksAttributesChoices: AttributesChoice
  rcstAttributes: string[]
  rundeletable: string[]
  reversedAttributes: string[]
  updateLinks: (UpdateFeatures | LineStringFeatures)[]
  updateNodes: (UpdateFeatures | PointFeatures)[]
  editionMode: boolean
  savedNetwork: SavedRoadNetwork
  networkWasModified: boolean
}

// OD store

export interface NewODPayload {
  index: string
  lngLat: number[]
}

export interface ODStore {
  layer: LineStringGeoJson
  visibleLayer: LineStringGeoJson
  layerAttributes: string[]
  filteredCategory: string[]
  selectedFilter: string
  selectedCategory: string[]
}
