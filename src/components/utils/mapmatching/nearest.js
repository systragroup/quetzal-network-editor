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

function distanceSquared(p1, p2) {
  const dx = p1[0] - p2[0]
  const dy = p1[1] - p2[1]
  return dx * dx + dy * dy
}

function findNearestPoint(tree, queryPoint, bestPoint = null, bestDist = Infinity, depth = 0) {
  if (tree === null) {
    return { point: bestPoint, distance: bestDist }
  }

  const axis = depth % 2
  const currentPoint = tree.point
  const currentDist = distanceSquared(queryPoint, currentPoint)

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

  if (distanceSquared(queryPoint, currentPoint) < nearestDist) {
    const otherCandidate = findNearestPoint(otherSide, queryPoint, nearest, nearestDist, depth + 1)
    nearest = otherCandidate.point
    nearestDist = otherCandidate.distance
  }

  return { point: nearest, distance: nearestDist }
}

export { buildKdTree, findNearestPoint }
