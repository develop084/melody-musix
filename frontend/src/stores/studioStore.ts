import { create } from 'zustand';
import { Track, AudioClip, MediaTrack, Project } from '../types';
import { audioEngine } from '../audio/audioEngine';

interface StudioState {
  projectTitle: string;
  projectId: string | null;
  bpm: number;
  durationMs: number;
  tracks: Track[];
  selectedTrackId: string;

  // Source inspection & trimmer state
  sourceTrackInfo: MediaTrack | null;
  sourceAudioBuffer: AudioBuffer | null;
  trimStartMs: number;
  trimEndMs: number;
  trimFadeInMs: number;
  trimFadeOutMs: number;
  trimVolume: number;
  isSnippetPlaying: boolean;

  // Master playback state
  isPlaying: boolean;
  currentTimeMs: number;

  // Undo / Redo history
  history: Track[][];
  future: Track[][];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Processing state for feedback
  isProcessingAudio: boolean;
  processingStatus: string;
  setIsProcessingAudio: (loading: boolean, status?: string) => void;

  // Actions
  setProjectTitle: (title: string) => void;
  setBpm: (bpm: number) => void;
  setDurationMs: (ms: number) => void;
  setSelectedTrackId: (trackId: string) => void;

  setSourceTrack: (track: MediaTrack, buffer: AudioBuffer) => void;
  clearSourceTrack: () => void;
  setTrimRange: (startMs: number, endMs: number) => void;
  setTrimFadeIn: (ms: number) => void;
  setTrimFadeOut: (ms: number) => void;
  setTrimVolume: (vol: number) => void;
  setIsSnippetPlaying: (playing: boolean) => void;

  addClipToSelectedTrack: (timelineStartMs?: number) => void;
  addDirectSampleClip: (mediaTrack: MediaTrack, targetTrackId?: string) => Promise<void>;
  removeClip: (trackId: string, clipId: string) => void;
  updateClipPosition: (trackId: string, clipId: string, timelineStartMs: number) => void;
  updateClipVolume: (trackId: string, clipId: string, volume: number) => void;

  addTrack: (name?: string) => void;
  removeTrack: (trackId: string) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;

  setCurrentTimeMs: (ms: number) => void;
  setIsPlaying: (playing: boolean) => void;
  playMasterTimeline: () => void;
  stopMasterTimeline: () => void;

  // Loop, Grid & Metronome
  isLooping: boolean;
  toggleLoop: () => void;
  isMetronomeActive: boolean;
  toggleMetronome: () => void;
  snapToGrid: 'off' | '1/4' | '1/2' | '1';
  setSnapToGrid: (snap: 'off' | '1/4' | '1/2' | '1') => void;

  // Master Filter FX
  masterFilterFreq: number;
  setMasterFilterFreq: (freq: number) => void;

  // Advanced Operations
  duplicateClip: (trackId: string, clipId: string) => void;
  loadDemoProject: () => Promise<void>;

  loadProject: (project: Project) => void;
  resetProject: () => void;
}

const DEFAULT_TRACKS: Track[] = [
  {
    id: 'trk_01',
    name: 'Track 1 (Lead Melody)',
    volume: 1.0,
    muted: false,
    solo: false,
    clips: [],
  },
  {
    id: 'trk_02',
    name: 'Track 2 (Harmony / Bass)',
    volume: 1.0,
    muted: false,
    solo: false,
    clips: [],
  },
  {
    id: 'trk_03',
    name: 'Track 3 (Beats & FX)',
    volume: 1.0,
    muted: false,
    solo: false,
    clips: [],
  },
];

const cloneTracks = (tracks: Track[]): Track[] => JSON.parse(JSON.stringify(tracks));

let playbackRafId: number | null = null;
let playbackStartTimestamp = 0;
let playbackInitialOffsetMs = 0;

