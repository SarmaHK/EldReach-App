import React from 'react';
import Settings from '../components/Settings';

/**
 * Settings page — wraps the existing Settings component
 * inside the new layout shell.
 * Backend sync is handled at the Layout level.
 */
export default function SettingsPage() {
  return (
    <div className="page-wrapper page-wrapper--settings">
      <Settings />
    </div>
  );
}
