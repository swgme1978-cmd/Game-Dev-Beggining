import React, { useRef, useEffect, useState } from 'react';
import { MapData, Province, RiverChannel } from '../server/types';

interface MapRendererProps {}

const MapRenderer: React.FC<MapRendererProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const response = await fetch('/api/game/map');
        if (!response.ok) {
          throw new Error(`Failed to fetch map data: ${response.statusText}`);
        }
        const data: MapData = await response.json();
        setMapData(data);
      } catch (err: any) {
        console.error('Error fetching map data:', err);
        setError(err.message);
      }
    };

    fetchMapData();
  }, []);

  const drawMap = (ctx: CanvasRenderingContext2D, data: MapData) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render Provinces
    data.provinces.forEach((province: Province) => {
      ctx.fillStyle = province.colorHex || '#228B22'; // default to a green if missing
      ctx.strokeStyle = '#000000'; // black border
      ctx.lineWidth = 1;

      if (province.outline && province.outline.length > 0) {
        ctx.beginPath();
        ctx.moveTo(province.outline[0].x, province.outline[0].y);
        for (let i = 1; i < province.outline.length; i++) {
          ctx.lineTo(province.outline[i].x, province.outline[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Debugging Overlay
      if (province.centroid) {
        ctx.fillStyle = '#ff0000'; // red dot for centroid
        ctx.beginPath();
        ctx.arc(province.centroid.x, province.centroid.y, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = '10px Arial';
        ctx.fillText(province.id, province.centroid.x + 5, province.centroid.y + 5);
      }
    });

    // Render River Channels (if any exist)
    if (data.riverChannels) {
      data.riverChannels.forEach((river: RiverChannel) => {
        ctx.fillStyle = river.colorHex || '#ADD8E6'; // distinct river blue
        ctx.strokeStyle = '#00008B'; // darker blue border
        ctx.lineWidth = 1;

        if (river.outline && river.outline.length > 0) {
          ctx.beginPath();
          ctx.moveTo(river.outline[0].x, river.outline[0].y);
          for (let i = 1; i < river.outline.length; i++) {
            ctx.lineTo(river.outline[i].x, river.outline[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Debugging Overlay
        if (river.centroid) {
          ctx.fillStyle = '#ffff00'; // yellow dot for river centroid
          ctx.beginPath();
          ctx.arc(river.centroid.x, river.centroid.y, 2, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.font = '8px Arial';
          ctx.fillText(river.id, river.centroid.x + 4, river.centroid.y + 4);
        }
      });
    }
  };

  useEffect(() => {
    if (mapData && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = mapData.width;
      canvas.height = mapData.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawMap(ctx, mapData);
      }
    }
  }, [mapData]);

  if (error) {
    return <div style={{ color: 'red' }}>Error loading map: {error}</div>;
  }

  return (
    <div style={{ overflow: 'auto', maxWidth: '100%', maxHeight: '100%' }}>
      {mapData ? (
        <canvas ref={canvasRef} style={{ border: '1px solid black' }} />
      ) : (
        <div>Loading map...</div>
      )}
    </div>
  );
};

export default MapRenderer;
