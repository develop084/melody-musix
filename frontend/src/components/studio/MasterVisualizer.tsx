import React, { useRef, useEffect } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { useStudioStore } from '../../stores/studioStore';
import { Activity } from 'lucide-react';

export function MasterVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlaying = useStudioStore((state) => state.isPlaying);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const numBars = 16;
    const barWidth = Math.floor((width - (numBars - 1) * 2) / numBars);

    // If not playing, render static idle bars once and exit without running RAF loop
    if (!isPlaying) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#e2e8f0';
      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + 2);
        const y = height - 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, 2, [1.5, 1.5, 0, 0]);
        ctx.fill();
      }
      return;
    }

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const freqData = audioEngine.getFrequencyData();

      for (let i = 0; i < numBars; i++) {
        const dataIndex = Math.min(freqData.length - 1, Math.floor((i / numBars) * freqData.length));
        const val = freqData[dataIndex] || 0;
        const barHeight = Math.max(2, Math.floor((val / 255) * height));
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        if (val > 220) {
          ctx.fillStyle = '#ef4444'; // Red peak
        } else if (val > 150) {
          ctx.fillStyle = '#f59e0b'; // Amber
        } else {
          ctx.fillStyle = '#10b981'; // Emerald
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [1.5, 1.5, 0, 0]);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 shadow-xs"
      title="Master VU Level Meter"
    >
      <Activity className={`w-3.5 h-3.5 ${isPlaying ? 'text-slate-700' : 'text-slate-400'}`} />
      <canvas ref={canvasRef} width={80} height={20} className="w-16 sm:w-20 h-5 block" />
    </div>
  );
}
