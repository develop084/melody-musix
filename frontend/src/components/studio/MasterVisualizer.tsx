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

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const freqData = audioEngine.getFrequencyData();
      const numBars = 16;
      const barWidth = Math.floor((width - (numBars - 1) * 2) / numBars);

      for (let i = 0; i < numBars; i++) {
        // Sample frequency spectrum
        const dataIndex = Math.min(freqData.length - 1, Math.floor((i / numBars) * freqData.length));
        const val = isPlaying ? freqData[dataIndex] || 0 : 0;
        const barHeight = Math.max(2, Math.floor((val / 255) * height));
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Gradient coloring: green -> yellow -> amber
        const hue = 140 - (val / 255) * 110;
        ctx.fillStyle = isPlaying ? `hsl(${hue}, 85%, 50%)` : '#cbd5e1';

        // Rounded bar top
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded-lg border border-slate-800 shadow-inner" title="Real-time Master Output Audio Meter">
      <Activity className={`w-3.5 h-3.5 ${isPlaying ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
      <canvas ref={canvasRef} width={80} height={20} className="w-16 sm:w-20 h-5 block" />
    </div>
  );
}
