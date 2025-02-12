import { Group } from '@src/components/map/sidePanel/LinksSidePanel.vue'
import { GroupForm } from './components'
import { LineStringGeoJson, LineStringFeatures, PointGeoJson } from './geojson'

// payloads

export type LinksAction = '' | 'Edit Group Info' | 'Edit Line Info' | 'Extend Line Upward' | 'Extend Line Downward'

export interface PTFilesPayload {
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
  groupTripIds: string[]
}

export interface EditLinkPayload {
  info: GroupForm
  selectedIndex: string
}

// store values

export interface Attributes {
  name: string
  type: 'String' | 'Number'
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
  tripId: string[]
  scheduledTrips: Set<string>
  selectedTrips: string[]
  newLink: LineStringGeoJson
  newNode: PointGeoJson
  connectedLinks: ConnectedLinks
  linksDefaultColor: string
  lineAttributes: string[]
  nodeAttributes: string[]
  linksAttributesChoices: AttributesChoice
  defaultAttributes: Attributes[]

}
