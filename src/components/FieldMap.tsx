'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { Language } from '@/lib/types';
import { SatelliteIcon, MapPinIcon, LayersIcon, CompassIcon } from './Icons';

interface FieldMapProps {
  lat: number;
  lon: number;
  fieldName: string;
  lang: Language;
  onLocationChange: (lat: number, lon: number, locationName?: string) => void;
  canopyTempAnomaly: number;
  isShockActive: boolean;
}

export default function FieldMap({
  lat,
  lon,
  fieldName,
  lang,
  onLocationChange,
  isShockActive,
}: FieldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const rawPolygonRef = useRef<any>(null);
  const bufferPolygonRef = useRef<any>(null);

  const [mapMode, setMapMode] = useState<'satellite' | 'street' | 'topo'>('satellite');
  const [isLocating, setIsLocating] = useState(false);

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
          zoom: 14,
          zoomControl: false,
          attributionControl: false,
        });

        // 100% Free Open Esri World Imagery (No Key)
        const satelliteLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 18 }
        ).addTo(map);

        map.baseTileLayer = satelliteLayer;

        // Clean Apple Pulsing Pin
        const customIcon = L.divIcon({
          className: 'apple-pulsing-marker',
          html: `<div style="position:relative; width:26px; height:26px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(0,113,227,0.3); animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="width:16px; height:16px; background:#0071E3; border:3px solid #ffffff; border-radius:50%; box-shadow:0 2px 8px rgba(0,0,0,0.4); z-index:2;"></div>
          </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const marker = L.marker([lat, lon], { icon: customIcon, draggable: true }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          updatePolygons(L, map, pos.lat, pos.lng);
          onLocationChange(Number(pos.lat.toFixed(4)), Number(pos.lng.toFixed(4)));
        });

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          updatePolygons(L, map, e.latlng.lat, e.latlng.lng);
          onLocationChange(Number(e.latlng.lat.toFixed(4)), Number(e.latlng.lng.toFixed(4)));
        });

        mapInstanceRef.current = map;
        updatePolygons(L, map, lat, lon);
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

  // Update center when lat/lon props change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      map.setView([lat, lon], map.getZoom(), { animate: true });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
      updatePolygons(L.default || L, map, lat, lon);
    });
  }, [lat, lon, isShockActive]);

  // Field Polygon & Inward Buffer
  const updatePolygons = (L: any, map: any, cLat: number, cLon: number) => {
    if (rawPolygonRef.current) map.removeLayer(rawPolygonRef.current);
    if (bufferPolygonRef.current) map.removeLayer(bufferPolygonRef.current);

    const deltaRaw = 0.0038;
    const deltaBuffer = 0.0028;

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

    const rawColor = isShockActive ? '#EF4444' : '#0071E3';

    rawPolygonRef.current = L.polygon(rawCoords, {
      color: rawColor,
      weight: 1.5,
      dashArray: '4, 4',
      fillOpacity: 0.04,
      fillColor: rawColor,
    }).addTo(map);

    bufferPolygonRef.current = L.polygon(bufferCoords, {
      color: isShockActive ? '#F87171' : '#10B981',
      weight: 2,
      fillOpacity: isShockActive ? 0.28 : 0.14,
      fillColor: isShockActive ? '#EF4444' : '#10B981',
    }).addTo(map);
  };

  // Switch Layer
  const handleLayerChange = (mode: 'satellite' | 'street' | 'topo') => {
    setMapMode(mode);
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (map.baseTileLayer) map.removeLayer(map.baseTileLayer);

      let tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      let maxZoom = 18;

      if (mode === 'street') {
        tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        maxZoom = 19;
      } else if (mode === 'topo') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
      }

      map.baseTileLayer = (L.default || L).tileLayer(tileUrl, { maxZoom }).addTo(map);
    });
  };

  // Zoom In / Out Handlers
  const handleZoom = (delta: number) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + delta);
  };

  // Recenter on Field
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([lat, lon], 14, { animate: true });
  };

  // GPS Locate
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const uLat = Number(pos.coords.latitude.toFixed(4));
        const uLon = Number(pos.coords.longitude.toFixed(4));
        onLocationChange(uLat, uLon, lang === 'ar' ? 'موقعي' : 'My Location');
      },
      () => setIsLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm bg-neutral-900">
      {/* Sleek Floating Top Controls */}
      <div className="absolute top-3 inset-x-3 z-[1000] flex items-center justify-between pointer-events-none gap-2">
        {/* Layer Mode Selector (Pill with Icons) */}
        <div className="pointer-events-auto flex items-center bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md p-1 rounded-xl shadow-md border border-black/5 dark:border-white/10 text-xs">
          <button
            onClick={() => handleLayerChange('satellite')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              mapMode === 'satellite' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
            title={lang === 'ar' ? 'قمر صناعي' : 'Satellite'}
          >
            <SatelliteIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'فضائي' : 'Satellite'}</span>
          </button>
          <button
            onClick={() => handleLayerChange('street')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              mapMode === 'street' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
            title={lang === 'ar' ? 'خريطة شوارع' : 'Street Map'}
          >
            <LayersIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'شوارع' : 'Street'}</span>
          </button>
          <button
            onClick={() => handleLayerChange('topo')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              mapMode === 'topo' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
            title={lang === 'ar' ? 'تضاريس' : 'Topography'}
          >
            <CompassIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'تضاريس' : 'Topo'}</span>
          </button>
        </div>

        {/* Action Buttons: GPS, Center, Coordinates */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            onClick={handleRecenter}
            className="w-8 h-8 flex items-center justify-center bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md hover:bg-white rounded-xl shadow-md border border-black/5 dark:border-white/10 text-neutral-700 dark:text-neutral-300 transition-all active:scale-95 text-xs font-bold"
            title={lang === 'ar' ? 'إعادة تمركز' : 'Recenter'}
          >
            🎯
          </button>

          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="h-8 px-2.5 flex items-center gap-1.5 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md hover:bg-white rounded-xl shadow-md border border-black/5 dark:border-white/10 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-all active:scale-95"
            title={lang === 'ar' ? 'موقعي المباشر' : 'Locate Me'}
          >
            <span className={`w-2 h-2 rounded-full ${isLocating ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
            <span className="hidden sm:inline">{lang === 'ar' ? 'موقعي' : 'GPS'}</span>
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-[380px] sm:h-[440px] z-0" />

      {/* Floating Bottom Info Pill */}
      <div className="absolute bottom-3 inset-x-3 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] text-white/90 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-mono">{lat.toFixed(3)}°, {lon.toFixed(3)}°</span>
          <span className="text-white/40">|</span>
          <span className="text-emerald-300 font-medium">{lang === 'ar' ? 'نطاق النواة (-30م)' : 'Core (-30m)'}</span>
        </div>

        {/* Clean Zoom In/Out on Map Edge */}
        <div className="pointer-events-auto flex flex-col gap-1">
          <button
            onClick={() => handleZoom(1)}
            className="w-7 h-7 flex items-center justify-center bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-lg shadow-sm text-sm font-bold text-neutral-700 dark:text-neutral-300 active:scale-95"
          >
            +
          </button>
          <button
            onClick={() => handleZoom(-1)}
            className="w-7 h-7 flex items-center justify-center bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-lg shadow-sm text-sm font-bold text-neutral-700 dark:text-neutral-300 active:scale-95"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
}
