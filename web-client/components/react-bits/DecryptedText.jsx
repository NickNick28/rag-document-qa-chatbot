import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// เพิ่มภาษาไทยเข้าไปใน default characters
const defaultCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789กขคงจฉชญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ';

const DecryptedText = ({
  text,
  speed = 50,
  maxIterations = 10,
  characters = defaultCharacters,
  className = '',
  parentClassName = '',
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isScrambling, setIsScrambling] = useState(true);

  useEffect(() => {
    let iterations = 0;
    const interval = setInterval(() => {
      let newText = '';
      let allRevealed = true;

      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          newText += ' ';
          continue;
        }

        if (iterations < maxIterations && Math.random() > iterations / maxIterations) {
          newText += characters[Math.floor(Math.random() * characters.length)];
          allRevealed = false;
        } else {
          newText += text[i];
        }
      }

      setDisplayText(newText);
      iterations++;

      if (allRevealed && iterations >= maxIterations) {
        clearInterval(interval);
        setIsScrambling(false);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, maxIterations, characters]);

  return (
    <span className={`inline-flex ${parentClassName}`}>
      <span className={className}>{displayText}</span>
    </span>
  );
};

export default DecryptedText;