import React, { useEffect, useState } from "react";
import * as Tone from "tone";

const Tuner: React.FC = () => {
  const [note, setNote] = useState<string>("--");
  const [frequency, setFrequency] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  let mic: MediaStream;
  
  useEffect(() => {
    return () => {
      if (mic) {
        mic.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startTuning = async () => {
    if (!isListening) {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(mic);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      
      const detectPitch = () => {
        analyser.getFloatTimeDomainData(dataArray);
        const pitch = getPitch(dataArray, audioContext.sampleRate);
        if (pitch) {
          setFrequency(parseFloat(pitch.toFixed(2)));
          setNote(getNoteFromFrequency(pitch));
        }
        requestAnimationFrame(detectPitch);
      };
      detectPitch();
      setIsListening(true);
    }
  };
  
  return (
    <div className="tuner">
      <h1>Guitar Tuner</h1>
      <button onClick={startTuning}>Start Tuning</button>
      <h2>Note: {note}</h2>
      <h3>Frequency: {frequency} Hz</h3>
    </div>
  );
};

// Utility functions from tone
const getPitch = (buffer: Float32Array, sampleRate: number): number => {
  let maxVal = -Infinity;
  let index = -1;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] > maxVal) {
      maxVal = buffer[i];
      index = i;
    }
  }
  return sampleRate / index;
};

const getNoteFromFrequency = (freq: number): string => {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const A4 = 440;
  let n = Math.round(12 * Math.log2(freq / A4));
  return notes[(n + 69) % 12];
};

export default Tuner;
