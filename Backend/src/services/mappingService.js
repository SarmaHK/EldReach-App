const Room = require('../models/Room');

/**
 * Computes the convex hull of a set of 2D points using the Monotone Chain algorithm.
 * Simple, readable, and O(n log n) complexity.
 */
const convexHull = (points) => {
  if (points.length <= 3) return points; // Already a convex hull if 3 or fewer points

  // Sort the points lexicographically (by x-coordinate, and in case of tie, by y-coordinate)
  const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

  // 2D cross product of OA and OB vectors, i.e. z-component of their 3D cross product.
  // Returns positive for counter-clockwise turn, negative for clockwise, and zero if collinear.
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  // Build lower hull
  const lower = [];
  for (let i = 0; i < sorted.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
      lower.pop();
    }
    lower.push(sorted[i]);
  }

  // Build upper hull
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
      upper.pop();
    }
    upper.push(sorted[i]);
  }

  // Last point of upper list is same as first point of lower list, and vice versa.
  upper.pop();
  lower.pop();

  return lower.concat(upper);
};

/**
 * Start mapping a room. Clears previous collected points and sets mapping flag.
 */
const startMapping = async (roomId) => {
  const room = await Room.findOneAndUpdate(
    { roomId },
    { $set: { mappingInProgress: true, collectedPoints: [] } },
    { new: true, upsert: true }
  );
  
  console.log(`[Mapping] Started mapping for room: ${roomId}`);
  return room;
};

/**
 * Collect points from radar targets and append them to the room.
 */
const collectPoint = async (roomId, targets) => {
  if (!targets || targets.length === 0) return;

  const points = targets.map(t => ({ x: t.x, y: t.y }));

  await Room.updateOne(
    { roomId },
    { $push: { collectedPoints: { $each: points } } }
  );
};

/**
 * Stop mapping, compute the convex hull, and save the boundary.
 */
const stopMapping = async (roomId) => {
  const room = await Room.findOne({ roomId });
  
  if (!room) {
    throw new Error('Room not found');
  }

  if (room.collectedPoints.length < 3) {
    console.warn(`[Mapping] Room ${roomId} stopped with less than 3 points. Boundary may be inaccurate.`);
  }

  const boundary = convexHull(room.collectedPoints);

  room.boundary = boundary;
  room.mappingInProgress = false;
  
  await room.save();

  console.log(`[Mapping] Stopped mapping for room: ${roomId}. Boundary generated with ${boundary.length} points.`);
  return room;
};

module.exports = {
  startMapping,
  collectPoint,
  stopMapping,
};
