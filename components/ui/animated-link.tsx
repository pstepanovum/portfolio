'use client'

import React, { useState, useCallback, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';

interface AnimatedExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  target?: string;
  rel?: string;
}

export const AnimatedExternalLink = ({
  href,
  children,
  className = "",
  onClick,
  target,
  rel
}: AnimatedExternalLinkProps) => {
  const [displayText, setDisplayText] = useState('');
  const animatingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastInteractionTime = useRef(0);
  const textContent = typeof children === 'string' ? children : '';

  // Only letters for social links
  const matrixChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const getRandomChar = (char: string) => {
    if (char === ' ' || char === '-' || char === '_') return char;
    return matrixChars[Math.floor(Math.random() * matrixChars.length)];
  };
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const animateText = useCallback(async () => {
    if (!textContent || animatingRef.current || !mountedRef.current) return;
    
    animatingRef.current = true;
    const finalText = textContent;
    const scrambleSpeed = 30;
    const initialScrambleTime = 300;
    const settleDelay = 40;
    
    // Initial scramble phase
    const startTime = Date.now();
    while (Date.now() - startTime < initialScrambleTime) {
      if (!mountedRef.current) break;
      const scrambledText = finalText.split('').map(char => getRandomChar(char)).join('');
      setDisplayText(scrambledText);
      await sleep(30);
    }

    // Settling phase
    let currentText = finalText.split('').map(char => getRandomChar(char));
    
    for (let pos = 0; pos < finalText.length; pos++) {
      if (!mountedRef.current) break;

      for (let i = 0; i < 3; i++) {
        const newText = [...currentText];
        
        for (let j = pos; j < finalText.length; j++) {
          if (finalText[j] !== ' ') {
            newText[j] = getRandomChar(finalText[j]);
          }
        }
        
        if (i === 2) {
          newText[pos] = finalText[pos];
        }
        
        currentText = newText;
        setDisplayText(currentText.join(''));
        await sleep(scrambleSpeed);
      }
      
      await sleep(settleDelay);
    }
    
    setDisplayText(finalText);
    animatingRef.current = false;
  }, [textContent]);

  React.useEffect(() => {
    mountedRef.current = true;
    setDisplayText(textContent);
    return () => {
      mountedRef.current = false;
    };
  }, [textContent]);

  const handleInteraction = useCallback(() => {
    const now = Date.now();
    if (now - lastInteractionTime.current > 500 && !animatingRef.current) {
      lastInteractionTime.current = now;
      animateText();
    }
  }, [animateText]);

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      onClick={() => {
        handleInteraction();
        onClick?.();
      }}
      onMouseEnter={handleInteraction}
      className={`${className} relative inline-flex items-center gap-2`}
    >
      {typeof children === 'string' ? (
        <>
          <span className="invisible font-mono" aria-hidden="true">
            {children}
          </span>
          <span className="absolute left-0 flex items-center font-mono">
            {displayText}
          </span>
          <ArrowUpRight className="w-4 h-4" />
        </>
      ) : (
        children
      )}
    </a>
  );
};