import React from 'react';

const ShinyText = ({ text, speed = 5, contrast = 1.2, className = '' }) => {
  const animationDuration = `${speed}s`;

  return (
    <div
      className={`text-transparent bg-clip-text inline-block ${className}`}
      style={{
        backgroundImage: `linear-gradient(120deg, rgba(255, 255, 255, ${contrast}) 30%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, ${contrast}) 70%)`,
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        animation: `shine ${animationDuration} infinite linear`,
      }}
    >
      {text}
    </div>
  );
};

// Add this to your global CSS or tailwind.config.js theme extend common
// @keyframes shine {
//   0% { background-position: 200% 0; }
//   100% { background-position: -200% 0; }
// }

export default ShinyText;