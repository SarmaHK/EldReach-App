/**
 * useSimulation.js
 *
 * Custom hook that wires the simulationService to the Zustand store.
 * Import and call this hook once at the App root level.
 *
 * The hook reads IS_SIMULATION_MODE — if false it does nothing,
 * leaving the app ready to receive real data via deviceService.
 */

import { useEffect } from 'react';
import useStore from '../store/useStore';
import { startSimulation } from '../services/simulationService';

export function useSimulation() {
  useEffect(() => {
    const stop = startSimulation(() => {
      useStore.getState().tickSimulation();
    });
    return stop; // cleanup on unmount
  }, []);
}