export const useStudioStore = create<StudioState>((set, get) => ({
  projectTitle: 'My Melody Medley',
  projectId: null,
  bpm: 120,
  durationMs: 30000,
  tracks: DEFAULT_TRACKS,
  selectedTrackId: 'trk_01',

  history: [],
  future: [],
  canUndo: false,
  canRedo: false,

  isProcessingAudio: false,
  processingStatus: '',
  setIsProcessingAudio: (loading, status = '') => set({ isProcessingAudio: loading, processingStatus: status }),

  undo: () => {
    const { history, future, tracks } = get();
    if (history.length === 0) return;
    const previous = history[0];
    const newHistory = history.slice(1);
    const current = cloneTracks(tracks);
    set({
      tracks: previous,
      history: newHistory,
      future: [current, ...future].slice(0, 30),
      canUndo: newHistory.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { history, future, tracks } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    const current = cloneTracks(tracks);
    set({
      tracks: next,
      history: [current, ...history].slice(0, 30),
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
  },

  sourceTrackInfo: null,
  sourceAudioBuffer: null,
  trimStartMs: 0,
  trimEndMs: 4000,
  trimFadeInMs: 150,
  trimFadeOutMs: 150,
  trimVolume: 1.0,
  isSnippetPlaying: false,

  isPlaying: false,
  currentTimeMs: 0,

  setProjectTitle: (title) => set({ projectTitle: title }),
  setBpm: (bpm) => set({ bpm }),
  setDurationMs: (ms) => set({ durationMs: Math.max(5000, ms) }),
  setSelectedTrackId: (id) => set({ selectedTrackId: id }),

  setSourceTrack: (track, buffer) => {
    const endMs = Math.min(4000, Math.floor(buffer.duration * 1000));
    set({
      sourceTrackInfo: track,
      sourceAudioBuffer: buffer,
      trimStartMs: 0,
      trimEndMs: endMs,
      isSnippetPlaying: false,
    });
  },

  clearSourceTrack: () => set({ sourceTrackInfo: null, sourceAudioBuffer: null, isSnippetPlaying: false }),

  setTrimRange: (startMs, endMs) => set({ trimStartMs: Math.max(0, startMs), trimEndMs: Math.max(startMs + 200, endMs) }),
  setTrimFadeIn: (ms) => set({ trimFadeInMs: ms }),
  setTrimFadeOut: (ms) => set({ trimFadeOutMs: ms }),
  setTrimVolume: (vol) => set({ trimVolume: vol }),
  setIsSnippetPlaying: (playing) => set({ isSnippetPlaying: playing }),

  addClipToSelectedTrack: (timelineStartMs) => {
    const {
      tracks,
      history,
      selectedTrackId,
      sourceTrackInfo,
      trimStartMs,
      trimEndMs,
      trimFadeInMs,
      trimFadeOutMs,
      trimVolume,
      currentTimeMs,
    } = get();

    if (!sourceTrackInfo) return;

    const clipDuration = Math.max(200, trimEndMs - trimStartMs);
    const startAt = timelineStartMs !== undefined ? timelineStartMs : currentTimeMs;

    const newClip: AudioClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceUrl: sourceTrackInfo.url,
      sourceTitle: sourceTrackInfo.title,
      startOffsetMs: trimStartMs,
      durationMs: clipDuration,
      timelineStartMs: startAt,
      fadeInMs: trimFadeInMs,
      fadeOutMs: trimFadeOutMs,
      volume: trimVolume,
    };

    const updatedTracks = tracks.map((track) => {
      if (track.id === selectedTrackId) {
        return { ...track, clips: [...track.clips, newClip] };
      }
      return track;
    });

    const currentSnapshot = cloneTracks(tracks);
    set({
      tracks: updatedTracks,
      history: [currentSnapshot, ...history].slice(0, 30),
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  addDirectSampleClip: async (mediaTrack, targetTrackId) => {
    const { tracks, selectedTrackId, durationMs, currentTimeMs, history } = get();
    const destTrackId = targetTrackId || selectedTrackId;
    const track = tracks.find((t) => t.id === destTrackId) || tracks[0];
    if (!track) return;

    set({ isProcessingAudio: true, processingStatus: `Adding "${mediaTrack.title}" to track...` });
    try {
      const buffer = await audioEngine.decodeAudioFromUrl(mediaTrack.url);
      const clipDuration = Math.min(durationMs, Math.floor(buffer.duration * 1000));

      // Calculate smart position: if scrubbed past 0, use currentTimeMs; otherwise append after last clip
      let startAt = currentTimeMs > 0 ? currentTimeMs : 0;
      if (currentTimeMs === 0 && track.clips.length > 0) {
        const lastClip = track.clips[track.clips.length - 1];
        startAt = Math.min(durationMs - 200, lastClip.timelineStartMs + lastClip.durationMs);
      }

      const newClip: AudioClip = {
        id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceUrl: mediaTrack.url,
        sourceTitle: mediaTrack.title,
        startOffsetMs: 0,
        durationMs: clipDuration,
        timelineStartMs: startAt,
        fadeInMs: 100,
        fadeOutMs: 100,
        volume: 1.0,
      };

      const updatedTracks = tracks.map((t) => {
        if (t.id === track.id) {
          return { ...t, clips: [...t.clips, newClip] };
        }
        return t;
      });

      const currentSnapshot = cloneTracks(tracks);
      set({
        tracks: updatedTracks,
        history: [currentSnapshot, ...history].slice(0, 30),
        future: [],
        canUndo: true,
        canRedo: false,
      });
    } catch (err) {
      console.warn('Failed to add direct clip:', err);
    } finally {
      set({ isProcessingAudio: false, processingStatus: '' });
    }
  },

  removeClip: (trackId, clipId) => {
    const { tracks, history } = get();
    const updated = tracks.map((track) => {
      if (track.id === trackId) {
        return { ...track, clips: track.clips.filter((c) => c.id !== clipId) };
      }
      return track;
    });
    const currentSnapshot = cloneTracks(tracks);
    set({
      tracks: updated,
      history: [currentSnapshot, ...history].slice(0, 30),
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  updateClipPosition: (trackId, clipId, timelineStartMs) => {
    const { tracks, history } = get();
    const updated = tracks.map((track) => {
      if (track.id === trackId) {
        return {
          ...track,
          clips: track.clips.map((c) => (c.id === clipId ? { ...c, timelineStartMs: Math.max(0, timelineStartMs) } : c)),
        };
      }
      return track;
    });
    const currentSnapshot = cloneTracks(tracks);
    set({
      tracks: updated,
      history: [currentSnapshot, ...history].slice(0, 30),
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  updateClipVolume: (trackId, clipId, volume) => {
    const { tracks, history } = get();
    const updated = tracks.map((track) => {
      if (track.id === trackId) {
        return {
          ...track,
          clips: track.clips.map((c) => (c.id === clipId ? { ...c, volume } : c)),
        };
      }
      return track;
    });
    const currentSnapshot = cloneTracks(tracks);
    set({
      tracks: updated,
      history: [currentSnapshot, ...history].slice(0, 30),
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  addTrack: (name) => {
    const { tracks, history } = get();
    const newTrack: Track = {
      id: `trk_${Date.now()}`,
      name: name || `Track ${tracks.length + 1}`,
      volume: 1.0,
      muted: false,
      solo: false,
      clips: [],
    };
    const currentSnapshot = cloneTracks(tracks);
    set({
      tracks: [...tracks, newTrack],
      selectedTrackId: newTrack.id,
      history: [currentSnapshot, ...history].slice(0, 30),
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  removeTrack: (trackId) => {
    const { tracks, history } = get();
    if (tracks.length <= 1) return; // Keep at least 1 track
    const updated = tracks.filter((t) => t.id !== trackId);
    const currentSnapshot = cloneTracks(tracks);
    set({
      tracks: updated,
      selectedTrackId: updated[0].id,
      history: [currentSnapshot, ...history].slice(0, 30),
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  setTrackVolume: (trackId, volume) => {
    const { tracks } = get();
    set({
      tracks: tracks.map((t) => (t.id === trackId ? { ...t, volume } : t)),
    });
  },

  toggleTrackMute: (trackId) => {
    const { tracks } = get();
    set({
      tracks: tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)),
    });
  },

  toggleTrackSolo: (trackId) => {
    const { tracks } = get();
    set({
      tracks: tracks.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t)),
    });
  },

  setCurrentTimeMs: (ms) => set({ currentTimeMs: ms }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  isLooping: false,
  toggleLoop: () => set((s) => ({ isLooping: !s.isLooping })),

  snapToGrid: '1/4',
  isMetronomeActive: false,
  toggleMetronome: () => set((state) => ({ isMetronomeActive: !state.isMetronomeActive })),

  setSnapToGrid: (snap) => set({ snapToGrid: snap }),

  masterFilterFreq: 20000,
  setMasterFilterFreq: (freq) => {
    audioEngine.setMasterFilterFrequency(freq);
    set({ masterFilterFreq: freq });
  },

  playMasterTimeline: () => {
    const { tracks, currentTimeMs, durationMs, isLooping } = get();
    audioEngine.playTimeline(tracks, currentTimeMs, () => {
      if (get().isLooping) {
        set({ currentTimeMs: 0 });
        get().playMasterTimeline();
      } else {
        get().stopMasterTimeline();
        set({ currentTimeMs: 0 });
      }
    });

    playbackStartTimestamp = performance.now();
    playbackInitialOffsetMs = currentTimeMs;
    let lastMetronomeBeat = -1;
    set({ isPlaying: true });

    const tick = () => {
      if (!get().isPlaying) return;
      const elapsed = performance.now() - playbackStartTimestamp;
      const current = playbackInitialOffsetMs + elapsed;

      // Play synchronized metronome clicks if enabled
      if (get().isMetronomeActive) {
        const beatMs = (60 / get().bpm) * 1000;
        const currentBeat = Math.floor(current / beatMs);
        if (currentBeat !== lastMetronomeBeat) {
          lastMetronomeBeat = currentBeat;
          audioEngine.playClick(currentBeat % 4 === 0);
        }
      }

      if (current >= durationMs) {
        if (get().isLooping) {
          get().stopMasterTimeline();
          set({ currentTimeMs: 0 });
          get().playMasterTimeline();
          return;
        } else {
          get().stopMasterTimeline();
          set({ currentTimeMs: 0 });
          return;
        }
      }

      set({ currentTimeMs: current });
      playbackRafId = requestAnimationFrame(tick);
    };

    playbackRafId = requestAnimationFrame(tick);
  },

  stopMasterTimeline: () => {
    if (playbackRafId) {
      cancelAnimationFrame(playbackRafId);
      playbackRafId = null;
    }
    audioEngine.stopTimeline();
    set({ isPlaying: false });
  },

  duplicateClip: (trackId, clipId) => {
    const { tracks, history, durationMs } = get();
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const newStart = Math.min(durationMs - clip.durationMs, clip.timelineStartMs + clip.durationMs);
    const duplicatedClip: AudioClip = {
      ...clip,
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timelineStartMs: Math.max(0, newStart),
    };

    const updatedTracks = tracks.map((t) => {
      if (t.id === trackId) {
        return { ...t, clips: [...t.clips, duplicatedClip] };
      }
      return t;
    });

    const currentSnapshot = cloneTracks(tracks);
    set({
      tracks: updatedTracks,
      history: [currentSnapshot, ...history].slice(0, 30),
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  loadDemoProject: async () => {
    const { history, tracks, setIsProcessingAudio } = get();
    setIsProcessingAudio(true, '⚡ Loading instant demo melody...');

    try {
      const samples = [
        {
          id: 'sample-synth-lead',
          url: '/api/v1/media/stream?videoId=sample-synth-lead',
          title: 'Neon Dream - Synth Lead Riff',
        },
        {
          id: 'sample-lofi-keys',
          url: '/api/v1/media/stream?videoId=sample-lofi-keys',
          title: 'Warm Vinyl - Lo-Fi Electric Keys',
        },
        {
          id: 'sample-drums',
          url: '/api/v1/media/stream?videoId=sample-drums',
          title: 'Boom Bap - Vinyl Drums & Snare',
        },
      ];

      await Promise.all(samples.map((s) => audioEngine.decodeAudioFromUrl(s.url)));

      const demoTracks: Track[] = [
        {
          id: 'trk_01',
          name: 'Lead Synth Riff',
          volume: 0.95,
          muted: false,
          solo: false,
          clips: [
            {
              id: 'demo_clip_1',
              sourceUrl: samples[0].url,
              sourceTitle: samples[0].title,
              startOffsetMs: 0,
              durationMs: 6000,
              timelineStartMs: 0,
              fadeInMs: 100,
              fadeOutMs: 150,
              volume: 1.0,
            },
            {
              id: 'demo_clip_2',
              sourceUrl: samples[0].url,
              sourceTitle: samples[0].title,
              startOffsetMs: 0,
              durationMs: 6000,
              timelineStartMs: 6000,
              fadeInMs: 100,
              fadeOutMs: 150,
              volume: 1.0,
            },
            {
              id: 'demo_clip_3',
              sourceUrl: samples[0].url,
              sourceTitle: samples[0].title,
              startOffsetMs: 0,
              durationMs: 6000,
              timelineStartMs: 12000,
              fadeInMs: 100,
              fadeOutMs: 150,
              volume: 1.0,
            },
          ],
        },
        {
          id: 'trk_02',
          name: 'Lo-Fi Keys Harmony',
          volume: 0.85,
          muted: false,
          solo: false,
          clips: [
            {
              id: 'demo_clip_4',
              sourceUrl: samples[1].url,
              sourceTitle: samples[1].title,
              startOffsetMs: 0,
              durationMs: 8000,
              timelineStartMs: 0,
              fadeInMs: 200,
              fadeOutMs: 200,
              volume: 1.0,
            },
            {
              id: 'demo_clip_5',
              sourceUrl: samples[1].url,
              sourceTitle: samples[1].title,
              startOffsetMs: 0,
              durationMs: 8000,
              timelineStartMs: 8000,
              fadeInMs: 200,
              fadeOutMs: 200,
              volume: 1.0,
            },
          ],
        },
        {
          id: 'trk_03',
          name: 'Boom Bap Beats',
          volume: 1.0,
          muted: false,
          solo: false,
          clips: [
            {
              id: 'demo_clip_6',
              sourceUrl: samples[2].url,
              sourceTitle: samples[2].title,
              startOffsetMs: 0,
              durationMs: 4000,
              timelineStartMs: 0,
              fadeInMs: 50,
              fadeOutMs: 50,
              volume: 1.0,
            },
            {
              id: 'demo_clip_7',
              sourceUrl: samples[2].url,
              sourceTitle: samples[2].title,
              startOffsetMs: 0,
              durationMs: 4000,
              timelineStartMs: 4000,
              fadeInMs: 50,
              fadeOutMs: 50,
              volume: 1.0,
            },
            {
              id: 'demo_clip_8',
              sourceUrl: samples[2].url,
              sourceTitle: samples[2].title,
              startOffsetMs: 0,
              durationMs: 4000,
              timelineStartMs: 8000,
              fadeInMs: 50,
              fadeOutMs: 50,
              volume: 1.0,
            },
            {
              id: 'demo_clip_9',
              sourceUrl: samples[2].url,
              sourceTitle: samples[2].title,
              startOffsetMs: 0,
              durationMs: 4000,
              timelineStartMs: 12000,
              fadeInMs: 50,
              fadeOutMs: 50,
              volume: 1.0,
            },
          ],
        },
      ];

      const currentSnapshot = cloneTracks(tracks);
      set({
        projectTitle: 'Demo Neon Chill Medley',
        tracks: demoTracks,
        durationMs: 20000,
        currentTimeMs: 0,
        isLooping: true,
        history: [currentSnapshot, ...history].slice(0, 30),
        future: [],
        canUndo: true,
        canRedo: false,
      });
    } catch (err) {
      console.warn('Failed to load demo medley:', err);
    } finally {
      setIsProcessingAudio(false);
    }
  },

  loadProject: (project) => {
    audioEngine.stopTimeline();
    set({
      projectId: project.id,
      projectTitle: project.title,
      bpm: project.bpm,
      durationMs: project.durationMs,
      tracks: project.tracks,
      selectedTrackId: project.tracks[0]?.id || 'trk_01',
      currentTimeMs: 0,
      isPlaying: false,
    });
  },

  resetProject: () => {
    audioEngine.stopTimeline();
    set({
      projectId: null,
      projectTitle: 'New Melody Project',
      bpm: 120,
      durationMs: 30000,
      tracks: DEFAULT_TRACKS,
      selectedTrackId: 'trk_01',
      sourceTrackInfo: null,
      sourceAudioBuffer: null,
      currentTimeMs: 0,
      isPlaying: false,
    });
  },
}));
