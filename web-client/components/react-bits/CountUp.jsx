import React, { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

const CountUp = ({
  from = 0,
  to,
  duration = 2,
  onEnd,
  className = '',
  separator = '',
  direction = 'up',
}) => {
  const ref = useRef(null);
  const motionValue = useMotionValue(direction === 'down' ? to : from);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
    duration: duration * 1000,
  });
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [displayValue, setDisplayValue] = useState(from);

  useEffect(() => {
    if (isInView) {
      motionValue.set(direction === 'down' ? from : to);
    }
  }, [isInView, motionValue, to, from, direction]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      const roundedValue = Math.round(latest);
      const formattedValue = separator
        ? roundedValue.toLocaleString().replace(/,/g, separator)
        : roundedValue.toString();
      setDisplayValue(formattedValue);

      if (roundedValue === (direction === 'down' ? from : to) && onEnd) {
        onEnd();
      }
    });

    return () => unsubscribe();
  }, [springValue, separator, to, from, direction, onEnd]);

  return (
    <span ref={ref} className={className}>
      {displayValue}
    </span>
  );
};

export default CountUp;