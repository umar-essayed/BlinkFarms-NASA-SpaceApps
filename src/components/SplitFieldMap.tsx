'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { Language } from '@/lib/types';

interface SplitFieldMapProps {
  lat: number;
  lon: number;
  fieldName: string;
  lang: Language;
  onLocationChange: (lat: number, lon: number, locationName?: string) => void;
  canopyTempAnomaly?: number;
  isShockActive?: boolean;
  isSimulatingTelemetry?: boolean;
  polygonBoundary?: [number, number][];
  onCustomPolygonChange?: (coords: [number, number][], areaFeddan: number) => void;
}

export default function SplitFieldMap({
  lat,
  lon,
  fieldName,
  lang,
  onLocationChange,
  isShockActive = false,
  polygonBoundary,
  onCustomPolygonChange,
}: SplitFieldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isTracingMode, setIsTracingMode] = useState<boolean>(false);
  const [tracedPoints, setTracedPoints] = useState<[number, number][]>([]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let L: any;
    let isCancelled = false;

    import('leaflet').then((leafletModule) => {
      if (isCancelled || !mapContainerRef.current) return;
      L = leafletModule.default || leafletModule;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [lat, lon],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
        });

        // 1. Crystal-Clear Optical High-Res Satellite Imagery
        const baseLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
        ).addTo(map);
        map.baseTileLayer = baseLayer;

        // 2. Draw Field Parcel Core Polygons
        drawParcelPolygons(L, map, lat, lon);

        // 3. Center Draggable Pin with Apple Glow
        const customIcon = L.divIcon({
          className: 'apple-pulsing-marker',
          html: `<div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(0,113,227,0.35); animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="width:22px; height:22px; background:#0071E3; border:3px solid #ffffff; border-radius:50%; box-shadow:0 4px 14px rgba(0,0,0,0.5); z-index:2; display:flex; align-items:center; justify-content:center;">
              <div style="width:6px; height:6px; background:#ffffff; border-radius:50%;"></div>
            </div>
          </div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker([lat, lon], { icon: customIcon, draggable: true }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const nLat = Number(pos.lat.toFixed(4));
          const nLon = Number(pos.lng.toFixed(4));
          drawParcelPolygons(L, map, nLat, nLon);
          onLocationChange(nLat, nLon);
        });

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          const nLat = Number(e.latlng.lat.toFixed(4));
          const nLon = Number(e.latlng.lng.toFixed(4));
          drawParcelPolygons(L, map, nLat, nLon);
          onLocationChange(nLat, nLon);
        });

        mapInstanceRef.current = map;
      }
    });

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map coordinates when props change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      map.setView([lat, lon], map.getZoom(), { animate: true });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
      drawParcelPolygons(L.default || L, map, lat, lon);
    });
  }, [lat, lon, isShockActive, polygonBoundary]);

  // Draw Field Boundary
  const drawParcelPolygons = (L: any, map: any, cLat: number, cLon: number) => {
    if (map.rawPoly) map.removeLayer(map.rawPoly);
    if (map.bufferPoly) map.removeLayer(map.bufferPoly);

    if (polygonBoundary && polygonBoundary.length >= 3) {
      map.rawPoly = L.polygon(polygonBoundary, {
        color: '#0071E3',
        weight: 1.5,
        dashArray: '5, 5',
        fillOpacity: 0.05,
        fillColor: '#0071E3',
      }).addTo(map);

      map.bufferPoly = L.polygon(polygonBoundary, {
        color: isShockActive ? '#EF4444' : '#10B981',
        weight: 3.0,
        fillOpacity: isShockActive ? 0.35 : 0.22,
        fillColor: isShockActive ? '#EF4444' : '#10B981',
      }).addTo(map);

      try {
        map.fitBounds(map.bufferPoly.getBounds(), { padding: [35, 35], maxZoom: 16 });
      } catch {}
      return;
    }

    const deltaRaw = 0.0036;
    const deltaBuffer = 0.0026;

    const rawCoords = [
      [cLat - deltaRaw, cLon - deltaRaw],
      [cLat - deltaRaw, cLon + deltaRaw],
      [cLat + deltaRaw, cLon + deltaRaw],
      [cLat + deltaRaw, cLon - deltaRaw],
    ];

    const bufferCoords = [
      [cLat - deltaBuffer, cLon - deltaBuffer],
      [cLat - deltaBuffer, cLon + deltaBuffer],
      [cLat + deltaBuffer, cLon + deltaBuffer],
      [cLat + deltaBuffer, cLon - deltaBuffer],
    ];

    map.rawPoly = L.polygon(rawCoords, {
      color: '#0071E3',
      weight: 1.5,
      dashArray: '5, 5',
      fillOpacity: 0.05,
      fillColor: '#0071E3',
    }).addTo(map);

    map.bufferPoly = L.polygon(bufferCoords, {
      color: isShockActive ? '#EF4444' : '#10B981',
      weight: 2.5,
      fillOpacity: isShockActive ? 0.35 : 0.22,
      fillColor: isShockActive ? '#EF4444' : '#10B981',
    }).addTo(map);
  };

  // Zoom handlers
  const handleZoom = (delta: number) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + delta);
  };

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([lat, lon], 15, { animate: true });
  };

  const handleGps = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const uLat = Number(pos.coords.latitude.toFixed(4));
        const uLon = Number(pos.coords.longitude.toFixed(4));
        onLocationChange(uLat, uLon, lang === 'ar' ? 'موقعي (GPS)' : 'My GPS Location');
      },
      () => setIsLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <div className="relative w-full aspect-[16/9] min-h-[220px] max-h-[520px] rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 shadow-lg bg-neutral-900 select-none">
      {/* Real Interactive Leaflet Satellite Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

      {/* Floating Top Controls (Clean Recenter + GPS) */}
      <div className="absolute top-3.5 right-3.5 rtl:right-auto rtl:left-3.5 z-[1000] flex items-center gap-2">
        <button
          onClick={handleRecenter}
          className="w-9 h-9 flex items-center justify-center bg-black/75 backdrop-blur-md hover:bg-black text-white rounded-2xl shadow-lg border border-white/15 text-sm transition-all active:scale-95"
          title={lang === 'ar' ? 'إعادة التمركز على الحقل' : 'Recenter Field'}
        >
          🎯
        </button>

        <button
          onClick={handleGps}
          disabled={isLocating}
          className="h-9 px-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md hover:bg-black text-white rounded-2xl shadow-lg border border-white/15 text-xs font-semibold transition-all active:scale-95"
          title={lang === 'ar' ? 'تحديد موقعي' : 'Locate with GPS'}
        >
          <span className={`w-2 h-2 rounded-full ${isLocating ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
          <span className="hidden sm:inline">{lang === 'ar' ? 'موقعي' : 'GPS'}</span>
        </button>
      </div>

      {/* Floating Bottom Location Pill & Zoom */}
      <div className="absolute bottom-3.5 inset-x-3.5 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-2xl text-xs text-white/95 flex items-center gap-2 border border-white/15 shadow-lg font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="truncate max-w-[150px] sm:max-w-xs">{fieldName}</span>
          <span className="text-white/30 hidden sm:inline">|</span>
          <span className="font-mono text-neutral-300 text-[11px] hidden sm:inline">
            {lat.toFixed(3)}°N, {lon.toFixed(3)}°E
          </span>
        </div>

        {/* Clean Zoom Buttons */}
        <div className="pointer-events-auto flex items-center gap-1 bg-black/75 backdrop-blur-md p-1 rounded-2xl border border-white/15 shadow-lg">
          <button
            onClick={() => handleZoom(1)}
            className="w-7 h-7 flex items-center justify-center hover:bg-white/20 text-white rounded-xl text-base font-bold active:scale-90 transition-all"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => handleZoom(-1)}
            className="w-7 h-7 flex items-center justify-center hover:bg-white/20 text-white rounded-xl text-base font-bold active:scale-90 transition-all"
            title="Zoom Out"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
}
