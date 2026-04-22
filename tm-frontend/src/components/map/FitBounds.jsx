import { useEffect } from "react";
import { useMap } from "react-leaflet";

export function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) map.fitBounds(positions, { padding: [40, 40] });
  }, [positions, map]);
  return null;
}

export function FitHighlight({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions?.length > 0)
      map.fitBounds(positions, { padding: [80, 80], maxZoom: 16 });
  }, [positions, map]);
  return null;
}
