import { useEffect } from 'react';
import useStore from '../store/useStore';
import { subscribeToDeviceUpdates, subscribeToAlerts, getAlerts, getRooms } from '../services/deviceService';
import socket from '../services/socket';

export function useBackendSync() {
  useEffect(() => {
    const store = useStore.getState();

    // 1. Initial Sync
    store.refreshDevicePool();
    
    getRooms().then(initialRooms => {
      if (initialRooms && initialRooms.length > 0) {
        useStore.setState({ backendRooms: initialRooms });
      }
    });

    getAlerts().then(initialAlerts => {
      // Sort and add initial alerts if any, typically just setting to state or passing through addAlertToStore
      // For now, let's just reverse and add to ensure order, but we can also just let new ones stream in.
      if (initialAlerts && initialAlerts.length > 0) {
        // Maybe directly set them or push through addAlertToStore
        // Simple way:
        useStore.setState(s => ({
          alerts: initialAlerts.map(a => ({
            id: a._id,
            message: a.message,
            timestamp: new Date(a.createdAt).getTime(),
            acknowledged: false,
            deviceId: a.deviceId,
          }))
        }));
      }
    });

    // 2. Real-Time Socket Listeners
    const unsubscribeDevices = subscribeToDeviceUpdates((device) => {
      useStore.getState().updateDeviceInStore(device);
    });

    const unsubscribeAlerts = subscribeToAlerts((alert) => {
      useStore.getState().addAlertToStore(alert);
    });

    // 3. Reconnection Handling
    const handleConnect = () => {
      console.log('[BackendSync] Socket connected/reconnected. Refreshing data.');
      useStore.getState().refreshDevicePool();
    };

    socket.on('connect', handleConnect);

    return () => {
      unsubscribeDevices();
      unsubscribeAlerts();
      socket.off('connect', handleConnect);
    };
  }, []);
}
