import React, { useRef, useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

const Squares = ({
  direction = 'right',
  speed = 1,
  borderColor = '#e2e8f0', // Slate-200
  squareSize = 40,
  hoverFillColor = '#fed7aa', // Orange-200
}) => {
  const containerRef = useRef(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const [hoveredSquare, setHoveredSquare] = useState(null);
  const controls = useAnimation();

  useEffect(() => {
    const updateGridSize = () => {
      if (containerRef.current) {
        setGridSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateGridSize();
    window.addEventListener('resize', updateGridSize);

    return () => window.removeEventListener('resize', updateGridSize);
  }, []);

  useEffect(() => {
    const animate = async () => {
      if (direction === 'diagonal') {
        await controls.start({
          x: [0, -squareSize],
          y: [0, -squareSize],
          transition: {
            duration: 1 / speed,
            ease: 'linear',
            repeat: Infinity,
          },
        });
      } else {
        // ... (other directions omitted for brevity based on your usage)
        await controls.start({
            x: direction === 'right' ? [0, -squareSize] : direction === 'left' ? [0, squareSize] : 0,
            y: direction === 'down' ? [0, -squareSize] : direction === 'up' ? [0, squareSize] : 0,
            transition: {
              duration: 1 / speed,
              ease: 'linear',
              repeat: Infinity,
            },
          });
      }
    };
    if (gridSize.width > 0 && gridSize.height > 0) {
      animate();
    }
  }, [gridSize, direction, speed, squareSize, controls]);

  const numCols = Math.ceil(gridSize.width / squareSize) + 2;
  const numRows = Math.ceil(gridSize.height / squareSize) + 2;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden absolute inset-0">
      <motion.div animate={controls} className="absolute top-[-squareSize] left-[-squareSize]">
        {Array.from({ length: numRows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex">
            {Array.from({ length: numCols }).map((_, colIndex) => {
              const squareId = `${rowIndex}-${colIndex}`;
              return (
                <div
                  key={squareId}
                  style={{
                    width: squareSize,
                    height: squareSize,
                    borderColor: borderColor,
                    borderWidth: '1px',
                    backgroundColor: hoveredSquare === squareId ? hoverFillColor : 'transparent',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={() => setHoveredSquare(squareId)}
                  onMouseLeave={() => setHoveredSquare(null)}
                  className="border-collapse box-border"
                />
              );
            })}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default Squares;