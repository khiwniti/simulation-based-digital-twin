import React, { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';

interface ConfettiProps {
  isActive?: boolean;
  duration?: number;
  onComplete?: () => void;
}

export function Confetti({ isActive = false, duration = 3000, onComplete }: ConfettiProps) {
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [showConfetti, setShowConfetti] = useState(isActive);

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setShowConfetti(isActive);
    
    if (isActive && duration > 0) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
        onComplete?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isActive, duration, onComplete]);

  if (!showConfetti) return null;

  return (
    <ReactConfetti
      width={windowDimensions.width}
      height={windowDimensions.height}
      recycle={false}
      numberOfPieces={200}
      gravity={0.3}
      colors={['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']}
    />
  );
}