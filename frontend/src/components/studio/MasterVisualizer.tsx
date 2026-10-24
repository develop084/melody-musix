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
        const dataIndex = Math.min(freqData.length - 1, Math.floor((i / numBars) * freqData.length));
        const val = isPlaying ? freqData[dataIndex] || 0 : 0;
        const barHeight = Math.max(2, Math.floor((val / 255) * height));
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Hardware LED gradient: green -> amber -> red peak
        if (isPlaying) {
          if (val > 220) {
            ctx.fillStyle = '#ef4444'; // Red peak
          } else if (val > 150) {
            ctx.fillStyle = '#f59e0b'; // Amber
          } else {
            ctx.fillStyle = '#10b981'; // Emerald
          }
        } else {
          ctx.fillStyle = '#1e2433';
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
      className="flex items-center gap-1.5 px-2 py-1 bg-[#08090d] rounded-lg border border-slate-800/80 shadow-inner"
      title="Master Bus Peak Spectrum Analyser"
    >
      <Activity className={`w-3.5 h-3.5 ${isPlaying ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}`} />
      <canvas ref={canvasRef} width={80} height={20} className="w-16 sm:w-20 h-5 block" />
    </div>
  );
}
