import React from 'react';
import NetworkDashboard from '../components/NetworkDashboard';
import { useSimulation } from '../hooks/useSimulation';

/**
 * Dashboard page — wraps the existing NetworkDashboard component.
 * Backend sync is handled at the Layout level.
 */
export default function DashboardPage() {
  useSimulation();

  return (
    <div className="page-wrapper page-wrapper--dashboard">
      <NetworkDashboard />
    </div>
  );
}
