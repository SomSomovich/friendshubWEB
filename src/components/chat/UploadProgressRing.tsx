/**
 * How far an upload has got, as a ring that fills clockwise from the top.
 *
 * A ring rather than a bar because it stands in the place the play button will
 * take, and the bubble keeps its shape while the file is on its way. The
 * fraction is not left to the eye alone: the element is a `progressbar` with its
 * value exposed, so the number is readable by anything that cannot see the arc.
 */

/** Room for the stroke to sit inside the box without clipping at the ends. */
const SIZE = 20
const STROKE = 2
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export type UploadProgressRingProps = {
  /** 0..1; values outside are clamped rather than drawn wrongly. */
  progress: number
  /** What is being uploaded, for anyone who cannot see it. */
  label: string
  className?: string
}

export function UploadProgressRing({ progress, label, className }: UploadProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <svg
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      // Turned so the arc starts at the top and grows clockwise, which is the
      // direction every other progress indicator in the world grows.
      className={`size-5 -rotate-90 ${className ?? ''}`}
    >
      {/* The track is recessive on purpose: what the eye should follow is the
          part that moves. */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE}
        className="stroke-current opacity-25"
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
        className="stroke-current transition-[stroke-dashoffset] duration-200 ease-out"
      />
    </svg>
  )
}
