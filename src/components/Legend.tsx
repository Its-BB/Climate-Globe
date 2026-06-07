import { legendStops, type Metric } from "../lib/colors";

interface Props {
  metric: Metric;
}

export default function Legend({ metric }: Props) {
  const { title, stops } = legendStops(metric);

  if (metric === "condition") {
    return (
      <div className="legend panel">
        <h4>{title}</h4>
        {stops.map((s) => (
          <div className="legend-row" key={s.label}>
            <span className="legend-swatch" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="legend panel">
      <h4>{title}</h4>
      <div className="legend-bar">
        {stops.map((s, i) => (
          <div key={i} style={{ background: s.color }} />
        ))}
      </div>
      <div className="legend-scale-labels">
        <span>{stops[0].label}</span>
        <span>{stops[stops.length - 1].label}</span>
      </div>
    </div>
  );
}
