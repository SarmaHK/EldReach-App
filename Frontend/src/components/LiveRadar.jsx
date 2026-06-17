import React, { useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import { AlertTriangle } from 'lucide-react';

export default function LiveRadar() {
  // Low-frequency UI state for the header
  const [status, setStatus] = useState({
    text: 'Scanning...',
    color: '#e6edf3',
    showIcon: false,
  });

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // High-frequency data store (bypasses React rendering)
  const latestDataRef = useRef([]);
  // To track changes and avoid unnecessary React state updates
  const previousStatusStringRef = useRef('Scanning...|#e6edf3|false');

  useEffect(() => {
    // 1. Subscribe to Zustand store changes without triggering React re-renders
    const unsubscribe = useStore.subscribe((state) => {
      // Store the latest packet for the Canvas animation loop
      latestDataRef.current = state.liveRadarTargets || [];
    });

    let animationFrameId;

    // Drawing function
    const drawRadar = (ctx, width, height, targets) => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Constants to match python script's "Room View"
      const ROOM_WIDTH_MM = 10000; // -5000 to 5000
      const ROOM_DEPTH_MM = 6000;  // 0 to 6000

      const mapX = (val) => ((val + 5000) / ROOM_WIDTH_MM) * width;
      const mapY = (val) => height - (val / ROOM_DEPTH_MM) * height;

      // 1. Draw FOV Cone
      const angleRad = 90 * Math.PI / 180; // Pointing up
      const fovRad = 60 * Math.PI / 180;
      const rangeMm = 6000;
      const fovStartAngle = angleRad - fovRad; 
      const fovEndAngle = angleRad + fovRad;   
      
      ctx.fillStyle = 'rgba(88, 166, 255, 0.06)'; // #58a6ff with opacity
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
      for (let x = -5000; x <= 5000; x += 1000) {
        ctx.moveTo(mapX(x), 0);
        ctx.lineTo(mapX(x), height);
      }
      for (let y = 1000; y <= 6000; y += 1000) {
        ctx.moveTo(0, mapY(y));
        ctx.lineTo(width, mapY(y));
      }
      ctx.stroke();

      // 3. Draw Gate Arcs (Distance Rings)
      const gates = [1, 2, 3, 4, 5, 6, 7, 8];
      gates.forEach(g => {
        const dist = g * 750;
        const rx = mapX(dist) - mapX(0);
        const ry = height - mapY(dist); // since mapY(0) is height
        
        ctx.beginPath();
        ctx.ellipse(mapX(0), mapY(0), rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Gate Label at 60 deg (right side of cone)
        if (dist <= 6000) {
          ctx.fillStyle = '#484f58';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const textX = mapX(0) + rx * Math.cos(60 * Math.PI / 180);
          const textY = mapY(0) - ry * Math.sin(60 * Math.PI / 180);
          ctx.fillText(`G${g}`, textX, textY);
        }
      });

      // 4. Draw Axis Labels
      ctx.fillStyle = '#e6edf3';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (let x = -5000; x <= 5000; x += 1000) {
        if (x !== 0) ctx.fillText(x.toString(), mapX(x), height - 4);
      }
      
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let y = 1000; y <= 6000; y += 1000) {
        ctx.fillText(y.toString(), mapX(0) + 4, mapY(y));
      }
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('0', mapX(0), height - 4);

      // 5. Draw Targets
      targets.forEach((t, idx) => {
        let targetData = t;
        if (typeof t === 'string') {
          try { targetData = JSON.parse(t); } catch(e) {}
        }

        const xVal = typeof targetData.x === 'number' ? targetData.x : parseFloat(targetData.x) || 0;
        const yVal = typeof targetData.y === 'number' ? targetData.y : parseFloat(targetData.y) || 0;
        
        if (xVal > 5000 || xVal < -5000 || yVal > 6000 || yVal < 0) return;

        const px = mapX(xVal);
        const py = mapY(yVal);
        
        let color = '#58a6ff'; // Blue
        if (targetData.alarm === 2) color = '#ff7b72'; // Red
        else if (targetData.alarm === 1) color = '#f59e0b'; // Amber
        
        const speed = typeof targetData.speed === 'number' ? targetData.speed : parseFloat(targetData.speed) || 0;

        // Draw shadow / glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        
        // Target circle
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.shadowBlur = 0; // Reset shadow
        
        // Target labels
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
      ctx.fillStyle = '#f0883e'; // Orange
      ctx.fill();

      // Sensor details overlay text
      ctx.fillStyle = '#f0883e';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Sensor', 12, height - 28);
      ctx.fillText('6000mm Range', 12, height - 16);
      ctx.fillText('120° FOV', 12, height - 4);
    };

    // 2. Setup rendering loop
    const renderLoop = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      const targets = latestDataRef.current;

      // Handle canvas resizing + high DPI scaling
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      // Draw the frame
      drawRadar(ctx, rect.width, rect.height, targets);

      // 3. Evaluate low-frequency UI state (Headers)
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

      // Only update React state if the visual outcome actually changed
      const nextStatusString = `${nextStatus.text}|${nextStatus.color}|${nextStatus.showIcon}`;
      if (nextStatusString !== previousStatusStringRef.current) {
        previousStatusStringRef.current = nextStatusString;
        setStatus(nextStatus);
      }

      // Loop
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    // Start the loop
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
      alignItems: 'center',
      gap: '1rem',
      width: '100%',
      fontFamily: 'sans-serif'
    }}>
      
      {/* Header - Handled by low-frequency React state */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: '#e6edf3', fontSize: '1.1rem', fontWeight: 500 }}>Room View — Live Tracking</h3>
        </div>
        <div style={{ fontSize: '0.85rem', color: status.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {status.showIcon && <AlertTriangle size={14} />}
          {status.text}
        </div>
      </div>

      {/* Radar Plot Area - High frequency Canvas */}
      <div 
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '5 / 3',
          background: '#0d1117',
          border: '1px solid #21262d',
          overflow: 'hidden'
        }}
      >
        <canvas 
          ref={canvasRef} 
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      <div style={{ color: '#e6edf3', fontSize: '11px', marginTop: '2px' }}>
        Room X (mm)
      </div>
    </div>
  );
}
