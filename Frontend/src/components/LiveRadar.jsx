import React, { useMemo } from 'react';
import useStore from '../store/useStore';
import { Target, Activity, AlertTriangle, Zap } from 'lucide-react';

export default function LiveRadar() {
  const targets = useStore(s => s.liveRadarTargets);

  // Constants for radar scale
  const MAX_RANGE_MM = 6000; // 6 meters max range
  const RADAR_SIZE = 300; // SVG size
  const CENTER_X = RADAR_SIZE / 2;
  const SENSOR_Y = RADAR_SIZE; // Sensor is at the bottom center of the view

  // Map mm to SVG pixels
  // x: -MAX_RANGE_MM to +MAX_RANGE_MM maps to 0 to RADAR_SIZE
  // y: 0 to MAX_RANGE_MM maps to SENSOR_Y to 0
  const mapCoord = (val, isY = false) => {
    if (isY) {
      // y=0 is SENSOR_Y, y=MAX is 0
      return SENSOR_Y - (val / MAX_RANGE_MM) * SENSOR_Y;
    } else {
      // x=0 is CENTER_X, x=-MAX is 0, x=+MAX is RADAR_SIZE
      return CENTER_X + (val / MAX_RANGE_MM) * (RADAR_SIZE / 2);
    }
  };

  const getTargetColor = (alarm) => {
    if (alarm === 2) return '#ef4444'; // Red for critical
    if (alarm === 1) return '#f59e0b'; // Amber for warning
    return '#10b981'; // Green for normal
  };

  const hasCritical = targets.some(t => t.alarm === 2);
  const hasWarning = targets.some(t => t.alarm === 1);

  let statusColor = 'var(--text-secondary)';
  let statusText = 'Scanning area...';
  if (hasCritical) {
    statusColor = '#ef4444';
    statusText = 'Critical Warning Detected!';
  } else if (hasWarning) {
    statusColor = '#f59e0b';
    statusText = 'Movement Warning';
  } else if (targets.length > 0) {
    statusColor = '#10b981';
    statusText = `Tracking ${targets.length} target${targets.length > 1 ? 's' : ''}`;
  }

  return (
    <div className="live-radar" style={{
      background: 'var(--bg-secondary)',
      borderRadius: '16px',
      padding: '1.5rem',
      border: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }}>
      
      {/* Header */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '8px',
            borderRadius: '8px',
            color: '#10b981'
          }}>
            <Activity size={20} className="spin-animation-slow" />
          </div>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>Live Radar</h3>
            <span style={{ fontSize: '0.85rem', color: statusColor, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {(hasCritical || hasWarning) && <AlertTriangle size={12} />}
              {statusText}
            </span>
          </div>
        </div>
        
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          Range: 6m
        </div>
      </div>

      {/* Radar SVG */}
      <div style={{
        position: 'relative',
        width: RADAR_SIZE,
        height: RADAR_SIZE,
        background: '#0f172a',
        borderRadius: '50% 50% 16px 16px',
        overflow: 'hidden',
        border: '2px solid #1e293b',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
      }}>
        
        {/* Grid lines */}
        <svg width={RADAR_SIZE} height={RADAR_SIZE} style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Distance Arcs (1m, 2m, 3m, 4m, 5m, 6m) */}
          {[1, 2, 3, 4, 5, 6].map(m => {
            const r = (m * 1000 / MAX_RANGE_MM) * SENSOR_Y;
            return (
              <circle
                key={m}
                cx={CENTER_X}
                cy={SENSOR_Y}
                r={r}
                fill="none"
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray={m % 2 === 0 ? "none" : "4 4"}
              />
            );
          })}

          {/* Angle lines (-45deg, 0deg, +45deg) */}
          <line x1={CENTER_X} y1={SENSOR_Y} x2={CENTER_X} y2={0} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
          <line x1={CENTER_X} y1={SENSOR_Y} x2={0} y2={SENSOR_Y - CENTER_X} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
          <line x1={CENTER_X} y1={SENSOR_Y} x2={RADAR_SIZE} y2={SENSOR_Y - CENTER_X} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

          {/* Sensor indicator */}
          <path d={`M ${CENTER_X-10} ${SENSOR_Y} L ${CENTER_X} ${SENSOR_Y-15} L ${CENTER_X+10} ${SENSOR_Y} Z`} fill="#3b82f6" />
        </svg>

        {/* Sweeping radar effect */}
        <div className="radar-sweep" style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          width: RADAR_SIZE,
          height: RADAR_SIZE,
          background: 'conic-gradient(from 270deg at 0% 100%, rgba(16, 185, 129, 0) 0deg, rgba(16, 185, 129, 0.1) 60deg, rgba(16, 185, 129, 0.8) 90deg)',
          transformOrigin: '0% 100%',
          animation: 'radar-sweep 4s infinite linear'
        }} />

        {/* Targets */}
        {targets.map((t, idx) => {
          // If the hardware sent a string instead of a JSON object for the target, parse it!
          let targetData = t;
          if (typeof t === 'string') {
            try {
              targetData = JSON.parse(t);
            } catch(e) {}
          }

          const xVal = typeof targetData.x === 'number' ? targetData.x : parseFloat(targetData.x) || 0;
          const yVal = typeof targetData.y === 'number' ? targetData.y : parseFloat(targetData.y) || 0;
          const px = mapCoord(xVal, false);
          const py = mapCoord(yVal, true);
          const color = getTargetColor(targetData.alarm);
          const speed = typeof targetData.speed === 'number' ? targetData.speed : parseFloat(targetData.speed) || 0;
          
          return (
            <div
              key={targetData.id || idx}
              style={{
                position: 'absolute',
                left: `${px}px`,
                top: `${py}px`,
                width: '16px',
                height: '16px',
                backgroundColor: color,
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
                border: '2px solid white',
                transition: 'all 0.3s ease-out',
                zIndex: 9999
              }}
            >
              {/* Target Details */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.8)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                color: 'white',
                whiteSpace: 'nowrap',
                border: `1px solid ${color}`
              }}>
                ID: {targetData.id || '?'} | {(speed / 100).toFixed(1)} m/s
              </div>
            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes radar-sweep {
          0% { transform: rotate(-90deg); }
          100% { transform: rotate(90deg); }
        }
        @keyframes radar-ping {
          75%, 100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .spin-animation-slow {
          animation: spin 3s linear infinite;
        }
      `}} />
    </div>
  );
}
