import React, { useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import { AlertTriangle } from 'lucide-react';

export default function LiveRadar() {
  const [status, setStatus] = useState({
    text: 'Scanning...',
    color: '#e6edf3',
    showIcon: false,
  });

  const [roomConfig, setRoomConfig] = useState({ width: 10000, depth: 6000 });
  const roomConfigRef = useRef(roomConfig);
  useEffect(() => { roomConfigRef.current = roomConfig; }, [roomConfig]);

  const [activeTab, setActiveTab] = useState('velocity');
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const handleSyncToLayout = () => {
    try {
      const pxWidth = Number(roomConfig.width) / 1000 * 40;
      const pxHeight = Number(roomConfig.depth) / 1000 * 40;
      
      const store = useStore.getState();
      
      store.addRoom({
          x: 100,
          y: 100,
          width: pxWidth,
          height: pxHeight,
      });
      
      const state1 = useStore.getState();
      const newRoomId = state1.rooms[state1.rooms.length - 1]?.id;
      
      if (newRoomId) {
          store.createLogicalRoom(
              "Radar Room", 
              { x: 100, y: 100, width: pxWidth, height: pxHeight }, 
              [newRoomId]
          );
          
          const state2 = useStore.getState();
          const newLrId = state2.logicalRooms[state2.logicalRooms.length - 1]?.id;
          
          if (newLrId) {
              store.updateGatewayNode({ x: 120, y: 120 });
              store.setActivePage('designer');
          } else {
              alert('Failed to identify the new logical room.');
          }
      } else {
          alert('Failed to identify the new room.');
      }
    } catch (err) {
      alert('Error creating layout: ' + err.message);
      console.error(err);
    }
  };

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const graphCanvasRef = useRef(null);
  const graphContainerRef = useRef(null);
  
  const latestDataRef = useRef([]);
  const previousStatusStringRef = useRef('Scanning...|#e6edf3|false');
  const historyRef = useRef([]);

  useEffect(() => {
    const unsubscribe = useStore.subscribe((state) => {
      latestDataRef.current = state.liveRadarTargets || [];
    });

    let animationFrameId;

    const drawRadar = (ctx, width, height, targets, config) => {
      ctx.clearRect(0, 0, width, height);

      const ROOM_WIDTH_MM = config.width; 
      const ROOM_DEPTH_MM = config.depth; 

      const mapX = (val) => ((val + ROOM_WIDTH_MM/2) / ROOM_WIDTH_MM) * width;
      const mapY = (val) => height - (val / ROOM_DEPTH_MM) * height;

      // 1. Draw FOV Cone
      const angleRad = 90 * Math.PI / 180; 
      const fovRad = 60 * Math.PI / 180;
      const rangeMm = Math.max(ROOM_WIDTH_MM, ROOM_DEPTH_MM);
      const fovStartAngle = angleRad - fovRad; 
      const fovEndAngle = angleRad + fovRad;   
      
      ctx.fillStyle = 'rgba(88, 166, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(0));
      for(let a = fovStartAngle; a <= fovEndAngle; a += 0.05) {
        let x = rangeMm * Math.cos(a);
        let y = rangeMm * Math.sin(a);
        ctx.lineTo(mapX(x), mapY(y));
      }
      ctx.lineTo(mapX(0), mapY(0));
      ctx.fill();

      // 2. Draw Grid Lines
      ctx.strokeStyle = '#21262d';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      let stepX = ROOM_WIDTH_MM > 20000 ? 5000 : 1000;
      let stepY = ROOM_DEPTH_MM > 20000 ? 5000 : 1000;
      
      for (let x = -ROOM_WIDTH_MM/2; x <= ROOM_WIDTH_MM/2; x += stepX) {
        ctx.moveTo(mapX(x), 0);
        ctx.lineTo(mapX(x), height);
      }
      for (let y = stepY; y <= ROOM_DEPTH_MM; y += stepY) {
        ctx.moveTo(0, mapY(y));
        ctx.lineTo(width, mapY(y));
      }
      ctx.stroke();

      // 3. Draw Gate Arcs (Distance Rings)
      const numGates = Math.ceil(rangeMm / 750);
      for(let g = 1; g <= numGates; g++) {
        const dist = g * 750;
        const rx = mapX(dist) - mapX(0);
        const ry = height - mapY(dist); 
        
        ctx.beginPath();
        ctx.ellipse(mapX(0), mapY(0), Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI);
        ctx.stroke();
        
        if (dist <= rangeMm && g % 2 === 0) { 
          ctx.fillStyle = '#484f58';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const textX = mapX(0) + Math.abs(rx) * Math.cos(60 * Math.PI / 180);
          const textY = mapY(0) - Math.abs(ry) * Math.sin(60 * Math.PI / 180);
          ctx.fillText(`G${g}`, textX, textY);
        }
      }

      // 4. Draw Axis Labels
      ctx.fillStyle = '#e6edf3';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (let x = -ROOM_WIDTH_MM/2; x <= ROOM_WIDTH_MM/2; x += stepX) {
        if (x !== 0) ctx.fillText(x.toString(), mapX(x), height - 4);
      }
      
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let y = stepY; y <= ROOM_DEPTH_MM; y += stepY) {
        ctx.fillText(y.toString(), mapX(0) + 4, mapY(y));
      }
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('0', mapX(0), height - 4);

      // 5. Draw Targets
      targets.forEach((t) => {
        let targetData = t;
        if (typeof t === 'string') {
          try { targetData = JSON.parse(t); } catch(e) {}
        }

        const xVal = typeof targetData.x === 'number' ? targetData.x : parseFloat(targetData.x) || 0;
        const yVal = typeof targetData.y === 'number' ? targetData.y : parseFloat(targetData.y) || 0;
        
        if (xVal > ROOM_WIDTH_MM/2 || xVal < -ROOM_WIDTH_MM/2 || yVal > ROOM_DEPTH_MM || yVal < 0) return;

        const px = mapX(xVal);
        const py = mapY(yVal);
        
        let color = '#58a6ff'; 
        if (targetData.alarm === 2) color = '#ff7b72'; 
        else if (targetData.alarm === 1) color = '#f59e0b'; 
        
        const speed = typeof targetData.speed === 'number' ? targetData.speed : parseFloat(targetData.speed) || 0;

        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.shadowBlur = 0; 
        
        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`T${targetData.id ?? '0'}`, px, py - 18);
        ctx.fillText(`${speed}mm/s`, px, py - 6);
      });

      // 6. Draw Sensor marker
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(0) - 8);
      ctx.lineTo(mapX(0) + 8, mapY(0));
      ctx.lineTo(mapX(0) - 8, mapY(0));
      ctx.fillStyle = '#f0883e'; 
      ctx.fill();

      ctx.fillStyle = '#f0883e';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Sensor', 12, height - 28);
      ctx.fillText(`${rangeMm}mm Range`, 12, height - 16);
      ctx.fillText('120° FOV', 12, height - 4);
    };

    const drawGraph = (ctx, width, height, history, tab, now) => {
      ctx.clearRect(0, 0, width, height);
      
      const maxTime = now;
      const minTime = now - 10000;
      const mapX = (t) => ((t - minTime) / 10000) * width;
      
      let maxY = 1000; 
      if (tab === 'fall') maxY = 3000; 
      
      if (tab === 'velocity') {
         const maxS = Math.max(...history.map(d => d.speed), 1000);
         maxY = Math.ceil(maxS / 1000) * 1000; 
      } else if (tab === 'fall') {
         const maxZ = Math.max(...history.map(d => d.z), 3000);
         maxY = Math.ceil(maxZ / 1000) * 1000;
      }
      
      const mapY = (val) => height - (val / maxY) * height;
      
      // Draw Grid
      ctx.strokeStyle = '#21262d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let i=0; i<=5; i++) {
        const y = height - (i/5) * height;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      
      // Draw Labels
      ctx.fillStyle = '#e6edf3';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      for(let i=1; i<=5; i++) {
        const yVal = (i/5) * maxY;
        ctx.fillText(yVal.toString() + (tab === 'velocity' ? ' mm/s' : ' mm'), 4, mapY(yVal) - 2);
      }
      
      // Draw Data
      if (history.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = tab === 'velocity' ? '#58a6ff' : '#ff7b72';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = ctx.strokeStyle;
        
        const first = history[0];
        ctx.moveTo(mapX(first.time), mapY(tab === 'velocity' ? first.speed : first.z));
        
        for(let i=1; i<history.length; i++) {
          const pt = history[i];
          ctx.lineTo(mapX(pt.time), mapY(tab === 'velocity' ? pt.speed : pt.z));
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Fill under curve
        ctx.lineTo(mapX(history[history.length-1].time), height);
        ctx.lineTo(mapX(history[0].time), height);
        ctx.fillStyle = tab === 'velocity' ? 'rgba(88, 166, 255, 0.1)' : 'rgba(255, 123, 114, 0.1)';
        ctx.fill();
      }
    };

    const renderLoop = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const now = Date.now();
      const targets = latestDataRef.current;
      
      // 1. Data Processing for history graph
      let maxSpeed = 0;
      let minZ = 3000; 
      let hasTargets = false;
      
      targets.forEach(t => {
        let td = t;
        if (typeof t === 'string') try { td = JSON.parse(t); } catch(e){}
        const s = typeof td.speed === 'number' ? td.speed : parseFloat(td.speed) || 0;
        const z = typeof td.z === 'number' ? td.z : parseFloat(td.z) || 3000;
        if (s > maxSpeed) maxSpeed = s;
        if (z < minZ && z > 0) minZ = z; 
        hasTargets = true;
      });
      
      historyRef.current.push({ 
        time: now, 
        speed: hasTargets ? maxSpeed : 0, 
        z: hasTargets ? minZ : 3000 
      });
      
      const tenSecondsAgo = now - 10000;
      historyRef.current = historyRef.current.filter(d => d.time > tenSecondsAgo);

      // Update Digital Speed Meter DOM
      const speedMeter = document.getElementById('live-speed-meter');
      if (speedMeter) {
        speedMeter.textContent = `${Math.round(hasTargets ? maxSpeed : 0)} mm/s`;
      }

      // 2. Radar Rendering
      const ctx = canvas.getContext('2d');
      const rect = container.getBoundingClientRect();
      
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      drawRadar(ctx, rect.width, rect.height, targets, roomConfigRef.current);

      // 3. Graph Rendering
      const gCanvas = graphCanvasRef.current;
      const gContainer = graphContainerRef.current;
      if (gCanvas && gContainer) {
         const gCtx = gCanvas.getContext('2d');
         const gRect = gContainer.getBoundingClientRect();
         if (gCanvas.width !== gRect.width * dpr || gCanvas.height !== gRect.height * dpr) {
           gCanvas.width = gRect.width * dpr;
           gCanvas.height = gRect.height * dpr;
           gCtx.scale(dpr, dpr);
         }
         drawGraph(gCtx, gRect.width, gRect.height, historyRef.current, activeTabRef.current, now);
      }

      // 4. Evaluate Header Status
      const hasCritical = targets.some(t => {
        let td = t;
        if (typeof t === 'string') try { td = JSON.parse(t); } catch(e){}
        return td.alarm === 2;
      });
      
      const hasWarning = targets.some(t => {
        let td = t;
        if (typeof t === 'string') try { td = JSON.parse(t); } catch(e){}
        return td.alarm === 1;
      });

      let nextStatus = { text: 'Scanning...', color: '#e6edf3', showIcon: false };
      if (hasCritical) {
        nextStatus = { text: 'Critical Warning Detected!', color: '#ff7b72', showIcon: true };
      } else if (hasWarning) {
        nextStatus = { text: 'Movement Warning', color: '#f59e0b', showIcon: true };
      } else if (targets.length > 0) {
        nextStatus = { text: `Tracking ${targets.length} target${targets.length > 1 ? 's' : ''}`, color: '#3fb950', showIcon: false };
      }

      const nextStatusString = `${nextStatus.text}|${nextStatus.color}|${nextStatus.showIcon}`;
      if (nextStatusString !== previousStatusStringRef.current) {
        previousStatusStringRef.current = nextStatusString;
        setStatus(nextStatus);
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      unsubscribe();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="live-radar" style={{
      background: '#0d1117',
      borderRadius: '8px',
      padding: '1.2rem',
      border: '1px solid #30363d',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      width: '100%',
      fontFamily: 'sans-serif'
    }}>
      
      {/* Header */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h3 style={{ margin: 0, color: '#e6edf3', fontSize: '1.1rem', fontWeight: 500 }}>Room View — Live Tracking</h3>
          
          {/* Digital Speed Meter */}
          <div style={{
            background: 'rgba(88, 166, 255, 0.1)',
            border: '1px solid rgba(88, 166, 255, 0.2)',
            padding: '4px 12px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#58a6ff',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 0 10px rgba(88, 166, 255, 0.1)'
          }}>
            <span>⚡ SPEED:</span>
            <span id="live-speed-meter">0 mm/s</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ color: '#e6edf3', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Room Width (mm): 
            <input type="number" step="1000" value={roomConfig.width} onChange={e => setRoomConfig(c => ({...c, width: Number(e.target.value)}))} style={{ background: '#0d1117', color: '#fff', border: '1px solid #30363d', padding: '4px', borderRadius: '4px', width: '70px', fontSize: '12px' }} />
          </label>
          <label style={{ color: '#e6edf3', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Room Depth (mm): 
            <input type="number" step="1000" value={roomConfig.depth} onChange={e => setRoomConfig(c => ({...c, depth: Number(e.target.value)}))} style={{ background: '#0d1117', color: '#fff', border: '1px solid #30363d', padding: '4px', borderRadius: '4px', width: '70px', fontSize: '12px' }} />
          </label>
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); handleSyncToLayout(); }}
            style={{
              padding: '6px 12px',
              background: '#238636',
              color: '#fff',
              border: '1px solid rgba(240, 246, 252, 0.1)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              zIndex: 10
            }}
          >
            Create in Layout Builder
          </button>
        </div>

        <div style={{ fontSize: '0.85rem', color: status.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {status.showIcon && <AlertTriangle size={14} />}
          {status.text}
        </div>
      </div>

      {/* Main Content Split */}
      <div style={{ display: 'flex', width: '100%', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* Radar Plot Area */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column' }}>
          <div 
            ref={containerRef}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '5 / 3',
              background: '#0d1117',
              border: '1px solid #21262d',
              overflow: 'hidden',
              borderRadius: '6px'
            }}
          >
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
          <div style={{ color: '#e6edf3', fontSize: '11px', marginTop: '6px', textAlign: 'center' }}>
            Room X (mm)
          </div>
        </div>

        {/* Secondary Graph Area */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button 
              onClick={() => setActiveTab('velocity')} 
              style={{ 
                flex: 1, padding: '8px', 
                background: activeTab === 'velocity' ? '#1f6feb' : '#21262d', 
                color: '#fff', border: '1px solid #30363d', borderRadius: '6px', 
                cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                transition: 'background 0.2s'
              }}>
              Velocity
            </button>
            <button 
              onClick={() => setActiveTab('fall')} 
              style={{ 
                flex: 1, padding: '8px', 
                background: activeTab === 'fall' ? '#da3633' : '#21262d', 
                color: '#fff', border: '1px solid #30363d', borderRadius: '6px', 
                cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                transition: 'background 0.2s'
              }}>
              Fall Detection (Z Height)
            </button>
          </div>
          <div 
            ref={graphContainerRef}
            style={{
              position: 'relative',
              width: '100%',
              flex: 1,
              minHeight: '250px',
              background: '#0d1117',
              border: '1px solid #21262d',
              overflow: 'hidden',
              borderRadius: '6px'
            }}
          >
            <canvas ref={graphCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
          <div style={{ color: '#e6edf3', fontSize: '11px', marginTop: '6px', textAlign: 'center' }}>
            Time (last 10s)
          </div>
        </div>

      </div>
    </div>
  );
}
