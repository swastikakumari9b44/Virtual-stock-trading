import { SPEEDS, useMarket } from "../context/MarketContext";
import { fmtDateTime, fmtShortDate } from "../lib/format";
import { PauseIcon, PlayIcon, StepBackIcon, StepForwardIcon } from "./icons";

const iconBtn =
  "grid h-8 w-8 place-items-center rounded-md text-white/90 transition-colors hover:bg-white/15 disabled:opacity-35 disabled:hover:bg-transparent focus-visible:outline-sim";

export function MarketBar() {
  const m = useMarket();
  const atEnd = m.index >= m.lastIndex;

  const togglePlay = () => {
    if (m.playing) return m.setPlaying(false);
    if (atEnd) m.seek(0);
    m.setPlaying(true);
  };

  return (
    <header className="sticky top-0 z-30 bg-tape text-white">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 lg:px-6">
        <div className="flex items-center gap-3">
          <span className="rounded bg-sim px-2 py-0.5 text-[11px] font-bold tracking-wide text-tape">
            SIMULATED MARKET
          </span>
          <p className="text-sm">
            <span className="text-white/65">Market Time: </span>
            <span className="num font-semibold">{fmtDateTime(m.marketTs)}</span>
          </p>
        </div>

        <div className="order-3 flex min-w-[220px] flex-1 items-center gap-2 sm:order-none">
          <div className="flex flex-1 gap-1" role="group" aria-label="Trading sessions">
            {m.days.map((d, di) => {
              const cur = m.dayNumber - 1;
              const fill = di < cur ? 100 : di === cur ? ((m.index - d.firstIndex + 1) / d.count) * 100 : 0;
              return (
                <button
                  key={d.date}
                  onClick={() => m.seek(d.firstIndex)}
                  className="group flex-1 py-2"
                  title={`Jump to ${fmtShortDate(d.date)}`}
                  aria-label={`Jump to ${fmtShortDate(d.date)}${di === cur ? " (current session)" : ""}`}
                  aria-current={di === cur ? "true" : undefined}
                >
                  <span className="block h-1.5 overflow-hidden rounded-full bg-white/20 group-hover:bg-white/30">
                    <span
                      className={`block h-full rounded-full ${di === cur ? "bg-sim" : "bg-white/70"}`}
                      style={{ width: `${fill}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
          <span className="num hidden shrink-0 text-xs text-white/65 md:inline">
            Session {m.dayNumber} of {m.days.length}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button className={iconBtn} onClick={() => m.step(-1)} disabled={m.index === 0} aria-label="Previous 30 minutes">
            <StepBackIcon width={16} height={16} />
          </button>
          <button
            className={`${iconBtn} bg-white/15`}
            onClick={togglePlay}
            aria-label={m.playing ? "Pause simulation" : atEnd ? "Replay simulation" : "Play simulation"}
            title={m.playing ? "Pause" : atEnd ? "Replay from the start" : "Play"}
          >
            {m.playing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
          </button>
          <button className={iconBtn} onClick={() => m.step(1)} disabled={atEnd} aria-label="Next 30 minutes">
            <StepForwardIcon width={16} height={16} />
          </button>
          <button
            className="num ml-1 rounded-md px-2 py-1 text-xs font-semibold text-white/90 hover:bg-white/15"
            onClick={() => m.setSpeedIdx((m.speedIdx + 1) % SPEEDS.length)}
            aria-label={`Playback speed ${SPEEDS[m.speedIdx].label}. Change speed`}
          >
            {SPEEDS[m.speedIdx].label}
          </button>
        </div>
      </div>
    </header>
  );
}
