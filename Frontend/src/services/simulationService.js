/**
 * simulationService.js
 *
 * Manages the periodic tick that simulates IoT device activity.
 * This runs in-process and writes into the store via tickSimulation().
 *
 * ── To switch from simulation to real hardware ───────────────────────────────
 *  1. Set IS_SIMULATION_MODE = false            ← disables the tick loop
 *  2. In deviceService.js, implement:
 *       subscribeToDeviceUpdates()              ← connect your WS/MQTT broker
 *       onDeviceDataReceived()                  ← parse hardware payloads
 *  3. Call useStore.getState().autoBindDevices() after new devices arrive.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Set to true for offline demo / development without hardware.
 * Set to false for production or when real devices are connected.
 */
export const IS_SIMULATION_MODE = false;

const TICK_INTERVAL_MS = 3000;
let _intervalId = null;

/**
 * Start the simulation tick loop.
 * Does nothing if IS_SIMULATION_MODE is false.
 *
 * @param {() => void} onTick  Called on every interval.
 * @returns {() => void}       Stop / cleanup function.
 */
export function startSimulation(onTick) {
  if (!IS_SIMULATION_MODE) {
    console.info('[SimulationService] Simulation disabled. Waiting for real device data.');
    return () => {};
  }
  if (_intervalId !== null) stopSimulation(); // guard double-start

  _intervalId = setInterval(onTick, TICK_INTERVAL_MS);
  console.info('[SimulationService] Simulation started.');
  return stopSimulation;
}

/**
 * Stop the simulation loop. Safe to call multiple times.
 */
export function stopSimulation() {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
    console.info('[SimulationService] Simulation stopped.');
  }
}
