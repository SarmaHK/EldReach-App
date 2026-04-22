import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Stage, Layer, Line, Group, Rect, Text, Circle } from 'react-konva';
import useStore from '../store/useStore';
import Room from './Room';
import Furniture from './Furniture';
import Doorway from './Doorway';

// ─── Status → fill color ───────────────────────────────────────────────────────
const NODE_COLORS = {
  UNBOUND:      '#475569', // grey
  CONNECTED:    '#10b981', // green
  INACTIVE:     '#f59e0b', // amber
  ALERT:        '#ef4444', // red
  DISCONNECTED: '#475569', // grey (same as unbound but dimmer)
};

const getNodeColor = (status) => NODE_COLORS[status] ?? '#475569';

const Canvas = ({ theme }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const rooms        = useStore(s => s.rooms);
  const furnitures   = useStore(s => s.furnitures);
  const doorways     = useStore(s => s.doorways);
  const logicalRooms = useStore(s => s.logicalRooms);
  const sensors      = useStore(s => s.sensors);

  const selectedIds    = useStore(s => s.selectedIds);
  const lockedIds      = useStore(s => s.lockedIds);
  const selectItem     = useStore(s => s.selectItem);
  const designerState  = useStore(s => s.designerState);

  const updateRoom      = useStore(s => s.updateRoom);
  const updateFurniture = useStore(s => s.updateFurniture);
  const updateDoorway   = useStore(s => s.updateDoorway);
  const updateSensor    = useStore(s => s.updateSensor);

  const gatewayNode      = useStore(s => s.gatewayNode);
  const updateGatewayNode = useStore(s => s.updateGatewayNode);
  const globalGatewayId  = useStore(s => s.globalGatewayId);
  const monitoringState  = useStore(s => s.monitoringState);

  // Gateway outer ring color reflects worst room status
  const gatewayColor = useMemo(() => {
    const states = Object.values(monitoringState);
    if (!states.length) return '#10b981';
    if (states.some(s => s.status === 'ALERT')) return '#ef4444';
    if (states.some(s => s.connectionStatus === 'DISCONNECTED')) return '#f59e0b';
    return '#10b981';
  }, [monitoringState]);

  // Canvas resize
  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const checkDeselect = (e) => {
    if (e.target === e.target.getStage()) selectItem(null);
  };

  const GRID = 40;
  const gridLines = [];
  const gridColor = theme === 'dark' ? 'rgba(148,163,184,0.08)' : '#E5E7EB';
  if (designerState === 'EDIT') {
    for (let i = 0; i < dimensions.width / GRID; i++) {
      gridLines.push(<Line key={`v-${i}`} points={[i * GRID + 0.5, 0, i * GRID + 0.5, dimensions.height]} stroke={gridColor} strokeWidth={1} />);
    }
    for (let i = 0; i < dimensions.height / GRID; i++) {
      gridLines.push(<Line key={`h-${i}`} points={[0, i * GRID + 0.5, dimensions.width, i * GRID + 0.5]} stroke={gridColor} strokeWidth={1} />);
    }
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-base)', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
      <Stage width={dimensions.width} height={dimensions.height} onMouseDown={checkDeselect} onTouchStart={checkDeselect}>
        <Layer>{gridLines}</Layer>

        <Layer>
          {/* ── Unbound rooms (not part of any logical room) ── */}
          {rooms.filter(r => !logicalRooms.some(lr => lr.itemIds.includes(r.id))).map(room => (
            <Room
              key={room.id} shapeProps={room}
              isSelected={designerState === 'EDIT' && selectedIds.includes(room.id)}
              isLocked={lockedIds.includes(room.id)}
              onSelect={multi => designerState === 'EDIT' && selectItem(room.id, multi)}
              onChange={attrs  => designerState === 'EDIT' && updateRoom(room.id, attrs)}
              theme={theme}
            />
          ))}

          {furnitures.filter(f => !logicalRooms.some(lr => lr.itemIds.includes(f.id))).map(furn => (
            <Furniture
              key={furn.id} shapeProps={furn}
              isSelected={designerState === 'EDIT' && selectedIds.includes(furn.id)}
              isLocked={lockedIds.includes(furn.id)}
              onSelect={multi => designerState === 'EDIT' && selectItem(furn.id, multi)}
              onChange={attrs  => designerState === 'EDIT' && updateFurniture(furn.id, attrs)}
              theme={theme}
            />
          ))}

          {doorways.filter(d => !logicalRooms.some(lr => lr.itemIds.includes(d.id))).map(door => (
            <Doorway
              key={door.id} shapeProps={door}
              isSelected={designerState === 'EDIT' && selectedIds.includes(door.id)}
              isLocked={lockedIds.includes(door.id)}
              onSelect={multi => designerState === 'EDIT' && selectItem(door.id, multi)}
              onChange={attrs  => designerState === 'EDIT' && updateDoorway(door.id, attrs)}
              theme={theme}
            />
          ))}

          {/* ── Logical room groups ── */}
          {logicalRooms.map(lr => (
            <Group
              key={lr.id}
              draggable={designerState === 'EDIT' && !lockedIds.includes(lr.id)}
              onClick={e => { if (designerState === 'EDIT') { e.cancelBubble = true; selectItem(lr.id, e.evt.shiftKey); } }}
              onTap={e    => { if (designerState === 'EDIT') { e.cancelBubble = true; selectItem(lr.id, e.evt.shiftKey); } }}
              onDragEnd={e => {
                const dx = e.target.x(), dy = e.target.y();
                if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
                useStore.getState().moveLogicalRoom(lr.id, dx, dy);
                e.target.position({ x: 0, y: 0 });
                e.target.getLayer().batchDraw();
              }}
            >
              {rooms.filter(r => lr.itemIds.includes(r.id)).map(r => (
                <Room key={`lr-${r.id}`} shapeProps={r} isSelected={false} onSelect={() => {}} onChange={a => updateRoom(r.id, a)} isLocked={lockedIds.includes(r.id)} theme={theme} />
              ))}
              {furnitures.filter(f => lr.itemIds.includes(f.id)).map(f => (
                <Furniture key={`lr-${f.id}`} shapeProps={f} isSelected={false} onSelect={() => {}} onChange={a => updateFurniture(f.id, a)} isGrouped isLocked={lockedIds.includes(f.id)} theme={theme} />
              ))}
              {doorways.filter(d => lr.itemIds.includes(d.id)).map(d => (
                <Doorway key={`lr-${d.id}`} shapeProps={d} isSelected={false} onSelect={() => {}} onChange={a => updateDoorway(d.id, a)} isGrouped isLocked={lockedIds.includes(d.id)} theme={theme} />
              ))}

              {/* Room label card */}
              <Group x={lr.bounds.x + 10} y={lr.bounds.y + 10}>
                {designerState === 'EDIT' && selectedIds.includes(lr.id) && (
                  <Rect width={184} height={54} fill="rgba(91,141,238,0.12)" stroke="#5b8dee" strokeWidth={1.5} cornerRadius={10} x={-2} y={-2} />
                )}
                <Rect width={180} height={50} fill={theme === 'dark' ? '#0F172A' : '#FFFFFF'} cornerRadius={8} stroke={theme === 'dark' ? '#1E293B' : '#E5E7EB'} strokeWidth={1} shadowColor="#000" shadowBlur={6} shadowOpacity={0.06} shadowOffsetY={2} />
                <Text text={lr.name || 'Unnamed Room'} fill={theme === 'dark' ? '#F8FAFC' : '#1E293B'} x={12} y={10} fontSize={13} fontFamily="system-ui" />
                {/* Show count of bound nodes in this room */}
                {(() => {
                  const roomNodes = sensors.filter(n => n.logicalRoomId === lr.id);
                  const bound = roomNodes.filter(n => n.assignedDeviceId);
                  const label = bound.length
                    ? `${bound.length}/${roomNodes.length} sensor${roomNodes.length !== 1 ? 's' : ''} active`
                    : roomNodes.length
                      ? `${roomNodes.length} sensor${roomNodes.length !== 1 ? 's' : ''} — not connected`
                      : 'No sensors placed';
                  const color = bound.length ? '#10b981' : roomNodes.length ? '#f59e0b' : '#64748b';
                  return <Text text={label} fill={color} x={12} y={30} fontSize={11} fontFamily="system-ui" />;
                })()}
              </Group>
            </Group>
          ))}

          {/* ── Backend Room Boundaries ── */}
          {useStore.getState().backendRooms?.map(br => {
            if (!br.boundary || br.boundary.length < 3) return null;
            // Map points to canvas. For now, assume global coordinates or find first sensor in room
            // In a real app, you'd have a mapping between backend 'meters' and frontend 'pixels'
            // For this integration, we'll draw them near the logical room bounds.
            const lr = logicalRooms.find(l => l.id === br.roomId || l.name === br.name);
            if (!lr) return null;
            
            const points = br.boundary.flatMap(p => [
              lr.bounds.x + p.x * 100, 
              lr.bounds.y + p.y * 100
            ]);

            return (
              <Line
                key={`bound-${br.roomId}`}
                points={points}
                closed
                stroke="#4F46E5"
                strokeWidth={2}
                fill="rgba(79, 70, 229, 0.05)"
                dash={[10, 5]}
              />
            );
          })}

          {/* ── Sensor nodes ── */}
          {sensors.map(node => {
            const isSelected = selectedIds.includes(node.id);
            const color      = getNodeColor(node.status);
            const isGlowing  = node.status === 'CONNECTED' || node.status === 'ALERT';
            // Short label: last 4 chars of device ID, or "Unbound"
            const label = node.assignedDeviceId
              ? node.assignedDeviceId.slice(-5)
              : node.status === 'DISCONNECTED' ? 'Offline' : 'Unbound';

            // Real-time data from monitoring state
            const roomData = node.logicalRoomId ? monitoringState[node.logicalRoomId] : null;
            const deviceData = roomData?.backendData;

            return (
              <Group key={node.id}>
                {/* Movement Path */}
                {deviceData?.processed?.movementPath?.length > 1 && (
                  <Line
                    points={deviceData.processed.movementPath.flatMap(p => [
                      node.x + p.x * 100,
                      node.y + p.y * 100
                    ])}
                    stroke={color}
                    strokeWidth={2}
                    opacity={0.4}
                    tension={0.5}
                  />
                )}

                {/* Filtered Targets */}
                {deviceData?.processed?.filteredTargets?.map((t, i) => (
                  <Circle
                    key={`target-${node.id}-${i}`}
                    x={node.x + t.x * 100}
                    y={node.y + t.y * 100}
                    radius={4}
                    fill={color}
                    opacity={0.8}
                    shadowBlur={5}
                    shadowColor={color}
                  />
                ))}

                <Group
                  x={node.x} y={node.y}
                  draggable={designerState === 'EDIT' && !lockedIds.includes(node.id)}
                  onClick={e => { e.cancelBubble = true; if (designerState === 'EDIT') selectItem(node.id, e.evt.shiftKey); }}
                  onTap={e    => { e.cancelBubble = true; if (designerState === 'EDIT') selectItem(node.id, e.evt.shiftKey); }}
                  onDragEnd={e => updateSensor(node.id, { x: e.target.x(), y: e.target.y() })}
                >
                  {/* Selection ring */}
                  {isSelected && designerState === 'EDIT' && (
                    <Circle radius={20} stroke={lockedIds.includes(node.id) ? '#94a3b8' : '#4F84FF'} strokeWidth={2} dash={[4, 4]} />
                  )}
                  {/* Outer glow ring for active nodes */}
                  {isGlowing && (
                    <Circle radius={16} fill={`${color}22`} />
                  )}
                  {/* Main circle */}
                  <Circle
                    radius={12}
                    fill={color}
                    shadowColor={color}
                    shadowBlur={isGlowing ? 12 : 4}
                    shadowOpacity={isGlowing ? 0.6 : 0.2}
                  />
                  {/* Inner dot — shows DISCONNECTED as outline-only */}
                  {node.status === 'DISCONNECTED' && (
                    <Circle radius={5} stroke={color} strokeWidth={1.5} />
                  )}
                  {/* Label below node */}
                  <Text
                    text={label}
                    y={16} x={-28} width={56}
                    align="center"
                    fill={node.status === 'UNBOUND' ? '#94A3B8' : (theme === 'dark' ? '#F8FAFC' : '#1E293B')}
                    fontSize={10}
                    fontFamily="monospace"
                  />
                </Group>
              </Group>
            );
          })}

          {/* ── Gateway node ── */}
          {gatewayNode && (
            <Group
              x={gatewayNode.x} y={gatewayNode.y}
              draggable={designerState === 'EDIT' && !lockedIds.includes('gateway-node-1')}
              onClick={e => { e.cancelBubble = true; if (designerState === 'EDIT') selectItem('gateway-node-1', e.evt.shiftKey); }}
              onTap={e    => { e.cancelBubble = true; if (designerState === 'EDIT') selectItem('gateway-node-1', e.evt.shiftKey); }}
              onDragEnd={e => updateGatewayNode({ x: e.target.x(), y: e.target.y() })}
            >
              {selectedIds.includes('gateway-node-1') && (
                <Circle radius={30} stroke={lockedIds.includes('gateway-node-1') ? '#94a3b8' : '#4F84FF'} strokeWidth={2} dash={[4, 4]} />
              )}
              <Circle radius={24} fill="#DCFCE7" stroke={gatewayColor} strokeWidth={2.5} shadowColor="rgba(0,0,0,0.08)" shadowBlur={8} />
              <Circle radius={6} fill={gatewayColor} />
              <Text text={globalGatewayId || 'GATEWAY'} y={30} x={-40} width={80} align="center" fill={theme === 'dark' ? '#F8FAFC' : '#1E293B'} fontSize={11} fontFamily="system-ui" />
            </Group>
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;
