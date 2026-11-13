// Generate standard 16-bit PCM Stereo WAV buffers on-the-fly for offline/instant melody samples

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function generateWavBuffer(
  durationSeconds: number,
  generator: (time: number, channel: number) => number,
  sampleRate = 44100
): Buffer {
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataByteLength = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Write audio samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = generator(t, channel);
      // Clamp between -1.0 and 1.0
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer (-32768 to 32767)
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, Math.floor(intSample), true);
      offset += 2;
    }
  }

  return Buffer.from(buffer);
}

// Built-in studio loops
export const SAMPLE_TRACKS = [
  {
    id: 'sample-synth-lead',
    title: 'Neon Dream - Synth Lead Riff',
    duration: '0:06',
    author: 'Studio Presets',
    url: '/api/v1/media/stream?videoId=sample-synth-lead',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    generate: () =>
      generateWavBuffer(6.0, (t) => {
        // Pentatonic melody sequence: A4 (440), C5 (523), D5 (587), E5 (659), G5 (784)
        const notes = [440, 523, 587, 659, 784, 659, 587, 523];
        const step = Math.floor((t * 2) % notes.length);
        const freq = notes[step];
        const noteTime = (t * 2) % 1;
        // Sawtooth wave with decay envelope
        const saw = (2 * ((freq * t) % 1) - 1) * Math.exp(-noteTime * 2.5);
        // Chorus/harmonic
        const sub = Math.sin(2 * Math.PI * (freq / 2) * t) * 0.4;
        return (saw + sub) * 0.4;
      }),
  },
  {
    id: 'sample-lofi-keys',
    title: 'Warm Vinyl - Lo-Fi Rhodes Chords',
    duration: '0:08',
    author: 'Studio Presets',
    url: '/api/v1/media/stream?videoId=sample-lofi-keys',
    thumbnail: 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?w=300&q=80',
    generate: () =>
      generateWavBuffer(8.0, (t, ch) => {
        // Am9 to Fmaj7 chords
        const chord1 = [220, 261.63, 329.63, 392, 493.88]; // Am9
        const chord2 = [174.61, 220, 261.63, 329.63, 392]; // Fmaj7
        const currentChord = (t % 8) < 4 ? chord1 : chord2;
        const chordT = t % 4;
        const env = Math.exp(-chordT * 0.8);
        let sum = 0;
        for (const freq of currentChord) {
          sum += Math.sin(2 * Math.PI * freq * t + ch * 0.1) * (1 / currentChord.length);
        }
        return sum * env * 0.45;
      }),
  },
  {
    id: 'sample-bass-groove',
    title: 'Midnight Funk - Bassline Riff',
    duration: '0:04',
    author: 'Studio Presets',
    url: '/api/v1/media/stream?videoId=sample-bass-groove',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    generate: () =>
      generateWavBuffer(4.0, (t) => {
        // Funky bass pattern
        const bassNotes = [110, 110, 130.81, 146.83, 110, 164.81, 146.83, 130.81];
        const step = Math.floor((t * 2) % bassNotes.length);
        const freq = bassNotes[step];
        const noteT = (t * 2) % 1;
        const triangle = Math.asin(Math.sin(2 * Math.PI * freq * t)) * (2 / Math.PI);
        const env = Math.exp(-noteT * 3.5);
        return triangle * env * 0.6;
      }),
  },
  {
    id: 'sample-drum-beat',
    title: 'Boom Bap - Drum Loop',
    duration: '0:04',
    author: 'Studio Presets',
    url: '/api/v1/media/stream?videoId=sample-drum-beat',
    thumbnail: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=300&q=80',
    generate: () =>
      generateWavBuffer(4.0, (t) => {
        // Kick on 0 and 2.5, Snare on 1 and 3, Hi-hat every 0.5s
        const beatT = t % 1;
        const beatNum = Math.floor(t % 4);
        let sound = 0;

        // Kick drum (pitch drop sine)
        if (beatNum === 0 || (beatNum === 2 && beatT > 0.5)) {
          const kt = beatNum === 0 ? beatT : beatT - 0.5;
          const kFreq = 120 * Math.exp(-kt * 25);
          sound += Math.sin(2 * Math.PI * kFreq * kt) * Math.exp(-kt * 10) * 0.8;
        }

        // Snare drum (noise + tone)
        if (beatNum === 1 || beatNum === 3) {
          const st = beatT;
          const noise = (Math.random() * 2 - 1) * Math.exp(-st * 15);
          const tone = Math.sin(2 * Math.PI * 180 * st) * Math.exp(-st * 20);
          sound += (noise * 0.6 + tone * 0.4) * 0.7;
        }

        // Hi-hat (short noise burst every 8th note)
        const hatT = t % 0.25;
        const hat = (Math.random() * 2 - 1) * Math.exp(-hatT * 45) * 0.2;
        sound += hat;

        return sound;
      }),
  },
  {
    id: 'sample-acoustic-guitar',
    title: 'Campfire Echoes - Acoustic Pluck',
    duration: '0:06',
    author: 'Studio Presets',
    url: '/api/v1/media/stream?videoId=sample-acoustic-guitar',
    thumbnail: 'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=300&q=80',
    generate: () =>
      generateWavBuffer(6.0, (t, ch) => {
        const arpeggio = [329.63, 392.0, 493.88, 587.33, 659.25, 587.33];
        const step = Math.floor((t * 2) % arpeggio.length);
        const freq = arpeggio[step];
        const noteT = (t * 2) % 1;
        const pluck =
          Math.sin(2 * Math.PI * freq * t + ch * 0.2) * 0.5 +
          Math.sin(2 * Math.PI * freq * 2 * t) * 0.25 +
          Math.sin(2 * Math.PI * freq * 3 * t) * 0.125;
        return pluck * Math.exp(-noteT * 2.2) * 0.5;
      }),
  },
  {
    id: 'sample-punjabi-dhol',
    title: 'Punjabi Dhol Beats - Bhangra Groove',
    duration: '0:04',
    author: 'Desi Presets',
    url: '/api/v1/media/stream?videoId=sample-punjabi-dhol',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    generate: () =>
      generateWavBuffer(4.0, (t) => {
        // Bhangra 4-beat rhythm (Dha, Ge, Na, Tin)
        const beatT = t % 1;
        const beatNum = Math.floor(t % 4);
        let sound = 0;

        // Dhol Dagga (deep bass boom ~70Hz with resonant decay)
        if (beatNum === 0 || beatNum === 2 || (beatNum === 3 && beatT > 0.5)) {
          const dt = beatNum === 3 ? beatT - 0.5 : beatT;
          const bassFreq = 75 * Math.exp(-dt * 15);
          sound += Math.sin(2 * Math.PI * bassFreq * dt) * Math.exp(-dt * 7) * 0.9;
        }

        // Tilli (sharp high-frequency wood stick strike on snare)
        const tilliBeats = [0, 0.25, 0.5, 0.75];
        for (const tb of tilliBeats) {
          if (beatT >= tb && beatT < tb + 0.15) {
            const tt = beatT - tb;
            const stick = (Math.random() * 2 - 1) * Math.exp(-tt * 60) * 0.35;
            const woodTone = Math.sin(2 * Math.PI * 1400 * tt) * Math.exp(-tt * 40) * 0.25;
            sound += stick + woodTone;
          }
        }

        return sound * 0.8;
      }),
  },
  {
    id: 'sample-sitar-raga',
    title: 'Bollywood Sitar - Melodic Raga Theme',
    duration: '0:08',
    author: 'Desi Presets',
    url: '/api/v1/media/stream?videoId=sample-sitar-raga',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    generate: () =>
      generateWavBuffer(8.0, (t, ch) => {
        // Raga Yaman notes: Sa (261.63), Re (293.66), Ga (329.63), Tivra Ma (369.99), Pa (392.00), Dha (440.00), Ni (493.88)
        const ragaNotes = [261.63, 293.66, 329.63, 369.99, 392.0, 440.0, 493.88, 523.25];
        const step = Math.floor((t * 2) % ragaNotes.length);
        const freq = ragaNotes[step];
        const noteT = (t * 2) % 1;

        // Sitar buzz/jawari simulation (rich odd harmonics with slight pitch bend)
        const bend = 1 + 0.03 * Math.sin(noteT * Math.PI);
        const fundamental = Math.sin(2 * Math.PI * freq * bend * t);
        const h2 = Math.sin(2 * Math.PI * freq * 2 * bend * t) * 0.5;
        const h3 = Math.sin(2 * Math.PI * freq * 3 * bend * t) * 0.35;
        const h4 = Math.sin(2 * Math.PI * freq * 4 * bend * t) * 0.2;
        const sitar = (fundamental + h2 + h3 + h4) * Math.exp(-noteT * 2.8);

        // Tanpura / Drone string backing (Sa & Pa)
        const droneSa = Math.sin(2 * Math.PI * 130.81 * t) * 0.15;
        const dronePa = Math.sin(2 * Math.PI * 196.0 * t + ch * 0.2) * 0.12;

        return (sitar * 0.65 + droneSa + dronePa) * 0.7;
      }),
  },
  {
    id: 'sample-desi-hiphop',
    title: 'Gully Boom-Bap - Mumbai Hip-Hop Groove',
    duration: '0:04',
    author: 'Desi Presets',
    url: '/api/v1/media/stream?videoId=sample-desi-hiphop',
    thumbnail: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=300&q=80',
    generate: () =>
      generateWavBuffer(4.0, (t) => {
        const beatT = t % 1;
        const beatNum = Math.floor(t % 4);
        let sound = 0;

        // Sub Kick 808
        if (beatNum === 0 || (beatNum === 2 && beatT > 0.45)) {
          const kt = beatNum === 0 ? beatT : beatT - 0.45;
          const kFreq = 95 * Math.exp(-kt * 18);
          sound += Math.sin(2 * Math.PI * kFreq * kt) * Math.exp(-kt * 6) * 0.95;
        }

        // Snare & Clap
        if (beatNum === 1 || beatNum === 3) {
          const st = beatT;
          const noise = (Math.random() * 2 - 1) * Math.exp(-st * 22);
          const tone = Math.sin(2 * Math.PI * 220 * st) * Math.exp(-st * 25);
          sound += (noise * 0.7 + tone * 0.3) * 0.8;
        }

        // Tabla Dayan accent on offbeats
        if (beatT > 0.75) {
          const tt = beatT - 0.75;
          sound += Math.sin(2 * Math.PI * 440 * tt) * Math.exp(-tt * 35) * 0.4;
        }

        return sound * 0.85;
      }),
  },
  {
    id: 'sample-chai-lofi',
    title: 'Monsoon Chai - Warm Lo-Fi Keys',
    duration: '0:08',
    author: 'Desi Presets',
    url: '/api/v1/media/stream?videoId=sample-chai-lofi',
    thumbnail: 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?w=300&q=80',
    generate: () =>
      generateWavBuffer(8.0, (t, ch) => {
        // Melodic nostalgic chords: Dm7 -> G7 -> Cmaj7
        const chord1 = [293.66, 349.23, 440.0, 523.25];
        const chord2 = [246.94, 311.13, 392.0, 493.88];
        const chord3 = [261.63, 329.63, 392.0, 493.88];
        const step = Math.floor(t % 6);
        const currentChord = step < 2 ? chord1 : step < 4 ? chord2 : chord3;
        const chordT = t % 2;
        const env = Math.exp(-chordT * 1.1);

        let sum = 0;
        for (const freq of currentChord) {
          // Add subtle warm vinyl wow/flutter
          const flutter = 1 + 0.003 * Math.sin(2 * Math.PI * 4 * t);
          sum += Math.sin(2 * Math.PI * freq * flutter * t + ch * 0.1) * (1 / currentChord.length);
        }

        return sum * env * 0.5;
      }),
  },
];

