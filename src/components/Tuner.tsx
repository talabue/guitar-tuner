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
  const [tunedStrings, setTunedStrings] = useState<boolean[]>(
    new Array(6).fill(false)
  );
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
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioContextRef.current = new AudioContext();
        sourceRef.current = audioContextRef.current.createMediaStreamSource(
          micStreamRef.current
        );

        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 4096;
        sourceRef.current.connect(analyzerRef.current);

        yinRef.current = YIN({
          sampleRate: audioContextRef.current.sampleRate,
        });

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
        setTimeout(() => {
          setDirection((prev) =>
            prev === dir && !tunedStrings.includes(true) ? "" : prev
          );
        }, 3000);
      } else {
        markTunedString(note, pitch);
      }

      const closestFreq = getClosestFrequency(note);
      let difference = pitch - closestFreq;

      let offset = difference * 0.5;

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

      <div className={styles.stringContainer}>
        {stringsList.map((stringName, i) => {
          const isClosestNote = currentNote === stringName;
          const isTuned = tunedStrings[i];

          return (
            <div key={i} className={styles.stringWrapper}>
              <div
                className={`${styles.string} ${
                  isTuned ? styles.tuned : isClosestNote ? styles.vibrating : ""
                }`}
              ></div>

              <p
                className={`${
                  isTuned
                    ? `${styles.tunedString} ${styles.tunedGlow}`
                    : styles.untunedString
                }`}
              >
                {stringName}
              </p>

              {isClosestNote && (
                <div
                  className={`${styles.pitchIndicatorContainer} ${
                    direction === "" ? styles.inTuneContainer : ""
                  }`}
                  style={{ transform: `translateX(${notePosition}px)` }}
                >
                  <span
                    className={`${styles.floatingNote} ${
                      direction === "" ? styles.inTune : styles.outOfTune
                    }`}
                  >
                    {currentNote}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={startTuning} className={styles.startButton}>
        {isListening ? "Stop Tuning" : "Start Tuning"}
      </button>

      {isListening && (
        <div className={styles.audioVisualizerContainer}>
          <AudioVisualizer
            audioContext={audioContextRef.current}
            analyzer={analyzerRef.current}
          />
        </div>
      )}
    </div>
  );
};

function getNoteFromFrequency(freq: number): {
  note: string;
  direction: string;
} {
  if (freq < 20 || freq > 1200) {
    return { note: "--", direction: "" };
  }
  const notes = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const A4 = 440;
  const n = Math.round(12 * Math.log2(freq / A4));
  const closestNote = notes[(n + 69) % 12];

  const closestFreq = A4 * Math.pow(2, n / 12);
  const difference = freq - closestFreq;

  let direction = "";
  if (difference < -0.5) {
    direction = "Tune Up ⬆️";
  } else if (difference > 0.5) {
    direction = "Tune Down ⬇️";
  }
  return { note: closestNote, direction };
}

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
