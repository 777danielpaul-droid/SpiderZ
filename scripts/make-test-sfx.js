import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = (p) => fs.mkdirSync(path.join(__dirname, "..", p), { recursive: true });

const files = [
  ["public/sfx/ui/click.mp3", 220, 0.08],
  ["public/sfx/ui/collect.mp3", 660, 0.12],
  ["public/sfx/ui/tap.mp3", 440, 0.07],
  ["public/sfx/arena/start.mp3", 330, 0.15],
  ["public/sfx/arena/win.mp3", 523, 0.25],
  ["public/sfx/arena/lose.mp3", 180, 0.30],
  ["public/sfx/arena/draw.mp3", 350, 0.20],
];

const sampleRate = 44100;

function writeWav(filePath, freq, durationSec) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  function writeStr(offset, str) {
    for (let i = 0; i < str.length; i++) buffer[offset + i] = str.charCodeAt(i);
  }

  writeStr(0, "RIFF");
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  writeStr(36, "data");
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.max(0, 1 - t / durationSec);
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.6 * env;
    const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32768)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

for (const [rel, freq, dur] of files) {
  const full = path.join(__dirname, "..", rel);
  out(rel);
  writeWav(full, freq, dur);
  console.log("wrote", rel);
}
