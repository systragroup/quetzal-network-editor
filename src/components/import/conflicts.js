import { useGettext } from 'vue3-gettext'
import { getMatchingAttr, getPerfectMatches, remap, deleteUnusedNodes } from '@src/utils/utils'
import { cloneDeep } from 'lodash'
import short from 'short-uuid'
import distance from '@turf/distance'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'

// by convention, composable function names start with "use"
export function useConflicts () {
  const store = useIndexStore()
  const linksStore = useLinksStore()
  const rlinksStore = userLinksStore()
  const { $gettext } = useGettext()

  function handleConflict(files, type = 'pt') {
    // [{path,content}]
    const nodes = files.filter(file => file.content.features[0].geometry.type == 'Point')[0].content
    const links = files.filter(file => file.content.features[0].geometry.type == 'LineString')[0].content
    const nodesLength = nodes.features.length
    const linksLength = links.features.length
    if (type === 'pt') {
      const storeNodes = cloneDeep(linksStore.nodes)
      const storeLinks = cloneDeep(linksStore.links)
      handleNodesConflict(nodes, storeNodes, links, 'node_')
      handleTripsConflict(links, storeLinks)
      handleLinksConflict(links, storeLinks, 'link_')
    } else if (type === 'road') {
      const storerNodes = cloneDeep(rlinksStore.rnodes)
      const storerLinks = cloneDeep(rlinksStore.rlinks)
      handleNodesConflict(nodes, storerNodes, links, 'rnode_')
      handleLinksConflict(links, storerLinks, 'rlink_')
    }

    nodes.features = deleteUnusedNodes(nodes, links)
    // return the number of added links and nodes
    return {
      nodes: nodesLength, nodesAdded: nodes.features.length,
      links: linksLength, linksAdded: links.features.length,
    }
  }

  function getIndexInDist(nodes, storeNodes, conflicts, maxDist = 10) {
    // drop by distance maxDist in meters. return list of index that are < maxdist appart.
    // filter both geojson on matching conflicting indexes
    const idxSet = new Set(conflicts)
    const storeFeatures = storeNodes.features.filter(el => idxSet.has(el.properties.index))
    const features = nodes.features.filter(el => idxSet.has(el.properties.index))
    // dict index:geometry
    const geomDict = storeFeatures.reduce((dict, node) => {
      dict[node.properties.index] = node.geometry
      return dict
    }, {})
    // keep dup index over 10meters.
    const ls = features.filter(
      node => distance(node.geometry, geomDict[node.properties.index]) * 1000 < maxDist).map(
      node => node.properties.index)

    return ls
  }

  function handleNodesConflict(nodes, storeNodes, links, prefix = 'node_') {
    const dupIndexes = getMatchingAttr(nodes, storeNodes, 'index')
    const perfectMatchs = new Set(getPerfectMatches(nodes, storeNodes, dupIndexes))
    // remove perfect matches nodes.
    nodes.features = nodes.features.filter(el => !perfectMatchs.has(el.properties.index))
    let conflicts = dupIndexes.filter(idx => !perfectMatchs.has(idx))

    // we have conflicts. do something.
    if (conflicts.length !== 0) {
      const indexInDist = new Set(getIndexInDist(nodes, storeNodes, conflicts, 10))
      nodes.features = nodes.features.filter(el => !indexInDist.has(el.properties.index))
      conflicts = conflicts.filter(el => !indexInDist.has(el))
      const newNodesDict = conflicts.reduce((acc, key) => {
        acc[key] = prefix + short.generate()
        return acc
      }, {})

      // rename nodes
      nodes.features.forEach(el => el.properties.index = remap(el.properties.index, newNodesDict))
      links.features.forEach(el => el.properties.a = remap(el.properties.a, newNodesDict))
      links.features.forEach(el => el.properties.b = remap(el.properties.b, newNodesDict))
    }
  }

  function handleTripsConflict(links, storeLinks) {
    // 1) remove all links with with existing Trip_ID
    const dupTrips = new Set(getMatchingAttr(links, storeLinks, 'trip_id'))
    links.features = links.features.filter(el => !dupTrips.has(el.properties.trip_id))
  }

  function handleLinksConflict(links, storeLinks, prefix = 'link_') {
    const dupIndexes = getMatchingAttr(links, storeLinks, 'index')
    const perfectMatchs = new Set(getPerfectMatches(links, storeLinks, dupIndexes))
    const conflicts = dupIndexes.filter(idx => !perfectMatchs.has(idx))
    // 1) remove perfect matches links.
    links.features = links.features.filter(el => !perfectMatchs.has(el.properties.index))

    // MAYBE: check a,b index.
    // if Same (idx,a,b) : perfect match. drop
    // not sure its a good idea. you could have same idx,a,b but not same trip
    // we want to create new links. not drop them
    // (ex: MTL orange line have a trip with 1 extra links. this would drop every links except last one.

    // we have conflicts. do something.
    if (conflicts.length !== 0) {
      const newLinksDict = conflicts.reduce((acc, key) => {
        acc[key] = prefix + short.generate()
        return acc
      }, {})
      // 3) rename links that used the same index but are different
      links.features.forEach(el => el.properties.index = remap(el.properties.index, newLinksDict))
    }
  }

  function filesAddedNotification(infoPT, infoRoad) {
    // norification when files are added. infoPT and road contain conflict info
    if (infoPT && infoRoad) {
      store.changeNotification(
        { text: $gettext('%{a}/%{b} PT nodes added and %{c}/%{d} PT links added. \
                          %{e}/%{f} road nodes added and %{g}/%{h} road links added ',
        { a: infoPT.nodesAdded, b: infoPT.nodes, c: infoPT.linksAdded, d: infoPT.links,
          e: infoRoad.nodesAdded, f: infoRoad.nodes, g: infoRoad.linksAdded, h: infoRoad.links }),
        autoClose: false, color: 'success' })
    } else if (infoPT) {
      store.changeNotification(
        { text: $gettext('%{a}/%{b} PT nodes added and %{c}/%{d} PT links added',
          { a: infoPT.nodesAdded, b: infoPT.nodes, c: infoPT.linksAdded, d: infoPT.links }),
        autoClose: false, color: 'success' })
    } else if (infoRoad) {
      store.changeNotification(
        { text: $gettext('%{a}/%{b} road nodes added and %{c}/%{d} road links added',
          { a: infoRoad.nodesAdded, b: infoRoad.nodes, c: infoRoad.linksAdded, d: infoRoad.links }),
        autoClose: false, color: 'success' })
    } else {
      store.changeNotification(
        { text: $gettext('File(s) added'), autoClose: true, color: 'success' })
    }
  }

  // expose managed state as return value
  return {
    handleConflict,
    filesAddedNotification,

  }
}
