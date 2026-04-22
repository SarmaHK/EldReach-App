/**
 * Spatial Utility functions
 */

/**
 * Checks if a 2D point is inside a polygon using the ray-casting algorithm.
 * 
 * @param {Object} point - { x, y }
 * @param {Array} polygon - Array of { x, y } representing the boundary
 * @returns {Boolean} true if point is inside, false otherwise
 */
const isPointInsidePolygon = (point, polygon) => {
  if (!polygon || polygon.length < 3) {
    return true; // Default to true if no valid boundary exists
  }

  let isInside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    // Ray-casting logic
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        
    if (intersect) {
      isInside = !isInside;
    }
  }

  return isInside;
};

module.exports = {
  isPointInsidePolygon,
};
