interface SignalMeterProps {
  signal?: 'strong' | 'weak' | 'none';
}

const BAR_HEIGHTS = [4, 6, 8, 10, 12];

/**
 * Compact 5-bar signal strength meter for the LCD corner.
 * weak pulses the two lit bars to suggest an intermittent stream.
 */
export function SignalMeter({ signal = 'none' }: SignalMeterProps) {
  const filled = signal === 'strong' ? 5 : signal === 'weak' ? 2 : 0;
  return (
    <div
      role="img"
      aria-label={`Signal ${signal}`}
      title={`Signal ${signal}`}
      className="flex items-end gap-[3px]"
    >
      {BAR_HEIGHTS.map((height, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ height }}
          className={`w-1 shrink-0 rounded-sm ${
            i < filled ? `bg-signal${signal === 'weak' ? ' animate-pulse' : ''}` : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  );
}
