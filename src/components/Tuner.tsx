import React, { useEffect, useState, useRef } from "react";
import { YIN } from "pitchfinder";
import styles from "./Tuner.module.css";
import AudioVisualizer from "./AudioVisualizer";

type PitchDetectorFn = (data: Float32Array) => number | null;

const stringsList = ["E (low)", "A", "D", "G", "B", "E (high)"];

const Tuner: React.FC = () => {
  const [currentNote, setCurrentNote] = useState<string>("--");
  const [direction, setDirection] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [tunedStrings, setTunedStrings] = useState<boolean[]>(new Array(6).fill(false));

  // The horizontal offset for the pitch indicator
  const [notePosition, setNotePosition] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const yinRef = useRef<PitchDetectorFn | null>(null);

  useEffect(() => {
    return () => {
      stopTuning();
    };
  }, []);

  async function startTuning() {
    if (!isListening) {
      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new AudioContext();
        sourceRef.current = audioContextRef.current.createMediaStreamSource(micStreamRef.current);

        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 4096;
        sourceRef.current.connect(analyzerRef.current);

        yinRef.current = YIN({ sampleRate: audioContextRef.current.sampleRate });

        requestAnimationFrame(detectPitch);
        setIsListening(true);
      } catch (error) {
        console.error("Error accessing microphone:", error);
      }
    } else {
      stopTuning();
    }
  }

  function stopTuning() {
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setIsListening(false);
  }

  function detectPitch() {
    if (!analyzerRef.current || !yinRef.current) return;

    const bufferLength = analyzerRef.current.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyzerRef.current.getFloatTimeDomainData(dataArray);

    const pitch = yinRef.current(dataArray);
    if (pitch && pitch >= 20) {
      const { note, direction: dir } = getNoteFromFrequency(pitch);
      setCurrentNote(note);

      if (dir) {
        setDirection(dir);
        // Show the direction for 3 seconds
        setTimeout(() => {
          setDirection((prev) => (prev === dir && !tunedStrings.includes(true) ? "" : prev));
        }, 3000);
      } else {
        // in tune => mark string
        markTunedString(note, pitch);
      }

      // Move indicator left/right. Negative -> left, positive -> right
      const closestFreq = getClosestFrequency(note);
      let difference = pitch - closestFreq; 
      // If difference < 0 => negative offset => move left
      // If difference > 0 => positive offset => move right
      // If difference ~ 0 => near center

      // Scale it for minimal movement
      let offset = difference * 0.5;
      // Clamp offset to -40px ... 40px
      offset = Math.max(-40, Math.min(40, offset));

      setNotePosition(offset);
    }
    requestAnimationFrame(detectPitch);
  }

  function markTunedString(detectedNote: string, freq: number) {
    let index = -1;
    if (detectedNote === "E") {
      index = freq < 100 ? 0 : 5;
    } else {
      index = stringsList.indexOf(detectedNote);
    }

    if (index >= 0) {
      setTunedStrings((prev) => {
        const newArr = [...prev];
        newArr[index] = true;
        return newArr;
      });
      setDirection("");
    }
  }

  return (
    <div className={styles.tunerContainer}>
      <h1>Guitar Tuner</h1>

      <div>
        {/* Vertical Column of Strings */}
        {stringsList.map((stringName, i) => (
          <div key={i} className={styles.stringWrapper}>
            {/* The vertical “string” icon at top */}
            <div
              className={`${styles.vibratingString} ${
                tunedStrings[i] ? styles.vibrating : ""
              }`}
            ></div>

            {/* The note text in the middle */}
            <p className={tunedStrings[i] ? styles.tunedString : styles.untunedString}>
              {stringName}
            </p>

            {/* Floating note near bottom (left/right offset) */}
            {currentNote === stringName && (
              <div
                className={`${styles.floatingNote} ${
                  direction === "" ? styles.inTune : styles.outOfTune
                }`}
                style={{
                  transform: `translateX(${notePosition}px)`,
                }}
              >
                {currentNote}
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={startTuning} className={styles.startButton}>
        {isListening ? "Stop Tuning" : "Start Tuning"}
      </button>

      {isListening && (
        <AudioVisualizer
          audioContext={audioContextRef.current}
          analyzer={analyzerRef.current}
        />
      )}
    </div>
  );
};

/** Convert frequency -> note + direction */
function getNoteFromFrequency(freq: number): { note: string; direction: string } {
  if (freq < 20 || freq > 1200) {
    return { note: "--", direction: "" };
  }
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const A4 = 440;
  const n = Math.round(12 * Math.log2(freq / A4));
  const closestNote = notes[(n + 69) % 12];

  const closestFreq = A4 * Math.pow(2, n / 12);
  const difference = freq - closestFreq;

  let direction = "";
  if (difference < -1) {
    direction = "Tune Up ⬆️";
  } else if (difference > 1) {
    direction = "Tune Down ⬇️";
  }
  return { note: closestNote, direction };
}

/** For each open string, the canonical frequency */
function getClosestFrequency(note: string): number {
  const frequencies: Record<string, number> = {
    "E (low)": 82.41,
    A: 110,
    D: 146.83,
    G: 196,
    B: 246.94,
    "E (high)": 329.63,
  };
  return frequencies[note] ?? 0;
}

export default Tuner;
