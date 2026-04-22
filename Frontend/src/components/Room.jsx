import React, { useRef, useEffect } from 'react';
import { Group, Rect, Transformer } from 'react-konva';
import useStore from '../store/useStore';

const Room = ({ shapeProps, isSelected, onSelect, onChange, isGrouped, isLocked, theme }) => {
  const shapeRef = useRef();
  const trRef = useRef();
  const rooms = useStore((state) => state.rooms);

  useEffect(() => {
    if (isSelected && trRef.current && !isGrouped && !isLocked) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, isGrouped, isLocked]);

  const centerX = shapeProps.x + shapeProps.width / 2;
  const centerY = shapeProps.y + shapeProps.height / 2;

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
        ref={shapeRef}
        x={centerX}
        y={centerY}
        width={shapeProps.width}
        height={shapeProps.height}
        offsetX={shapeProps.width / 2}
        offsetY={shapeProps.height / 2}
        rotation={shapeProps.rotation || 0}
        draggable={!isGrouped && !isLocked}
        onDragMove={(e) => {
          const node = e.target;
          let snapTopLeftX = node.x() - shapeProps.width / 2;
          let snapTopLeftY = node.y() - shapeProps.height / 2;

          const currentWidth = shapeProps.width;
          const currentHeight = shapeProps.height;
          const SNAP_THRESHOLD = 15;

          rooms.forEach((other) => {
            if (other.id === shapeProps.id) return;

            const otherLeft = other.x;
            const otherRight = other.x + other.width;
            const otherTop = other.y;
            const otherBottom = other.y + other.height;

            const myLeft = snapTopLeftX;
            const myRight = snapTopLeftX + currentWidth;
            const myTop = snapTopLeftY;
            const myBottom = snapTopLeftY + currentHeight;

            // X-axis snapping
            if (Math.abs(myRight - otherLeft) < SNAP_THRESHOLD) snapTopLeftX = otherLeft - currentWidth;
            else if (Math.abs(myLeft - otherRight) < SNAP_THRESHOLD) snapTopLeftX = otherRight;
            else if (Math.abs(myLeft - otherLeft) < SNAP_THRESHOLD) snapTopLeftX = otherLeft;
            else if (Math.abs(myRight - otherRight) < SNAP_THRESHOLD) snapTopLeftX = otherRight - currentWidth;

            // Y-axis snapping
            if (Math.abs(myBottom - otherTop) < SNAP_THRESHOLD) snapTopLeftY = otherTop - currentHeight;
            else if (Math.abs(myTop - otherBottom) < SNAP_THRESHOLD) snapTopLeftY = otherBottom;
            else if (Math.abs(myTop - otherTop) < SNAP_THRESHOLD) snapTopLeftY = otherTop;
            else if (Math.abs(myBottom - otherBottom) < SNAP_THRESHOLD) snapTopLeftY = otherBottom - currentHeight;
          });

          node.x(snapTopLeftX + shapeProps.width / 2);
          node.y(snapTopLeftY + shapeProps.height / 2);
        }}
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x() - shapeProps.width / 2,
            y: e.target.y() - shapeProps.height / 2,
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          onChange({
            ...shapeProps,
            x: node.x() - (shapeProps.width * scaleX) / 2,
            y: node.y() - (shapeProps.height * scaleY) / 2,
            width: Math.max(5, shapeProps.width * scaleX),
            height: Math.max(5, shapeProps.height * scaleY),
            rotation: node.rotation(),
          });
        }}
      >
        {/* Fake STROKE Layer: Fattened rectangles painted solid border colors */}
        {/* Only draw if active or always? If always, then we see merged outlines. */}
        <Group>
          {/* Base Rect Fat Layer */}
          {(isSelected || shapeProps.subRects?.length > 0) && (
            <>
              <Rect
                x={0 - (isSelected ? 2 : 1)}
                y={0 - (isSelected ? 2 : 1)}
                width={shapeProps.width + (isSelected ? 4 : 2)}
                height={shapeProps.height + (isSelected ? 4 : 2)}
                fill={isSelected ? '#4F46E5' : (theme === 'dark' ? '#334155' : '#E5E7EB')}
                cornerRadius={10}
              />
              {shapeProps.subRects && shapeProps.subRects.map((subr) => (
                <Rect
                  key={`stroke-${subr.id}`}
                  x={subr.x - (isSelected ? 2 : 1)}
                  y={subr.y - (isSelected ? 2 : 1)}
                  width={subr.width + (isSelected ? 4 : 2)}
                  height={subr.height + (isSelected ? 4 : 2)}
                  rotation={subr.rotation || 0}
                  fill={isSelected ? '#4F46E5' : (theme === 'dark' ? '#334155' : '#E5E7EB')}
                  cornerRadius={10}
                />
              ))}
            </>
          )}

          {/* INNER FILL Layer: Actual size rectangles painted opaque floor color */}
          <Rect
            x={0}
            y={0}
            width={shapeProps.width}
            height={shapeProps.height}
            fill={theme === 'dark' 
                ? (isGrouped ? 'rgba(30, 41, 59, 0.9)' : '#1E293B') 
                : (isGrouped ? 'rgba(255, 255, 255, 0.9)' : '#FFFFFF')}
            shadowColor="#000"
            shadowBlur={theme === 'dark' ? 12 : 8}
            shadowOpacity={theme === 'dark' ? 0.3 : 0.08}
            shadowOffsetY={theme === 'dark' ? 4 : 2}
            cornerRadius={8}
            strokeEnabled={false} 
          />
          {shapeProps.subRects && shapeProps.subRects.map((subr) => (
            <Rect
              key={`fill-${subr.id}`}
              x={subr.x}
              y={subr.y}
              width={subr.width}
              height={subr.height}
              rotation={subr.rotation || 0}
              fill={theme === 'dark' 
                  ? (isGrouped ? 'rgba(30, 41, 59, 0.9)' : '#1E293B') 
                  : (isGrouped ? 'rgba(255, 255, 255, 0.9)' : '#FFFFFF')}
              shadowColor="#000"
              shadowBlur={theme === 'dark' ? 12 : 8}
              shadowOpacity={theme === 'dark' ? 0.3 : 0.08}
              shadowOffsetY={theme === 'dark' ? 4 : 2}
              cornerRadius={8}
              strokeEnabled={false} 
            />
          ))}
        </Group>
      </Group>
      {isSelected && !isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
          anchorStroke="#4F46E5"
          anchorFill="#fff"
          anchorSize={8}
          borderStroke="#4F46E5"
          borderDash={[3, 3]}
        />
      )}
    </React.Fragment>
  );
};

export default Room;
