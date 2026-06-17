import React from 'react';
import useStore from '../store/useStore';
import { AlertTriangle } from 'lucide-react';

export default function LiveRadar() {
  const targets = useStore(s => s.liveRadarTargets);

  // Constants to match python script's "Room View"
  const ROOM_WIDTH_MM = 5000;
  const ROOM_DEPTH_MM = 4000;
  
  // For SVG coordinate system
  const SVG_W = 500;
  const SVG_H = 400;

  const mapX = (val) => (val / ROOM_WIDTH_MM) * SVG_W;
  const mapY = (val) => SVG_H - (val / ROOM_DEPTH_MM) * SVG_H;

  const getTargetColor = (alarm) => {
    if (alarm === 2) return '#ff7b72'; // Red
    if (alarm === 1) return '#f59e0b'; // Amber
    return '#58a6ff'; // Blue
  };

  const hasCritical = targets.some(t => t.alarm === 2);
  const hasWarning = targets.some(t => t.alarm === 1);

  let statusColor = '#e6edf3';
  let statusText = 'Scanning...';
  if (hasCritical) {
    statusColor = '#ff7b72';
    statusText = 'Critical Warning Detected!';
  } else if (hasWarning) {
    statusColor = '#f59e0b';
    statusText = 'Movement Warning';
  } else if (targets.length > 0) {
    statusColor = '#3fb950';
    statusText = `Tracking ${targets.length} target${targets.length > 1 ? 's' : ''}`;
  }

  // Draw Gate Arcs G1 to G8
  const gates = [1, 2, 3, 4, 5, 6, 7, 8];
  
  // Calculate FOV polygon
  const angleRad = 45 * Math.PI / 180;
  const fovRad = 60 * Math.PI / 180;
  const rangeMm = 6000;
  const fovStartAngle = angleRad - fovRad; 
  const fovEndAngle = angleRad + fovRad;   
  
  let fovPoints = `0,${SVG_H} `;
  for(let a = fovStartAngle; a <= fovEndAngle; a += 0.05) {
    let x = Math.min(ROOM_WIDTH_MM, Math.max(0, rangeMm * Math.cos(a)));
    let y = Math.min(ROOM_DEPTH_MM, Math.max(0, rangeMm * Math.sin(a)));
    fovPoints += `${mapX(x)},${mapY(y)} `;
  }
  fovPoints += `0,${SVG_H}`;

  return (
    <div className="live-radar" style={{
      background: '#0d1117',
      borderRadius: '8px',
      padding: '1.2rem',
      border: '1px solid #30363d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
      width: '100%',
      fontFamily: 'sans-serif'
    }}>
      
      {/* Header */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: '#e6edf3', fontSize: '1.1rem', fontWeight: 500 }}>Room View — Live Tracking</h3>
        </div>
        <div style={{ fontSize: '0.85rem', color: statusColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {(hasCritical || hasWarning) && <AlertTriangle size={14} />}
          {statusText}
        </div>
      </div>

      {/* Radar Plot Area */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '5 / 4',
        background: '#0d1117',
        border: '1px solid #21262d',
        overflow: 'hidden'
      }}>
        
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          
          {/* FOV Cone */}
          <polygon points={fovPoints} fill="#58a6ff" opacity="0.06" />

          {/* Grid lines */}
          {[1000, 2000, 3000, 4000].map(x => (
            <line key={`v-${x}`} x1={mapX(x)} y1={0} x2={mapX(x)} y2={SVG_H} stroke="#21262d" strokeWidth="1" />
          ))}
          {[1000, 2000, 3000, 4000].map(y => (
            <line key={`h-${y}`} x1={0} y1={mapY(y)} x2={SVG_W} y2={mapY(y)} stroke="#21262d" strokeWidth="1" />
          ))}

          {/* Distance Arcs and Gate Labels */}
          {gates.map(g => {
            const dist = g * 750;
            const rx = mapX(dist) - mapX(0); 
            const ry = SVG_H - mapY(dist);
            
            return (
              <g key={`gate-${g}`}>
                <ellipse
                  cx={0}
                  cy={SVG_H}
                  rx={rx}
                  ry={ry}
                  fill="none"
                  stroke="#21262d"
                  strokeWidth="1"
                />
                {/* Gate Label at 45 deg */}
                {dist < Math.sqrt(ROOM_WIDTH_MM*ROOM_WIDTH_MM + ROOM_DEPTH_MM*ROOM_DEPTH_MM) && (
                  <text 
                    x={rx * Math.cos(45 * Math.PI / 180)} 
                    y={SVG_H - ry * Math.sin(45 * Math.PI / 180)} 
                    fill="#484f58" 
                    fontSize="10"
                    textAnchor="middle"
                  >
                    G{g}
                  </text>
                )}
              </g>
            );
          })}

          {/* X/Y Axis Labels (1000, 2000, etc) */}
          {[1000, 2000, 3000, 4000].map(x => (
             <text key={`lx-${x}`} x={mapX(x)} y={SVG_H - 4} fill="#e6edf3" fontSize="10" textAnchor="middle">{x}</text>
          ))}
          {[1000, 2000, 3000, 4000].map(y => (
             <text key={`ly-${y}`} x={12} y={mapY(y)} fill="#e6edf3" fontSize="10" alignmentBaseline="middle" textAnchor="middle">{y}</text>
          ))}
          <text x={8} y={SVG_H - 4} fill="#e6edf3" fontSize="10" textAnchor="middle">0</text>
        </svg>

        {/* Targets */}
        {targets.map((t, idx) => {
          let targetData = t;
          if (typeof t === 'string') {
            try { targetData = JSON.parse(t); } catch(e) {}
          }

          const xVal = typeof targetData.x === 'number' ? targetData.x : parseFloat(targetData.x) || 0;
          const yVal = typeof targetData.y === 'number' ? targetData.y : parseFloat(targetData.y) || 0;
          
          // CSS percentage coordinates
          const leftPct = (xVal / ROOM_WIDTH_MM) * 100;
          const topPct = (1 - (yVal / ROOM_DEPTH_MM)) * 100;
          
          const color = getTargetColor(targetData.alarm);
          const speed = typeof targetData.speed === 'number' ? targetData.speed : parseFloat(targetData.speed) || 0;
          
          return (
            <div
              key={targetData.id ?? idx}
              style={{
                position: 'absolute',
                left: `${Math.max(0, Math.min(100, leftPct))}%`,
                top: `${Math.max(0, Math.min(100, topPct))}%`,
                width: '12px',
                height: '12px',
                backgroundColor: color,
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 8px ${color}`,
                transition: 'all 0.3s ease-out',
                zIndex: 10,
                display: (xVal > ROOM_WIDTH_MM || yVal > ROOM_DEPTH_MM || xVal < 0 || yVal < 0) ? 'none' : 'block'
              }}
            >
              {/* Target Details */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: color,
                fontSize: '11px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                pointerEvents: 'none'
              }}>
                T{targetData.id ?? '0'}
                <br/>
                {speed}mm/s
              </div>
            </div>
          );
        })}
        
        {/* Sensor marker icon */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '8px',
          height: '8px',
          background: '#f0883e',
          clipPath: 'polygon(0 100%, 100% 100%, 0 0)'
        }}></div>

        {/* Sensor details overlay */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '12px',
          color: '#f0883e',
          fontSize: '10px',
          lineHeight: '1.2',
          pointerEvents: 'none'
        }}>
          Sensor<br/>
          1800mm<br/>
          45°
        </div>
      </div>

      <div style={{ color: '#e6edf3', fontSize: '11px', marginTop: '2px' }}>
        Room X (mm)
      </div>
    </div>
  );
}
