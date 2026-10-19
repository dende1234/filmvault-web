import { cn } from "@/lib/utils";

/** Reel: a film reel with eyes, Filmory's help mascot. Pure SVG in the theme's
 * amber; `animated` adds the float and blink (motion-safe only). */
export function ReelMascot({ className, animated = false }: { className?: string; animated?: boolean }) {
  const holes = [-90, -18, 54, 126, 198].map((deg) => {
    const r = (deg * Math.PI) / 180;
    return { cx: 32 + 18 * Math.cos(r), cy: 32 + 18 * Math.sin(r) };
  });
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      className={cn(animated && "motion-safe:animate-[reel-float_4s_ease-in-out_infinite]", className)}
    >
      {/* film strip trailing off the reel */}
      <path d="M44 54 C52 60 58 58 62 50" fill="none" stroke="var(--foreground)" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="27" fill="var(--primary)" />
      <circle cx="32" cy="32" r="27" fill="none" stroke="var(--primary-foreground)" strokeOpacity="0.25" strokeWidth="2" />
      {holes.map((h, i) => (
        <circle key={i} cx={h.cx} cy={h.cy} r="4.2" fill="var(--background)" />
      ))}
      <g
        className={cn(animated && "motion-safe:animate-[reel-blink_5s_ease-in-out_infinite]")}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <circle cx="25.5" cy="31" r="3.6" fill="#fff" />
        <circle cx="38.5" cy="31" r="3.6" fill="#fff" />
        <circle cx="26.3" cy="31.6" r="1.8" fill="#1a1306" />
        <circle cx="39.3" cy="31.6" r="1.8" fill="#1a1306" />
      </g>
      <path d="M27.5 38.5 Q32 42.5 36.5 38.5" fill="none" stroke="#1a1306" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
