import React, { useRef, useEffect } from 'react';
import { Rect, Text, Group, Transformer } from 'react-konva';

const Furniture = ({ shapeProps, isSelected, onSelect, onChange, isGrouped, isLocked, theme }) => {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && !isGrouped && !isLocked) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, isGrouped, isLocked]);

  const centerX = shapeProps.x + (shapeProps.width || 100) / 2;
  const centerY = shapeProps.y + (shapeProps.height || 100) / 2;

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
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x() - (shapeProps.width || 100) / 2,
            y: e.target.y() - (shapeProps.height || 100) / 2,
          });
        }}
        x={centerX}
        y={centerY}
        width={shapeProps.width || 100}
        height={shapeProps.height || 100}
        offsetX={(shapeProps.width || 100) / 2}
        offsetY={(shapeProps.height || 100) / 2}
        ref={shapeRef}
        rotation={shapeProps.rotation || 0}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          const newWidth = Math.max(5, (shapeProps.width || 100) * scaleX);
          const newHeight = Math.max(5, (shapeProps.height || 100) * scaleY);

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
          width={shapeProps.width || 100}
          height={shapeProps.height || 100}
          stroke={isSelected ? '#D97706' : (theme === 'dark' ? '#B45309' : '#FBBF24')}
          strokeWidth={2}
          fill={theme === 'dark' ? "rgba(180, 83, 9, 0.2)" : "rgba(254, 243, 199, 0.7)"}
          cornerRadius={4}
        />
        <Text
          text={shapeProps.furnitureType || 'Furniture'}
          x={0}
          y={0}
          width={shapeProps.width || 100}
          height={shapeProps.height || 100}
          align="center"
          verticalAlign="middle"
          fill={theme === 'dark' ? "#FDE68A" : "#92400E"}
          fontSize={12}
          fontFamily="system-ui, sans-serif"
        />
      </Group>
      {isSelected && !isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
          anchorStroke="#D97706"
          anchorFill={theme === 'dark' ? '#1E293B' : '#fff'}
          anchorSize={8}
          borderStroke="#D97706"
          borderDash={[3, 3]}
        />
      )}
    </React.Fragment>
  );
};

export default Furniture;
