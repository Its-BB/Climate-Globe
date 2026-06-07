import { scaleSequential } from "d3-scale";
import {
  interpolateRdYlBu,
  interpolateBlues,
  interpolateGnBu,
} from "d3-scale-chromatic";
import type { ConditionGroup, Weather } from "./weather";
import { codeToCondition } from "./weather";

export type Metric = "temperature" | "precipitation" | "wind" | "condition";

export const METRICS: { id: Metric; label: string }[] = [
  { id: "temperature", label: "Temperature" },
  { id: "precipitation", label: "Precipitation" },
  { id: "wind", label: "Wind" },
  { id: "condition", label: "Condition" },
];

// RdYlBu runs red->blue, so the domain is inverted to map cold->blue.
const tempScale = scaleSequential(interpolateRdYlBu).domain([45, -20]);
const precipScale = scaleSequential(interpolateBlues).domain([-2, 20]);
const windScale = scaleSequential(interpolateGnBu).domain([0, 60]);

const CONDITION_COLORS: Record<ConditionGroup, string> = {
  clear: "#fdd663",
  cloudy: "#9aa5b1",
  fog: "#cfd8dc",
  drizzle: "#7eb6e0",
  rain: "#3b82f6",
  snow: "#e6f2ff",
  storm: "#8b5cf6",
};

const NO_DATA = "#3a3f4b";

export function colorFor(metric: Metric, weather: Weather | undefined): string {
  if (!weather) return NO_DATA;
  switch (metric) {
    case "temperature":
      return tempScale(weather.temperature);
    case "precipitation":
      return precipScale(weather.precipitation);
    case "wind":
      return windScale(weather.windSpeed);
    case "condition":
      return CONDITION_COLORS[codeToCondition(weather.code).group];
  }
}

export interface LegendStop {
  color: string;
  label: string;
}

export function legendStops(metric: Metric): {
  title: string;
  stops: LegendStop[];
} {
  switch (metric) {
    case "temperature":
      return {
        title: "Temperature (°C)",
        stops: [-20, -10, 0, 10, 20, 30, 45].map((t) => ({
          color: tempScale(t),
          label: `${t}`,
        })),
      };
    case "precipitation":
      return {
        title: "Precipitation (mm/h)",
        stops: [0, 2, 5, 10, 20].map((p) => ({
          color: precipScale(p),
          label: `${p}`,
        })),
      };
    case "wind":
      return {
        title: "Wind (km/h)",
        stops: [0, 15, 30, 45, 60].map((v) => ({
          color: windScale(v),
          label: `${v}`,
        })),
      };
    case "condition":
      return {
        title: "Condition",
        stops: (
          [
            ["clear", "Clear"],
            ["cloudy", "Cloudy"],
            ["rain", "Rain"],
            ["snow", "Snow"],
            ["storm", "Storm"],
            ["fog", "Fog"],
          ] as [ConditionGroup, string][]
        ).map(([g, label]) => ({ color: CONDITION_COLORS[g], label })),
      };
  }
}
