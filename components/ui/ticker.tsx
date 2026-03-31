"use client";

interface TickerProps {
  text: string;
  speed?: number;
  copies?: number;
  reverse?: boolean;
  className?: string;
}

export const Ticker = ({
  text,
  speed = 30,
  copies = 8,
  reverse = false,
  className = "",
}: TickerProps) => {
  return (
    <div
      className={`relative z-10 w-full overflow-hidden bg-black border-t border-b border-white/10 py-2 ${className}`}
    >
      <div
        className="flex whitespace-nowrap"
        style={{ animation: `${reverse ? "marquee-reverse" : "marquee"} ${speed}s linear infinite` }}
      >
        {Array.from({ length: copies }).map((_, i) => (
          <span
            key={i}
            className="text-xs tracking-widest text-white/30 mx-8 font-mono"
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
};
