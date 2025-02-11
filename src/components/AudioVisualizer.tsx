import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  audioContext: AudioContext | null;
  analyzer: AnalyserNode | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioContext, analyzer }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!analyzer || !audioContext || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyzer.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const drawWaveform = () => {
      if (!analyzer || !ctx) return;

      analyzer.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#10b981"; // Green color for the waveform
      ctx.lineWidth = 2;

      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = canvas.width / 2; // Start in the middle

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // Normalize to [-1,1] range
        const y = v * (canvas.height / 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x -= sliceWidth; // Move left to create a vertical effect
      }

      ctx.stroke();
      requestAnimationFrame(drawWaveform);
    };

    drawWaveform();
  }, [audioContext, analyzer]);

  return <canvas ref={canvasRef} width={200} height={300} className="waveformCanvas" />;
};

export default AudioVisualizer;