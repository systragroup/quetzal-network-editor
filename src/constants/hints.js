// this file contains Hints on the different editable attributes

const $gettext = s => s

const hints = {
  agency_id: $gettext('transit brand or transit agency'),
  direction_id: $gettext(`direction of travel for a trip. used to separate trips by directions.
     ex: 0 - Travel in one direction. 1 - Travel in the opposite direction.`),
  drop_off_type: $gettext(`0 - Regularly scheduled drop off.
    1 - No drop off available.
    2 - Must phone agency to arrange drop off.
    3 - Must coordinate with driver to arrange drop off.`),
  headway: $gettext('Time between departures in seconds'),
  pickup_type: $gettext(`0 - Regularly scheduled pickup.
    1 - No pickup available.
    2 - Must phone agency to arrange pickup.
    3 - Must coordinate with driver to arrange pickup`),
  route_color: $gettext('color to display on the map (i.e. FFFFFF)'),
  route_id: $gettext('Identifies a route. Often a string'),
  route_long_name: $gettext("Full name of a route.This name is generally more descriptive than the route_short_name and often includes the roudefaultAttributeste's destination or stop"),
  route_short_name: $gettext(`Short name of a route. This will often be a short,
     abstract identifier like "32", "100X", or "Green"`),
  route_type: $gettext(`Indicates the type of transportation used on a route.
     subway, metro, rail, bus, ferry, tram, etc`),
  route_width: $gettext('width to display on the map'),
  time: $gettext('Travel time on the link. set as length / speed when a link is created or edited (seconds)'),
  trip_id: $gettext(`Line (or trip) identifier (i.e. 100 Est).
     Links are group by trip_id in Quetzal-network-editor.`),
  length: $gettext('links geometry linestring length (meters)'),
  highway: $gettext('Main identifier or any kind of road, street or path. ex: (motorway, residential, primary)'),
  speed: $gettext('speed on the link (Km/h)'),
  cycleway: $gettext('if the road contain a bike path. either yes, no or shared'),
  cycleway_reverse: $gettext('if the road contain a bike path in the opposite direction. either yes, no or shared. a road can be a oneway and have cycleway on both side.'),

}

export default hints
