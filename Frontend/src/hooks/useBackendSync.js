import { useEffect } from 'react';
import useStore from '../store/useStore';
import { subscribeToDeviceUpdates, subscribeToAlerts, subscribeToGatewayUpdates, getAlerts, getRooms, getGatewayStatus } from '../services/deviceService';
import socket from '../services/socket';

/**
 * useBackendSync — single hook that drives ALL real-time data.
 *
 * Called once in Layout.jsx to:
 *   1. Fetch initial devices, alerts, rooms from backend APIs
 *   2. Subscribe to Socket.IO events for real-time updates
 *   3. Auto-refresh on reconnection
 *
 * This is the ONLY source of data for the frontend.
 * No mock data, no simulation, no fake defaults.
 */
export function useBackendSync() {
  useEffect(() => {
    const store = useStore.getState();

    // 1. Initial fetch — devices
    store.refreshDevicePool();

    // 2. Initial fetch — alerts
    getAlerts()
      .then(initialAlerts => {
        if (initialAlerts && initialAlerts.length > 0) {
          useStore.setState({
            alerts: initialAlerts.map(a => ({
              id: a._id,
              message: a.message,
              timestamp: new Date(a.createdAt).getTime(),
              acknowledged: false,
              deviceId: a.deviceId,
            }))
          });
        }
        // If no alerts, store stays at [] (empty — correct)
      })
      .catch(err => {
        console.error('[BackendSync] Failed to fetch alerts:', err);
      });

    // 3. Initial fetch — rooms
    getRooms()
      .then(initialRooms => {
        if (initialRooms && initialRooms.length > 0) {
          useStore.setState({ backendRooms: initialRooms });
        }
        // If no rooms, store stays at [] (empty — correct)
      })
      .catch(err => {
        console.error('[BackendSync] Failed to fetch rooms:', err);
      });

    // 3.5. Initial fetch — gateway status
    getGatewayStatus()
      .then(gateway => {
        if (gateway) {
          useStore.setState({ connectedGateway: gateway });
          console.log('[BackendSync] Gateway loaded:', gateway.gatewayId);
        }
      })
      .catch(err => {
        console.error('[BackendSync] Failed to fetch gateway status:', err);
      });

    // 4. Real-Time Socket Listeners
    const unsubscribeDevices = subscribeToDeviceUpdates((device) => {
      useStore.getState().updateDeviceInStore(device);
    });

    const unsubscribeAlerts = subscribeToAlerts((alert) => {
      useStore.getState().addAlertToStore(alert);
    });

    const unsubscribeGateway = subscribeToGatewayUpdates((gateway) => {
      useStore.setState({ connectedGateway: gateway });
    });

    socket.on('gateway:status', (gateway) => {
      useStore.setState({ connectedGateway: gateway });
    });

    // Listen for device removal broadcasts
    socket.on('device:removed', ({ deviceId }) => {
      useStore.setState(s => ({
        discoveredDevices: s.discoveredDevices.filter(d => d.deviceId !== deviceId),
      }));
    });

    // 4.5. Time-based status evaluation
    const timeoutInterval = setInterval(() => {
      useStore.getState().evaluateTimeouts();
    }, 5000);

    // 5. Reconnection — refetch everything fresh
    const handleConnect = () => {
      console.log('[BackendSync] Socket connected/reconnected. Refreshing all data.');
      useStore.getState().refreshDevicePool();
      getAlerts().then(alerts => {
        if (alerts && alerts.length > 0) {
          useStore.setState({
            alerts: alerts.map(a => ({
              id: a._id,
              message: a.message,
              timestamp: new Date(a.createdAt).getTime(),
              acknowledged: false,
              deviceId: a.deviceId,
            }))
          });
        }
      }).catch(() => {});

      // Also refresh gateway status on reconnection
      getGatewayStatus().then(gw => {
        if (gw) useStore.setState({ connectedGateway: gw });
      }).catch(() => {});
    };

    socket.on('connect', handleConnect);

    return () => {
      unsubscribeDevices();
      unsubscribeAlerts();
      unsubscribeGateway();
      clearInterval(timeoutInterval);
      socket.off('connect', handleConnect);
      socket.off('device:removed');
    };
  }, []);
}
