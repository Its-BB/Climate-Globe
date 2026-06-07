import { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import type { Feature } from "geojson";

export interface FocusTarget {
  lat: number;
  lng: number;
  altitude: number;
}

interface Props {
  polygons: Feature[];
  capColor: (f: Feature) => string;
  label: (f: Feature) => string;
  altitude: (f: Feature) => number;
  onPolygonClick: (f: Feature) => void;
  onPolygonHover: (f: Feature | null) => void;
  focus: FocusTarget | null;
  autoRotate: boolean;
}

const EARTH_TEXTURE = "https://unpkg.com/three-globe/example/img/earth-dark.jpg";

export default function GlobeView({
  polygons,
  capColor,
  label,
  altitude,
  onPolygonClick,
  onPolygonHover,
  focus,
  autoRotate,
}: Props) {
  const globeRef = useRef<any>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Initial camera + controls setup.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableDamping = true;
    controls.minDistance = 120;
  }, []);

  // Toggle auto-rotation when drilling in/out.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    g.controls().autoRotate = autoRotate;
  }, [autoRotate]);

  // Animate camera to a focus target.
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !focus) return;
    g.pointOfView(focus, 1000);
  }, [focus]);

  return (
    <Globe
      ref={globeRef}
      width={size.w}
      height={size.h}
      backgroundColor="#05060a"
      globeImageUrl={EARTH_TEXTURE}
      showAtmosphere
      atmosphereColor="#4f9cff"
      atmosphereAltitude={0.18}
      polygonsData={polygons}
      polygonCapColor={capColor as any}
      polygonSideColor={() => "rgba(0, 0, 0, 0.25)"}
      polygonStrokeColor={() => "rgba(255, 255, 255, 0.35)"}
      polygonAltitude={altitude as any}
      polygonLabel={label as any}
      polygonsTransitionDuration={300}
      onPolygonClick={onPolygonClick as any}
      onPolygonHover={onPolygonHover as any}
    />
  );
}
