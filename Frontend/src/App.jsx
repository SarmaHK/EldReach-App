import React, { useState, useEffect } from 'react';
import {
  PlusSquare, MousePointer2, Minus, LayoutGrid,
  Bed, DoorOpen, RotateCw, Armchair, Square,
  Radio, Activity, Bell, X, Undo2, Redo2, Lock, Unlock, Wifi, Settings as SettingsIcon,
  Moon, Sun
} from 'lucide-react';
import Canvas from './components/Canvas';
import NetworkDashboard from './components/NetworkDashboard';
import Settings from './components/Settings';
import RoomDeviceAssignment from './components/RoomDeviceAssignment';
import useStore from './store/useStore';
import { useSimulation } from './hooks/useSimulation';
import './index.css';

function App() {
  const [activePage, setActivePage] = useState('designer'); // 'designer' | 'dashboard'
  const [theme, setTheme] = useState('light');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ── Simulation (no-op when IS_SIMULATION_MODE = false) ────────────────────
  useSimulation();

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const meta = navigator.platform?.toUpperCase().includes('MAC') ? e.metaKey : e.ctrlKey;
      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); useStore.getState().undo();
      } else if (meta && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault(); useStore.getState().redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const s = useStore.getState();
        if (s.selectedIds.length > 0 && s.designerState === 'EDIT') {
          e.preventDefault(); s.deleteItems(s.selectedIds);
        }
      } else if (e.key === 'Escape') {
        useStore.getState().selectItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Store subscriptions ────────────────────────────────────────────────────
  const designerState     = useStore(s => s.designerState);
  const setDesignerState  = useStore(s => s.setDesignerState);
  const globalGatewayId   = useStore(s => s.globalGatewayId);
  const gatewayNode       = useStore(s => s.gatewayNode);
  const updateGatewayNode = useStore(s => s.updateGatewayNode);

  const alerts            = useStore(s => s.alerts);
  const acknowledgeAlert  = useStore(s => s.acknowledgeAlert);

  const addRoom           = useStore(s => s.addRoom);
  const addFurniture      = useStore(s => s.addFurniture);
  const addDoorway        = useStore(s => s.addDoorway);
  const addSensorNode     = useStore(s => s.addSensorNode);

  const selectedIds       = useStore(s => s.selectedIds);
  const deleteItems       = useStore(s => s.deleteItems);
  const rotateItems       = useStore(s => s.rotateItems);
  const lockedIds         = useStore(s => s.lockedIds);
  const toggleLock        = useStore(s => s.toggleLock);

  const logicalRooms      = useStore(s => s.logicalRooms);
  const updateLogicalRoom = useStore(s => s.updateLogicalRoom);

  const past              = useStore(s => s.past);
  const future            = useStore(s => s.future);
  const undo              = useStore(s => s.undo);
  const redo              = useStore(s => s.redo);

  const selectedLogicalRoom = logicalRooms.find(r => selectedIds.includes(r.id)) ?? null;
  const allLocked = selectedIds.length > 0 && selectedIds.every(id => lockedIds.includes(id));
  const hasRooms = logicalRooms.length > 0;

  return (
    <div className="app-container">

      {/* ── Top Navigation ─────────────────────────────────────────────────── */}
      <header className="top-nav">
        {/* Left: Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'start' }}>
          <button 
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            style={{ ...navBtn(true), padding: '0.5rem', border: 'none', background: 'transparent' }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        {/* Center: Title */}
        <div style={{ textAlign: 'center', justifySelf: 'center' }}>
          <h1 className="brand-title">Eld<span style={{ color: 'var(--brand)' }}>Reach</span></h1>
        </div>

        {/* Right: Page tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-raised)', padding: '0.25rem', borderRadius: '12px', justifySelf: 'end' }}>
          <button onClick={() => setActivePage('designer')} style={tabBtn(activePage === 'designer', 'var(--brand)')}>
            <LayoutGrid size={15} /> Room Architect
          </button>
          <button onClick={() => setActivePage('dashboard')} style={tabBtn(activePage === 'dashboard', 'var(--status-active)')}>
            <Activity size={15} /> Network Dashboard
          </button>
          <button onClick={() => setActivePage('settings')} style={tabBtn(activePage === 'settings', 'var(--brand)')}>
            <SettingsIcon size={15} /> Settings
          </button>
        </div>
      </header>

      {/* ── Alert toasts ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        {alerts.filter(a => !a.acknowledged).slice(0, 5).map(alert => (
          <div key={alert.id} style={{
            backgroundColor: 'var(--status-alert-bg)', color: 'var(--status-alert)',
            padding: '10px 14px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '10px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--status-alert)',
            pointerEvents: 'auto', animation: 'slideInRight 0.25s ease-out',
          }}>
            <Bell size={17} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{alert.message}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{new Date(alert.timestamp).toLocaleTimeString()}</div>
            </div>
            <button onClick={() => acknowledgeAlert(alert.id)} style={{ background: 'transparent', border: 'none', color: 'var(--status-alert)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="main-content">
        {activePage === 'designer' ? (
          <>
            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            {designerState === 'EDIT' && (
              <aside className="sidebar">
                <div className="sidebar-header">Tools</div>
                <div className="tools-list">

                  {/* Select */}
                  <button className="tool-button active">
                    <div className="tool-icon-wrapper"><MousePointer2 size={16} /></div>
                    <div className="tool-info">
                      <span className="tool-title">Select Tool</span>
                      <span className="tool-desc">Move &amp; resize</span>
                    </div>
                  </button>

                  {/* Room shell */}
                  <button className="tool-button" onClick={() => addRoom({ x: 150, y: 150, width: 200, height: 150 })}>
                    <div className="tool-icon-wrapper"><PlusSquare size={16} /></div>
                    <div className="tool-info">
                      <span className="tool-title">Room Shell</span>
                      <span className="tool-desc">Add a new room</span>
                    </div>
                  </button>

                  {/* Furniture */}
                  <button className="tool-button" onClick={() => addFurniture({ x: 200, y: 200, width: 100, height: 100, furnitureType: 'Bed' })}>
                    <div className="tool-icon-wrapper" style={{ color: 'var(--status-warn)', backgroundColor: 'var(--status-warn-bg)' }}><Bed size={16} /></div>
                    <div className="tool-info">
                      <span className="tool-title">Add Bed</span>
                      <span className="tool-desc">Place furniture</span>
                    </div>
                  </button>

                  <button className="tool-button" onClick={() => addFurniture({ x: 200, y: 350, width: 60, height: 60, furnitureType: 'Chair' })}>
                    <div className="tool-icon-wrapper" style={{ color: 'var(--status-warn)', backgroundColor: 'var(--status-warn-bg)' }}><Armchair size={16} /></div>
                    <div className="tool-info">
                      <span className="tool-title">Add Chair</span>
                      <span className="tool-desc">Place furniture</span>
                    </div>
                  </button>

                  <button className="tool-button" onClick={() => addFurniture({ x: 100, y: 350, width: 80, height: 80, furnitureType: 'Table' })}>
                    <div className="tool-icon-wrapper" style={{ color: 'var(--status-warn)', backgroundColor: 'var(--status-warn-bg)' }}><Square size={16} /></div>
                    <div className="tool-info">
                      <span className="tool-title">Add Table</span>
                      <span className="tool-desc">Place furniture</span>
                    </div>
                  </button>

                  {/* Doorway */}
                  <button className="tool-button" onClick={() => addDoorway({ x: 300, y: 150, width: 60, height: 20 })}>
                    <div className="tool-icon-wrapper" style={{ color: 'var(--status-active)', backgroundColor: 'var(--status-active-bg)' }}><DoorOpen size={16} /></div>
                    <div className="tool-info">
                      <span className="tool-title">Add Doorway</span>
                      <span className="tool-desc">Create entryways</span>
                    </div>
                  </button>

                  {/* Sensor node */}
                  <button className="tool-button" onClick={() => {
                    // Place in centre of canvas; user drags into room
                    addSensorNode(null, window.innerWidth / 2 - 120, window.innerHeight / 2 - 60);
                  }}>
                    <div className="tool-icon-wrapper" style={{ color: 'var(--brand)', backgroundColor: 'var(--brand-soft)' }}>
                      <Wifi size={16} />
                    </div>
                    <div className="tool-info">
                      <span className="tool-title">Place Sensor</span>
                      <span className="tool-desc">Drag into a room</span>
                    </div>
                  </button>

                  {/* ── Onboarding nudge when no rooms exist ────────────── */}
                  {!hasRooms && (
                    <div style={{
                      margin: '8px 0', padding: '12px',
                      background: 'var(--brand-soft)',
                      border: '1px solid var(--brand-border)',
                      borderRadius: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        <Radio size={13} /> Getting Started
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: 1.5 }}>
                        Add rooms, then place sensor nodes inside them. Devices bind automatically when they connect.
                      </div>
                    </div>
                  )}

                  {/* ── Contextual actions (bottom of sidebar) ───────────── */}
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                    {/* Room settings panel — shown when a logical room is selected */}
                    {selectedLogicalRoom && (
                      <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Room Settings</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Room Name</label>
                          <input
                            type="text"
                            value={selectedLogicalRoom.name}
                            onChange={e => updateLogicalRoom(selectedLogicalRoom.id, { name: e.target.value })}
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)', padding: '0.4rem', borderRadius: '6px', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box', outline: 'none' }}
                          />
                        </div>

                        {/* Clean device assignment — no scan UI */}
                        <RoomDeviceAssignment room={selectedLogicalRoom} />
                      </div>
                    )}

                    {/* Selection actions: lock, rotate, delete */}
                    {selectedIds.length > 0 && (
                      <>
                        <button className="tool-button" style={{ border: '1px solid var(--border-soft)' }} onClick={() => toggleLock(selectedIds)}>
                          <div className="tool-icon-wrapper" style={{ color: 'var(--text-secondary)', background: 'var(--bg-raised)' }}>
                            {allLocked ? <Unlock size={16} /> : <Lock size={16} />}
                          </div>
                          <div className="tool-info">
                            <span className="tool-title" style={{ color: 'var(--text-primary)' }}>{allLocked ? 'Unlock Items' : 'Lock Items'}</span>
                            <span className="tool-desc">Prevent movement</span>
                          </div>
                        </button>

                        <button className="tool-button" style={{ border: '1px solid var(--border-soft)' }}
                          onClick={() => rotateItems(selectedIds)} disabled={allLocked}>
                          <div className="tool-icon-wrapper" style={{ color: allLocked ? 'var(--text-tertiary)' : 'var(--text-secondary)', background: 'var(--bg-raised)' }}><RotateCw size={16} /></div>
                          <div className="tool-info">
                            <span className="tool-title" style={{ color: allLocked ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>Rotate 90°</span>
                            <span className="tool-desc">Spin selection</span>
                          </div>
                        </button>

                        <button className="tool-button" style={{ border: '1px solid var(--status-alert-bg)' }} onClick={() => deleteItems(selectedIds)}>
                          <div className="tool-icon-wrapper" style={{ color: 'var(--status-alert)', backgroundColor: 'var(--status-alert-bg)' }}><Minus size={16} /></div>
                          <div className="tool-info">
                            <span className="tool-title" style={{ color: 'var(--status-alert)' }}>Delete Items</span>
                            <span className="tool-desc">Remove selected</span>
                          </div>
                        </button>
                      </>
                    )}
                  </div>

                </div>
              </aside>
            )}

            {/* ── Canvas area ───────────────────────────────────────────────── */}
            <div className="canvas-wrapper">
              <Canvas theme={theme} />

              {/* Bottom action bar */}
              <div className="bottom-action-bar">
                {designerState === 'EDIT' ? (
                  <div className="floating-toolbar">
                    {/* Undo / Redo */}
                    <div style={{ display: 'flex', gap: '0.25rem', paddingRight: '0.5rem', borderRight: '1px solid var(--border-subtle)' }}>
                      <button
                        onClick={undo} title="Undo (Ctrl+Z)" disabled={past.length === 0}
                        style={{ ...navBtn(past.length > 0), border: 'none', background: 'transparent' }}
                      ><Undo2 size={16} /></button>
                      <button
                        onClick={redo} title="Redo (Ctrl+Y)" disabled={future.length === 0}
                        style={{ ...navBtn(future.length > 0), border: 'none', background: 'transparent' }}
                      ><Redo2 size={16} /></button>
                    </div>

                    <button className="primary-button" style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', boxShadow: 'none' }}
                      onClick={() => addRoom({ x: window.innerWidth / 2 - 250, y: window.innerHeight / 2 - 150, width: 200, height: 150 })}>
                      <LayoutGrid size={16} /> Add Room
                    </button>

                    {/* Place Sensor button */}
                    <button className="primary-button"
                      style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)', boxShadow: 'none' }}
                      onClick={() => addSensorNode(null, window.innerWidth / 2 - 120, window.innerHeight / 2 - 60)}>
                      <Wifi size={16} /> Place Sensor
                    </button>

                    {/* Deploy gateway if none placed */}
                    {!gatewayNode && (
                      <button className="primary-button" style={{ background: 'var(--status-active-bg)', border: 'none', color: 'var(--status-active)', boxShadow: 'none' }}
                        onClick={() => updateGatewayNode({ x: window.innerWidth / 2, y: 80 })}>
                        <Radio size={16} /> Deploy Gateway
                      </button>
                    )}

                    <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 0.25rem' }}></div>

                    <button className="primary-button" onClick={() => { setDesignerState('VIEW'); useStore.getState().selectItem(null); }}>
                      Save Layout
                    </button>
                  </div>
                ) : (
                  <button className="primary-button" onClick={() => setDesignerState('EDIT')}>
                    Edit Layout
                  </button>
                )}
              </div>
            </div>
          </>
        ) : activePage === 'dashboard' ? (
          <NetworkDashboard />
        ) : activePage === 'settings' ? (
          <Settings />
        ) : null}
      </main>
    </div>
  );
}

// ─── Style helpers ──────────────────────────────────────────────────────────

const navBtn = (enabled) => ({
  background: enabled ? 'var(--bg-raised)' : 'transparent',
  border: '1px solid var(--border-subtle)',
  color: enabled ? 'var(--text-primary)' : 'var(--text-tertiary)',
  padding: '0.38rem', borderRadius: '7px',
  cursor: enabled ? 'pointer' : 'not-allowed',
  display: 'flex', alignItems: 'center',
  transition: 'background 0.15s, color 0.15s',
});

const tabBtn = (active, color) => ({
  padding: '0.45rem 0.9rem', borderRadius: '8px', border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
  fontWeight: 500, fontSize: '0.82rem', transition: 'all 0.15s',
  backgroundColor: active ? `${color}18` : 'transparent',
  color: active ? color : '#64748B',
});

export default App;
