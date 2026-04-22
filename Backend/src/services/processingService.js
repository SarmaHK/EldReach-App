/**
 * Processing Service
 * Handles raw sensor data filtering, movement analysis, and basic fall detection.
 */

const ALPHA = 0.5; // Smoothing factor for Exponential Moving Average (EMA)
const MAX_VELOCITY = 3.0; // Max realistic human velocity (m/s)
const MAX_PATH_LENGTH = 20; // Number of historical positions to keep

const { isPointInsidePolygon } = require('../utils/spatial');

/**
 * Validates and smooths radar targets.
 * Removes unrealistic noise and applies EMA.
 */
const processTargets = (previousTargets = [], newTargets = []) => {
  // 1. Velocity Validation (Reject noise)
  const validTargets = newTargets.filter(target => target.velocity <= MAX_VELOCITY);

  if (!previousTargets || previousTargets.length === 0) {
    return validTargets;
  }

  // 2. Exponential Moving Average (EMA) Smoothing
  // For simplicity in v1, we pair targets by index. 
  // Advanced tracking (nearest neighbor) will be added later.
  return validTargets.map((newTarget, index) => {
    const prevTarget = previousTargets[index];
    
    if (!prevTarget) return newTarget; // No previous target to smooth with

    return {
      x: ALPHA * newTarget.x + (1 - ALPHA) * prevTarget.x,
      y: ALPHA * newTarget.y + (1 - ALPHA) * prevTarget.y,
      velocity: newTarget.velocity, // Usually don't smooth instantaneous velocity
      distance: ALPHA * newTarget.distance + (1 - ALPHA) * prevTarget.distance,
    };
  });
};

/**
 * Simple Rule-Based Fall Detection (v1)
 * Detects sudden stops after high velocity, assuming presence remains.
 */
const detectFall = (newTargets = [], previousTargets = [], presence = {}) => {
  let fallDetected = false;

  // Need historical data to detect a change
  if (!previousTargets || previousTargets.length === 0 || !newTargets || newTargets.length === 0) {
    return { fallDetected };
  }

  // We check the first primary target for simplicity
  const current = newTargets[0];
  const previous = previousTargets[0];

  if (!current || !previous) {
    return { fallDetected };
  }

  const wasMovingFast = previous.velocity > 0.8; // e.g., > 0.8 m/s indicates significant movement or falling
  const isNowStill = current.velocity < 0.1; // e.g., < 0.1 m/s indicates they stopped moving
  const droppedSignificantly = (previous.distance - current.distance) > 0.5; // Example logic if distance correlates to height dropping

  // Simplified Rule: If they were moving fast, stopped suddenly, but are still breathing
  if (wasMovingFast && isNowStill && presence.breathingDetected) {
    fallDetected = true;
    console.log(`[Processing] Fall condition triggered! PrevVel: ${previous.velocity}, CurrVel: ${current.velocity}`);
  }

  return { fallDetected };
};

/**
 * Filters targets to only include those inside the room boundary.
 */
const filterTargetsInsideRoom = (targets = [], boundary = []) => {
  if (!boundary || boundary.length < 3) {
    return targets; // Skip filtering if no valid boundary
  }

  return targets.filter(target => isPointInsidePolygon(target, boundary));
};

/**
 * Main entry point for the intelligence layer
 */
const processSensorData = (previousDeviceState, newSensors, roomBoundary = []) => {
  const previousRadar = previousDeviceState?.sensors?.radar?.targets || [];
  const newRadar = newSensors?.radar?.targets || [];
  const presence = newSensors?.presence || {};

  let filteredTargets = processTargets(previousRadar, newRadar);
  
  // Apply spatial filtering
  filteredTargets = filterTargetsInsideRoom(filteredTargets, roomBoundary);

  const { fallDetected } = detectFall(filteredTargets, previousRadar, presence);

  // Movement Tracking
  let movementPath = previousDeviceState?.processed?.movementPath || [];
  
  if (filteredTargets.length > 0) {
    // For simplicity, track the primary target
    const primaryTarget = filteredTargets[0];
    movementPath.push({
      x: primaryTarget.x,
      y: primaryTarget.y,
      timestamp: new Date()
    });

    // Keep only the last N points
    if (movementPath.length > MAX_PATH_LENGTH) {
      movementPath = movementPath.slice(-MAX_PATH_LENGTH);
    }
  }

  return {
    filteredTargets,
    movementPath,
    fallDetected
  };
};

module.exports = {
  processSensorData
};
