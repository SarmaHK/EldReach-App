import React, { useRef, useEffect } from 'react';
import { Rect, Text, Group, Transformer } from 'react-konva';
import useStore from '../store/useStore';

const Doorway = ({ shapeProps, isSelected, onSelect, onChange, isGrouped, isLocked, theme }) => {
  const shapeRef = useRef();
  const trRef = useRef();
  const rooms = useStore((state) => state.rooms);

  useEffect(() => {
    if (isSelected && trRef.current && !isGrouped && !isLocked) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, isGrouped, isLocked]);

  const centerX = shapeProps.x + (shapeProps.width || 60) / 2;
  const centerY = shapeProps.y + (shapeProps.height || 20) / 2;

  return (
    <React.Fragment>
      <Group
        onClick={(e) => {
          e.cancelBubble = true;
          if (!isGrouped) onSelect(e.evt.shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          if (!isGrouped) onSelect(e.evt.shiftKey);
        }}
        draggable={!isGrouped && !isLocked}
        onDragMove={(e) => {
          const node = e.target;
          let snapX = node.x();
          let snapY = node.y();

          const SNAP_THRESHOLD = 15;
          const myWidth = shapeProps.width || 60;
          const myHeight = shapeProps.height || 20;

          // Note: node.x() and node.y() are the center of the doorway group!
          let myLeft = snapX - myWidth / 2;
          let myRight = snapX + myWidth / 2;
          let myTop = snapY - myHeight / 2;
          let myBottom = snapY + myHeight / 2;

          const checkSnap = (otherLeft, otherTop, otherWidth, otherHeight) => {
            const otherRight = otherLeft + otherWidth;
            const otherBottom = otherTop + otherHeight;

            // X-axis snapping
            if (Math.abs(myRight - otherLeft) < SNAP_THRESHOLD) snapX = otherLeft - myWidth / 2;
            else if (Math.abs(myLeft - otherRight) < SNAP_THRESHOLD) snapX = otherRight + myWidth / 2;
            else if (Math.abs(myLeft - otherLeft) < SNAP_THRESHOLD) snapX = otherLeft + myWidth / 2;
            else if (Math.abs(myRight - otherRight) < SNAP_THRESHOLD) snapX = otherRight - myWidth / 2;

            // Update myLeft/Right based on new snapX
            myLeft = snapX - myWidth / 2;
            myRight = snapX + myWidth / 2;

            // Y-axis snapping
            if (Math.abs(myBottom - otherTop) < SNAP_THRESHOLD) snapY = otherTop - myHeight / 2;
            else if (Math.abs(myTop - otherBottom) < SNAP_THRESHOLD) snapY = otherBottom + myHeight / 2;
            else if (Math.abs(myTop - otherTop) < SNAP_THRESHOLD) snapY = otherTop + myHeight / 2;
            else if (Math.abs(myBottom - otherBottom) < SNAP_THRESHOLD) snapY = otherBottom - myHeight / 2;
            
            myTop = snapY - myHeight / 2;
            myBottom = snapY + myHeight / 2;
          };

          rooms.forEach((room) => {
            checkSnap(room.x, room.y, room.width, room.height);
            if (room.subRects) {
              room.subRects.forEach(sub => {
                checkSnap(room.x + sub.x, room.y + sub.y, sub.width, sub.height);
              });
            }
          });

          node.x(snapX);
          node.y(snapY);
        }}
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x() - (shapeProps.width || 60) / 2,
            y: e.target.y() - (shapeProps.height || 20) / 2,
          });
        }}
        x={centerX}
        y={centerY}
        width={shapeProps.width || 60}
        height={shapeProps.height || 20}
        offsetX={(shapeProps.width || 60) / 2}
        offsetY={(shapeProps.height || 20) / 2}
        ref={shapeRef}
        rotation={shapeProps.rotation || 0}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          const newWidth = Math.max(5, (shapeProps.width || 60) * scaleX);
          const newHeight = Math.max(5, (shapeProps.height || 20) * scaleY);

          onChange({
            ...shapeProps,
            x: node.x() - newWidth / 2,
            y: node.y() - newHeight / 2,
            width: newWidth,
            height: newHeight,
            rotation: node.rotation()
          });
        }}
      >
        <Rect
          x={0}
          y={0}
          width={shapeProps.width || 60}
          height={shapeProps.height || 20}
          stroke={isSelected ? '#0D9488' : (theme === 'dark' ? '#0F766E' : '#5EEAD4')}
          strokeWidth={2}
          fill={theme === 'dark' ? "rgba(15, 118, 110, 0.2)" : "rgba(204, 251, 241, 0.6)"}
        />
        <Text
          text="Door"
          x={0}
          y={0}
          width={shapeProps.width || 60}
          height={shapeProps.height || 20}
          align="center"
          verticalAlign="middle"
          fill={theme === 'dark' ? "#99F6E4" : "#0F766E"}
          fontSize={10}
          fontFamily="system-ui, sans-serif"
        />
      </Group>
      {isSelected && !isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          anchorStroke="#0D9488"
          anchorFill={theme === 'dark' ? '#1E293B' : '#fff'}
          anchorSize={8}
          borderStroke="#0D9488"
          borderDash={[3, 3]}
        />
      )}
    </React.Fragment>
  );
};

export default Doorway;
