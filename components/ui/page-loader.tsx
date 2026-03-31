"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Ticker } from "@/components/ui/ticker";

const TICKER_TEXT = "/ 01000010 01001100 01000001 01000011 01001011 01010011 01001101 01001001 01010100 01001000";
const MATRIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export const PageLoader = () => {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [displayText, setDisplayText] = useState("LOADING");
  const mountedRef = useRef(true);

  const scramble = useCallback(async () => {
    const label = "LOADING";
    const randomChar = () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

    // Initial scramble phase
    const end = Date.now() + 400;
    while (Date.now() < end) {
      if (!mountedRef.current) return;
      setDisplayText(label.split("").map(() => randomChar()).join(""));
      await sleep(30);
    }

    // Left-to-right settling
    let current = label.split("").map(() => randomChar());
    for (let pos = 0; pos < label.length; pos++) {
      if (!mountedRef.current) return;
      for (let i = 0; i < 3; i++) {
        const next = [...current];
        for (let j = pos; j < label.length; j++) next[j] = randomChar();
        if (i === 2) next[pos] = label[pos];
        current = next;
        setDisplayText(current.join(""));
        await sleep(30);
      }
      await sleep(40);
    }

    setDisplayText(label);
  }, []);

  useEffect(() => {
    const run = async () => {
      await scramble();
      await sleep(400);
      if (!mountedRef.current) return;
      setFadeOut(true);
      await sleep(500);
      if (mountedRef.current) setVisible(false);
    };

    run();
    return () => { mountedRef.current = false; };
  }, [scramble]);

  if (!visible) return null;

  return (
    <div
      className="dotted fixed inset-0 z-[999] bg-black flex flex-col justify-between"
      style={{ opacity: fadeOut ? 0 : 1, transition: "opacity 500ms ease-out", pointerEvents: fadeOut ? "none" : "auto" }}
    >
      <Ticker text={TICKER_TEXT} speed={18} reverse={true} className="border-t-0" />

      <p className="text-white font-mono tracking-normal text-center text-4xl md:text-6xl">
        {displayText}
      </p>

      <Ticker text={TICKER_TEXT} speed={18} className="border-b-0" />
    </div>
  );
};
