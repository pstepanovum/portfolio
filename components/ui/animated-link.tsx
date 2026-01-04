"use client";

import React, { useState, useCallback, useRef } from "react";

// --- CUSTOM SVG ICON ---
// Replace the d="" path with your own SVG data

const ArrowUpRightIcon = ({
  className,
  ...props
}: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M25.0001 8V21C25.0001 21.2652 24.8947 21.5196 24.7072 21.7071C24.5196 21.8946 24.2653 22 24.0001 22C23.7349 22 23.4805 21.8946 23.293 21.7071C23.1054 21.5196 23.0001 21.2652 23.0001 21V10.4137L8.70757 24.7075C8.51993 24.8951 8.26543 25.0006 8.00007 25.0006C7.7347 25.0006 7.48021 24.8951 7.29257 24.7075C7.10493 24.5199 6.99951 24.2654 6.99951 24C6.99951 23.7346 7.10493 23.4801 7.29257 23.2925L21.5863 9H11.0001C10.7349 9 10.4805 8.89464 10.293 8.70711C10.1054 8.51957 10.0001 8.26522 10.0001 8C10.0001 7.73478 10.1054 7.48043 10.293 7.29289C10.4805 7.10536 10.7349 7 11.0001 7H24.0001C24.2653 7 24.5196 7.10536 24.7072 7.29289C24.8947 7.48043 25.0001 7.73478 25.0001 8Z"
      fill="currentColor"
    />
  </svg>
);

// -----------------------

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
  rel,
}: AnimatedExternalLinkProps) => {
  const [displayText, setDisplayText] = useState("");
  const animatingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastInteractionTime = useRef(0);
  const textContent = typeof children === "string" ? children : "";

  // Only letters for social links
  const matrixChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const getRandomChar = (char: string) => {
    if (char === " " || char === "-" || char === "_") return char;
    return matrixChars[Math.floor(Math.random() * matrixChars.length)];
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

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
      const scrambledText = finalText
        .split("")
        .map((char) => getRandomChar(char))
        .join("");
      setDisplayText(scrambledText);
      await sleep(30);
    }

    // Settling phase
    let currentText = finalText.split("").map((char) => getRandomChar(char));

    for (let pos = 0; pos < finalText.length; pos++) {
      if (!mountedRef.current) break;

      for (let i = 0; i < 3; i++) {
        const newText = [...currentText];

        for (let j = pos; j < finalText.length; j++) {
          if (finalText[j] !== " ") {
            newText[j] = getRandomChar(finalText[j]);
          }
        }

        if (i === 2) {
          newText[pos] = finalText[pos];
        }

        currentText = newText;
        setDisplayText(currentText.join(""));
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
      {typeof children === "string" ? (
        <>
          <span className="invisible font-mono" aria-hidden="true">
            {children}
          </span>
          <span className="absolute left-0 flex items-center font-mono">
            {displayText}
          </span>
          <ArrowUpRightIcon className="w-5 h-5" />
        </>
      ) : (
        children
      )}
    </a>
  );
};
