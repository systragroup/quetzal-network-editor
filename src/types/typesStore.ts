import { GroupForm, IsoTimeStringTZ, TimeString } from './components'
import { LineStringGeoJson, LineStringFeatures,
  PointGeoJson, PointFeatures, GeoJsonProperties } from './geojson'

// indexStore

export interface Notification {
  text: string
  autoClose?: boolean
  color?: string
  type?: string
}
export interface ImportPoly {
  freeForm: boolean
  poly: any
}
export interface Style {
  name: string
  layer: string
  displaySettings: Record<string, any>
}
export interface ProjectInfo {
  description: string
  model_tag: string
}

export interface FileFormat {
  path: string
  content: any
}

export interface OtherFiles extends FileFormat {
  name: string
  extension: string
}

export interface GlobalAttributesChoice {
  pt: AttributesChoice
  road: AttributesChoice
}

export interface SettingsPayload {
  defaultHighway: string
  roadSpeed: number
  linksPopupContent: string[]
  roadsPopupContent: string[]
  outputName: string
}

export interface IndexStore {
  notification: Notification
  alert: Error | unknown
  darkMode: boolean
  isMobile: boolean
  loading: boolean
  showLeftPanel: boolean
  anchorMode: boolean
  stickyMode: boolean
  routingMode: boolean
  linksPopupContent: string[]
  roadsPopupContent: string[]
  cyclewayMode: boolean
  outputName: string
  importPoly: ImportPoly | null
  visibleRasters: string[]
  styles: Style[]
  projectInfo: ProjectInfo
  otherFiles: OtherFiles[]
}

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
  selectedNode: GeoJsonProperties
}

export interface SelectedLink {
  selectedLink: GeoJsonProperties
}

export interface SplitLinkPayload extends SelectedLink {
  offset: number
  sliceIndex: number
  newNode: PointGeoJson
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

export interface SchedulePayload {
  departures: TimeString[]
  arrivals: TimeString[]

  [key: string]: TimeString[]
}

export type AttributeTypes = 'String' | 'Number' | undefined

export interface Attributes {
  name: string
  type: AttributeTypes
  units?: string
  value?: string | number
}

export type AttributesChoice = Record<string, (string | number)[]>
export type NonEmptyArray<T> = [T, ...T[]]

export interface LinksStore {
  links: LineStringGeoJson
  nodes: PointGeoJson
  visibleNodes: PointGeoJson
  editorNodes: PointGeoJson
  editorLinks: LineStringGeoJson
  editorTrip: string | null
  variant: string
  variantChoice: NonEmptyArray<string>
  tripList: string[]
  selectedTrips: string[]
  connectedLinks: ConnectedLinks
  nodesDefaultAttributes: Attributes[]
  linksAttributesChoices: AttributesChoice
  linksDefaultAttributes: Attributes[]

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
  newNode: PointGeoJson
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
  variant: string
  variantChoice: NonEmptyArray<string>
  selectedrFilter: string
  selectedrGroup: string[]
  filteredrCategory: string[]
  linksDefaultAttributes: Attributes[]
  nodesDefaultAttributes: Attributes[]
  visiblerLinks: LineStringGeoJson
  visiblerNodes: PointGeoJson
  connectedLinks: RoadConnectedLinks
  rlinksAttributesChoices: AttributesChoice
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
  defaultAttributes: Attributes[]
  filteredCategory: string[]
  selectedFilter: string
  selectedCategory: string[]
}

// map store

export interface MapPositionPayload {
  mapCenter: number[]
  mapZoom: number
}

export interface MapStore {
  mapCenter: number[]
  mapStyle: string
  mapZoom: number
  key: string
}

//

// userStore

export interface CognitoInfo {
  email: string
  exp: number
  auth_time: number
  family_name: string
  given_name: string
}
export interface Scenario {
  lastModified: string
  model: string
  protected: boolean
  scenario: string
  timestamp: number
  userEmail: string
  userEmailPromise: Promise<string>
}
export interface InfoPreview {
  description: string
}

export interface UserStore {
  cognitoInfo: CognitoInfo
  cognitoGroup: string
  bucketListStore: string[]
  idToken: string
  refreshExpTime: number
  idExpTime: number
  signinTime: number
  loginTime: number
  loggedIn: boolean
  scenariosList: Scenario[]
  model: null | string
  scenario: null | string
  infoPreview: InfoPreview | null
  protected: boolean
}

// Run

export interface RunLog {
  name: string
  time: Date
  text: string
}

export interface Step {
  name: string
  tasks: string[]
}

export interface ParamsInfo {
  info: string
  model?: string | string[]
}

export interface ParamsVariants {
  variants: string[]
  choices: string[]
  multiple?: boolean
  label?: string
  model?: string | string[]
}

export type ParamsType = 'Number' | 'String' | 'Boolean'

export interface SingleParam {
  name: string
  text: string
  value: any
  type: ParamsType
  precision?: number
  units?: string
  hint?: string
  rules?: string[]
  multiple?: boolean
  items?: any[] | '$scenarios'
}

export interface CategoryParam {
  category: string
  model?: string | string[]
  info?: string
  params: SingleParam[]
}

export type Params = (ParamsInfo | CategoryParam | ParamsVariants)[]

export type PayloadParams = Record<string, Record<string, any>>

// Microservices

// MapMatching

export interface MapMatchingParams {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  SIGMA: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  BETA: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  POWER: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  DIFF: boolean
  ptMetrics: boolean
  keepTime: boolean
  exclusions: string[]

  [key: string]: number | boolean | string[]
}

export interface MatrixRoadCasterParams {
  api: 'google' | 'here'
  num_zones: number
  train_size: number
  date_time: IsoTimeStringTZ
  ff_time_col: string
  max_speed: number
  num_cores: number
  num_random_od: number
  use_zone: false
  hereApiKey: string

  [key: string]: number | boolean | string
}

// Transit
export interface GeneralTransitParams {
  step_size: number
  use_road_network: boolean
  [key: string]: number | boolean
}

export interface FootPaths {
  max_length: number
  speed: number
  n_ntlegs: number
  [key: string]: number
}
export type CatchmentRadius = Record<string, number> // {bus:500, subway:800, rail:1000}

export interface TransitParams {
  general: GeneralTransitParams
  catchment_radius: CatchmentRadius
  footpaths: FootPaths
}

// GTFS importer params

export interface StringTimeserie {
  start_time: TimeString
  end_time: TimeString
  value: string // periods
}

export interface GTFSParams {
  files: string[]
  timeseries: StringTimeserie[]
  day: string
  dates: string[]

  [key: string]: string | string[] | StringTimeserie[]
}

export interface UploadGTFSInfo {
  name: string
  date: string
  minDate: string
  maxDate: string
  progress: number
}

export interface UploadGTFSPayload {
  content: File
  info: UploadGTFSInfo
}

// OSM importer params

export interface OSMImporterParams {
  poly: number[][]
  highway: string[]
  elevation: boolean
  extended_cycleway: boolean
}
