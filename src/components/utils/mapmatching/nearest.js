class Node {
  constructor(point, left, right) {
    this.point = point
    this.left = left
    this.right = right
  }
}

function buildKdTree(points, depth = 0) {
  if (points.length === 0) {
    return null
  }

  const axis = depth % 2 // alternate between x and y coordinates
  points.sort((a, b) => a[axis] - b[axis])

  const medianIndex = Math.floor(points.length / 2)
  const median = points[medianIndex]
  const leftChild = buildKdTree(points.slice(0, medianIndex), depth + 1)
  const rightChild = buildKdTree(points.slice(medianIndex + 1), depth + 1)

  return new Node(median, leftChild, rightChild)
}

function haversine(coord1, coord2) {
  const [lon1, lat1] = coord1
  const [lon2, lat2] = coord2
  const toRad = (deg) => deg * (Math.PI / 180)
  const R = 6371000 // radius of Earth in meters
  const phi_1 = toRad(lat1)
  const phi_2 = toRad(lat2)

  const delta_phi = toRad(lat2 - lat1)
  const delta_lambda = toRad(lon2 - lon1)

  const a = Math.sin(delta_phi / 2.0) ** 2 + Math.cos(phi_1) * Math.cos(phi_2) * Math.sin(delta_lambda / 2.0) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const meters = R * c // output distance in meters

  return meters
}

function findNearestPoint(tree, queryPoint, bestPoint = null, bestDist = Infinity, depth = 0) {
  if (tree === null) {
    return { point: bestPoint, distance: bestDist }
  }

  const axis = depth % 2
  const currentPoint = tree.point
  const currentDist = haversine(queryPoint, currentPoint)

  let nearest = bestPoint
  let nearestDist = bestDist

  if (currentDist < bestDist) {
    nearest = currentPoint
    nearestDist = currentDist
  }

  const side = queryPoint[axis] < currentPoint[axis] ? tree.left : tree.right
  const otherSide = queryPoint[axis] < currentPoint[axis] ? tree.right : tree.left

  const candidate = findNearestPoint(side, queryPoint, nearest, nearestDist, depth + 1)
  nearest = candidate.point
  nearestDist = candidate.distance

  if (haversine(queryPoint, currentPoint) < nearestDist) {
    const otherCandidate = findNearestPoint(otherSide, queryPoint, nearest, nearestDist, depth + 1)
    nearest = otherCandidate.point
    nearestDist = otherCandidate.distance
  }

  return { point: nearest, distance: nearestDist }
}

function findNearestPoints(tree, queryPoint, k, nearestPoints = [], nearestDistances = [], depth = 0) {
  if (tree === null) {
    return { points: nearestPoints, distances: nearestDistances }
  }

  const axis = depth % 2
  const currentPoint = tree.point
  const currentDist = haversine(queryPoint, currentPoint)

  // Update nearestPoints and nearestDistances
  if (nearestPoints.length < k) {
    nearestPoints.push(currentPoint)
    nearestDistances.push(currentDist)
  } else {
    const maxDistIndex = nearestDistances.indexOf(Math.max(...nearestDistances))
    if (currentDist < nearestDistances[maxDistIndex]) {
      nearestPoints[maxDistIndex] = currentPoint
      nearestDistances[maxDistIndex] = currentDist
    }
  }

  const isLeft = queryPoint[axis] < currentPoint[axis]

  if (isLeft) {
    findNearestPoints(tree.left, queryPoint, k, nearestPoints, nearestDistances, depth + 1)
    if (tree.right && (nearestPoints.length < k || queryPoint[axis] - currentPoint[axis] < nearestDistances[nearestDistances.length - 1])) {
      findNearestPoints(tree.right, queryPoint, k, nearestPoints, nearestDistances, depth + 1)
    }
  } else {
    findNearestPoints(tree.right, queryPoint, k, nearestPoints, nearestDistances, depth + 1)
    if (tree.left && (nearestPoints.length < k || currentPoint[axis] - queryPoint[axis] < nearestDistances[nearestDistances.length - 1])) {
      findNearestPoints(tree.left, queryPoint, k, nearestPoints, nearestDistances, depth + 1)
    }
  }

  return { points: nearestPoints, distances: nearestDistances }
}

function knn(kdTree, geom, k = 1) {
  // Sort nearest points based on distances
  const resp = findNearestPoints(kdTree, geom, k)
  const sortedIndices = resp.distances.map((_, i) => i).sort((a, b) => resp.distances[a] - resp.distances[b])
  resp.points = sortedIndices.map(i => resp.points[i])
  resp.distances = sortedIndices.map(i => resp.distances[i])

  return resp
}

export { buildKdTree, findNearestPoint, findNearestPoints, knn }
