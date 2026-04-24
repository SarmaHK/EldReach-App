import React from 'react';
import NetworkDashboard from '../components/NetworkDashboard';

/**
 * Dashboard page — wraps the existing NetworkDashboard component.
 * Backend sync is handled at the Layout level.
 * No simulation — real data only.
 */
export default function DashboardPage() {
  return (
    <div className="page-wrapper page-wrapper--dashboard">
      <NetworkDashboard />
    </div>
  );
}
