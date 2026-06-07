import { codeToCondition, type Weather } from "../lib/weather";

interface Props {
  name: string;
  sub: string;
  weather: Weather | undefined;
  isCountry: boolean;
}

export default function InfoPanel({ name, sub, weather, isCountry }: Props) {
  const cond = weather ? codeToCondition(weather.code) : null;

  return (
    <div className="info-panel panel">
      <div className="info-head">
        <div className="info-name">{name}</div>
        <div className="info-sub">{sub}</div>
      </div>

      {weather && cond ? (
        <>
          <div className="info-temp-row">
            <span className="info-temp">{Math.round(weather.temperature)}°</span>
            <div className="info-cond">
              <div>{cond.label}</div>
              <div className="info-feels">
                Feels {Math.round(weather.apparent)}°C
              </div>
            </div>
          </div>

          <div className="info-grid">
            <Stat label="Humidity" value={`${Math.round(weather.humidity)}%`} />
            <Stat label="Wind" value={`${Math.round(weather.windSpeed)} km/h`} />
            <Stat
              label="Rain"
              value={`${weather.precipitation.toFixed(1)} mm`}
            />
          </div>
        </>
      ) : (
        <div className="info-empty">No live data for this region.</div>
      )}

      {isCountry && (
        <div className="info-hint">Click on the map to explore its states</div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-stat">
      <div className="info-stat-v">{value}</div>
      <div className="info-stat-l">{label}</div>
    </div>
  );
}
