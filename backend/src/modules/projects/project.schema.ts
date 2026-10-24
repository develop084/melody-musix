import { z } from 'zod';

const audioClipSchema = z.object({
  id: z.string(),
  sourceUrl: z.string(),
  sourceTitle: z.string(),
  startOffsetMs: z.number().nonnegative(),
  durationMs: z.number().positive(),
  timelineStartMs: z.number().nonnegative(),
  fadeInMs: z.number().default(150),
  fadeOutMs: z.number().default(150),
  volume: z.number().min(0).max(2).default(1.0),
});

const trackSchema = z.object({
  id: z.string(),
  name: z.string(),
  volume: z.number().min(0).max(2).default(1.0),
  muted: z.boolean().default(false),
  solo: z.boolean().default(false),
  clips: z.array(audioClipSchema),
});

export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  bpm: z.number().min(40).max(300).default(120),
  durationMs: z.number().min(1000).max(600000).default(60000),
  tracks: z.array(trackSchema),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
