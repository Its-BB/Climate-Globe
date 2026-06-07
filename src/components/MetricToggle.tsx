import { METRICS, type Metric } from "../lib/colors";

interface Props {
  metric: Metric;
  onChange: (m: Metric) => void;
}

export default function MetricToggle({ metric, onChange }: Props) {
  return (
    <div className="metric-toggle panel">
      {METRICS.map((m) => (
        <button
          key={m.id}
          className={m.id === metric ? "active" : ""}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
