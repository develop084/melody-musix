import lameRaw from 'lamejs/lame.all.js?raw';

let lameInstance: any = null;

export function getLame(): { Mp3Encoder: any; WavHeader: any } {
  if (!lameInstance) {
    try {
      const initFn = new Function('var module = {}; ' + lameRaw + '; return lamejs;');
      lameInstance = initFn();
    } catch (err) {
      console.error('Failed to initialize LAME encoder:', err);
      throw new Error('LAME MP3 Encoder initialization failed');
    }
  }
  return lameInstance;
}
