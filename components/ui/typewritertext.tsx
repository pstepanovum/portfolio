'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  className?: string;
  typingSpeed?: number;
  scrambleSpeed?: number;
  scrambleLength?: number;
  holdDuration?: number;
  children?: React.ReactNode;
}

export const TypewriterText = ({
  text,
  className = "",
  typingSpeed = 50,
  scrambleSpeed = 30,
  scrambleLength = 2,
  holdDuration = 10000,
  children
}: TypewriterTextProps) => {
  const [displayText, setDisplayText] = useState('');
  const isAnimating = useRef(false);
  const mountedRef = useRef(true);
  
  const scrambleChars = '!<>-_\\/[]{}—=+*^?#_';
  
  const getRandomChar = () => scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
  
  const scrambleText = useCallback((length: number) => {
    return Array(length).fill(0).map(() => getRandomChar()).join('');
  }, []);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const typeForward = useCallback(async () => {
    if (!mountedRef.current) return;
    
    for (let i = 0; i <= text.length; i++) {
      if (!mountedRef.current) return;
      await sleep(typingSpeed);
      
      const currentText = text.slice(0, i);
      const remainingLength = Math.min(scrambleLength, text.length - i);
      const scrambled = scrambleText(remainingLength);
      
      setDisplayText(currentText + scrambled);
      
      if (i < text.length) {
        for (let j = 0; j < 3; j++) {
          if (!mountedRef.current) return;
          await sleep(scrambleSpeed);
          setDisplayText(currentText + scrambleText(remainingLength));
        }
      }
    }
    
    setDisplayText(text);
  }, [text, typingSpeed, scrambleSpeed, scrambleLength, scrambleText]);

  const typeReverse = useCallback(async () => {
    if (!mountedRef.current) return;
    
    for (let i = text.length; i >= 0; i--) {
      if (!mountedRef.current) return;
      await sleep(typingSpeed);
      
      const currentText = text.slice(0, i);
      const remainingLength = Math.min(scrambleLength, i);
      const scrambled = scrambleText(remainingLength);
      
      setDisplayText(currentText + scrambled);
      
      if (i > 0) {
        for (let j = 0; j < 3; j++) {
          if (!mountedRef.current) return;
          await sleep(scrambleSpeed);
          setDisplayText(currentText + scrambleText(remainingLength));
        }
      }
    }
    
    setDisplayText('');
  }, [text, typingSpeed, scrambleSpeed, scrambleLength, scrambleText]);

  const animationCycle = useCallback(async () => {
    if (isAnimating.current || !mountedRef.current) return;
    isAnimating.current = true;

    while (mountedRef.current) {
      await typeForward();
      if (!mountedRef.current) break;
      
      await sleep(holdDuration);
      if (!mountedRef.current) break;
      
      await typeReverse();
      if (!mountedRef.current) break;
      
      await sleep(1000);
    }

    isAnimating.current = false;
  }, [typeForward, typeReverse, holdDuration]);

  useEffect(() => {
    mountedRef.current = true;
    animationCycle();

    return () => {
      mountedRef.current = false;
    };
  }, [animationCycle]);

  return (
    <div 
      className={`inline-flex items-center ${className}`}
      onMouseEnter={() => {
        if (!isAnimating.current) {
          animationCycle();
        }
      }}
    >
      {children}
      <span className="font-mono">
        {displayText}
      </span>
    </div>
  );
};