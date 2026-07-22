import { Attributes, AttributesChoice, AttributeUnits, ModelConfig } from '@src/types/typesStore'

export const linksDefaultProperties: Attributes[] = [
  { name: 'index', type: 'String' },
  { name: 'a', type: 'String' },
  { name: 'b', type: 'String' },
  { name: 'trip_id', type: 'String' },
  { name: 'route_id', type: 'String', value: 'Q1' },
  { name: 'agency_id', type: 'String', value: 'QUENEDI' },
  { name: 'route_short_name', type: 'String', value: 'Q1' },
  { name: 'route_type', type: 'String', value: 'quenedi' },
  { name: 'route_color', type: 'String', value: '2196F3' },
  { name: 'length', type: 'Number' },
  { name: 'time', type: 'Number', value: 1 },
  { name: 'speed', type: 'Number', value: 20 },
  { name: 'headway', type: 'Number', value: 600 },
  { name: 'route_width', type: 'Number', value: 3 },
  { name: 'pickup_type', type: 'Number', value: 0 },
  { name: 'drop_off_type', type: 'Number', value: 0 },
  { name: 'link_sequence', type: 'Number', value: 0 },
  { name: 'direction_id', type: 'Number', value: 0 },
  { name: 'departures', type: undefined, value: undefined }, //  its an array. dont want to force string on read
  { name: 'arrivals', type: undefined, value: undefined }, //  its an array. dont want to force string on read
  { name: 'road_link_list', type: undefined, value: undefined }, //  its an array. dont want to force string on read
]

export const nodesDefaultProperties: Attributes[] = [
  { name: 'index', type: 'String' },
  { name: 'stop_code', type: 'String' },
  { name: 'stop_name', type: 'String' },
]

export const rlinksDefaultProperties: Attributes[] = [
  { name: 'index', type: 'String' },
  { name: 'a', type: 'String' },
  { name: 'b', type: 'String' },
  { name: 'route_color', type: 'String', value: '2196F3' },
  { name: 'route_width', type: 'Number', value: 1 },
  { name: 'length', type: 'Number' },
  { name: 'time', type: 'Number', value: 1 },
  { name: 'speed', type: 'Number', value: 20 },
  { name: 'highway', type: 'String', value: 'quenedi' },
  { name: 'oneway', type: 'String', value: '0' },

]

export const rnodesDefaultProperties: Attributes[] = [
  { name: 'index', type: 'String' },
  // { name: 'isCentroid', type: 'Boolean' },
]

// do not reversed those ones
export const rlinksConstantProperties = [
  'a',
  'b',
  'index',
  'length',
  'route_color',
  'oneway',
  'route_width',
  'highway',
  'cycleway',
  'cycleway_reverse',
  'incline',
  'name',
]

export const ODDefaultProperties: Attributes[] = [
  { name: 'index', type: 'String' },
  { name: 'name', type: 'String' },
]

export const baseUnits: Record<string, AttributeUnits> = {
  headway: 'sec',
  time: 'sec',
  length: 'm',
  speed: 'km/h',
}

export const ptDefaultAttributesChoices: AttributesChoice = { pickup_type: [0, 1, 2, 3], drop_off_type: [0, 1, 2, 3] }
export const roadDefaultAttributesChoices: AttributesChoice = { oneway: ['0', '1'] }
const defaultDisplayUnits: Record<string, AttributeUnits> = {}

export const defaultModelConfig: ModelConfig = {
  version: 0,
  attributesChoices: {
    links: ptDefaultAttributesChoices,
    road_links: roadDefaultAttributesChoices,
  },
  units: defaultDisplayUnits, // display units: still use baseUnits, but show (and edit) in others units in Forms
}

export const mapDefaultCenter = () => [-73.570337, 45.498310]
