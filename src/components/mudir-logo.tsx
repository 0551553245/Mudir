import { cn } from "@/lib/utils";

/** Mudir vine mark — continuous monoline + lime tittle from design summary. */
export function MudirMark({
  className,
  size = 34,
  variant = "forest",
}: {
  className?: string;
  size?: number;
  variant?: "forest" | "lime" | "ink";
}) {
  const stroke =
    variant === "lime" ? "#E7FE25" : variant === "ink" ? "#161616" : "#013F32";
  const dot = variant === "forest" ? "#E7FE25" : variant === "lime" ? "#161616" : "#E7FE25";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d="M28 130 C14 130, 10 106, 24 94 C36 84, 50 90, 50 104 C50 114, 42 118, 37 112 C34 108, 37 102, 43 103 C51 105, 50 116, 50 104 C50 88, 64 82, 76 92 C88 102, 82 130, 68 130 C58 130, 55 121, 62 114 C78 98, 96 62, 122 24"
        stroke={stroke}
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="128" cy="14" r="13" fill={dot} />
    </svg>
  );
}

export function MudirWordmark({
  className,
  name = "Mudir",
  size = 34,
}: {
  className?: string;
  name?: string;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <MudirMark size={size} />
      <span
        className="font-[family-name:var(--font-baloo)] font-extrabold leading-none text-forest"
        style={{ fontSize: Math.round(size * 0.76) }}
      >
        {name}
      </span>
    </span>
  );
}
