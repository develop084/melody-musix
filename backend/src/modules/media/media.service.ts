import ytsr from 'ytsr';
import { spawn } from 'child_process';
import fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Ytdl, Client, parseVideoId, chooseFormat } = require('@distube/ytdl-core');
import { Request, Response } from 'express';
import { SAMPLE_TRACKS } from './sampleAudio';
import { NotFoundError } from '../../utils/errors';

import path from 'path';

function getYtDlpPath(): string | null {
  const candidates = [
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    '/home/ubuntu/.local/bin/yt-dlp',
    '/tmp/bin/yt-dlp',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        fs.accessSync(c, fs.constants.X_OK);
      } catch {
        try {
          fs.chmodSync(c, 0o755);
        } catch {}
      }
      return c;
    }
  }
  return null;
}

function getCookiesPath(): string | null {
  const candidates = [
    process.env.YOUTUBE_COOKIES_PATH,
    '/var/www/melody-studio/cookies.txt',
    path.resolve(process.cwd(), 'cookies.txt'),
    path.resolve(__dirname, '../../../../cookies.txt'),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

const ytdlClient = new Ytdl({
  cookie: process.env.YOUTUBE_COOKIE || undefined,
  clients: [Client.WebEmbedded, Client.Tv, Client.VisionOS, Client.Mweb],
});
const infoCache = new Map<string, { info: any; timestamp: number }>();

async function getCachedInfo(id: string): Promise<any> {
  const cached = infoCache.get(id);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
    return cached.info;
  }
  const info = await ytdlClient.getInfo(id);
  infoCache.set(id, { info, timestamp: Date.now() });
  return info;
}

export class MediaService {
  async search(query: string) {
    const trimmed = query.trim();

    // Check if user entered a direct YouTube URL or 11-char video ID
    const directVideoId = parseVideoId(trimmed);
    if (directVideoId) {
      try {
        const info = await getCachedInfo(directVideoId);
        const seconds = parseInt(info.videoDetails.lengthSeconds || '0', 10);
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toString().padStart(2, '0');

        const id = info.videoDetails.id || directVideoId;
        return [
          {
            id,
            title: info.videoDetails.title,
            url: `/api/v1/media/stream?videoId=${id}`,
            duration: `${mins}:${secs}`,
            thumbnail: info.videoDetails.thumbnails?.[0]?.url || '',
            author: info.videoDetails.author?.name || 'YouTube Creator',
          },
        ];
      } catch (err) {
        console.warn('Direct video ID lookup failed, continuing to search:', err);
      }
    }

    // Check if matching internal samples first
    const lower = trimmed.toLowerCase();
    const matchingSamples = SAMPLE_TRACKS.filter(
      (s) => s.title.toLowerCase().includes(lower) || s.author.toLowerCase().includes(lower)
    ).map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      duration: s.duration,
      thumbnail: s.thumbnail,
      author: s.author,
    }));

    try {
      // 1. Try native ytdl search first (clean, fast, no scraping parser warnings)
      const results = await ytdlClient.search(trimmed);
      if (Array.isArray(results) && results.length > 0) {
        const ytTracks = results.slice(0, 15).map((v: any) => {
          const seconds = parseInt(v.lengthSeconds || '0', 10);
          const mins = Math.floor(seconds / 60);
          const secs = (seconds % 60).toString().padStart(2, '0');
          return {
            id: v.id,
            title: v.title,
            url: `/api/v1/media/stream?videoId=${v.id}`,
            duration: seconds > 0 ? `${mins}:${secs}` : 'Live/Unknown',
            thumbnail: v.thumbnails?.[0]?.url || '',
            author: v.author?.name || 'YouTube Creator',
          };
        });
        return [...matchingSamples, ...ytTracks];
      }
    } catch (ytdlSearchErr) {
      console.warn('ytdl search failed, attempting fallback to ytsr:', ytdlSearchErr);
    }

    try {
      // 2. Fallback to ytsr
      const searchResults = await ytsr(trimmed, { limit: 12 });
      const videoItems = searchResults.items.filter(
        (item): item is ytsr.Video => item.type === 'video'
      );

      const ytTracks = videoItems.map((v) => ({
        id: v.id,
        title: v.title,
        url: `/api/v1/media/stream?videoId=${v.id}`,
        duration: v.duration || '0:00',
        thumbnail: v.bestThumbnail?.url || (v.thumbnails && v.thumbnails[0]?.url) || '',
        author: v.author?.name || 'YouTube Creator',
      }));

      return [...matchingSamples, ...ytTracks];
    } catch (error) {
      console.warn('YouTube search fallback to sample tracks:', error);
      return matchingSamples.length > 0 ? matchingSamples : this.getSamples();
    }
  }

  getSamples() {
    return SAMPLE_TRACKS.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      duration: s.duration,
      thumbnail: s.thumbnail,
      author: s.author,
    }));
  }

  async streamAudio(videoId: string, req: Request, res: Response) {
    // 1. Handle Built-in Sample Track
    if (videoId.startsWith('sample-')) {
      const sample = SAMPLE_TRACKS.find((s) => s.id === videoId);
      if (!sample) {
        throw new NotFoundError(`Sample audio '${videoId}' not found`);
      }

      const buffer = sample.generate();
      const totalSize = buffer.length;

      // Handle Range Request
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        const chunk = buffer.subarray(start, end + 1);

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunk.length,
          'Content-Type': 'audio/wav',
          'Access-Control-Allow-Origin': '*',
        });
        return res.end(chunk);
      }

      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(buffer);
    }

    const id = parseVideoId(videoId) || videoId;

    // 2. Primary Method: yt-dlp native extraction (Immune to cloud/datacenter IP blocking)
    const ytDlpBinary = getYtDlpPath();
    if (ytDlpBinary) {
      try {
        const videoUrl = `https://www.youtube.com/watch?v=${id}`;

        const cookieFile = getCookiesPath();
        const ytDlpArgs = [
          '-f', 'ba/b',
          '--no-playlist',
          '--no-warnings',
          '-o', '-',
          videoUrl,
        ];

        if (cookieFile) {
          ytDlpArgs.unshift('--cookies', cookieFile);
        } else {
          ytDlpArgs.unshift('--extractor-args', 'youtube:player_client=android,ios,mweb');
        }

        const env = {
          ...process.env,
          PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
        };

        const proc = spawn(ytDlpBinary, ytDlpArgs, { env });

        let hasData = false;
        let stderrData = '';

        proc.stdout.on('data', (chunk) => {
          if (!hasData) {
            hasData = true;
            res.setHeader('Content-Type', 'audio/webm');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Accept-Ranges', 'bytes');
          }
          res.write(chunk);
        });

        proc.stderr.on('data', (chunk) => {
          stderrData += chunk.toString();
        });

        proc.stdout.on('end', () => {
          if (hasData) {
            res.end();
          }
        });

        proc.on('error', (err) => {
          console.warn('yt-dlp error, attempting ytdl fallback:', err);
          if (!hasData && !res.headersSent) {
            this.streamWithYtdl(id, req, res);
          }
        });

        proc.on('close', (code) => {
          if (!hasData) {
            console.warn(`yt-dlp closed with code ${code} without data. Stderr: ${stderrData.slice(-500)}`);
            if (!res.headersSent) {
              this.streamWithYtdl(id, req, res);
            }
          }
        });

        req.on('close', () => {
          if (!proc.killed) {
            try {
              proc.kill('SIGKILL');
            } catch {}
          }
        });

        return;
      } catch (ytDlpErr) {
        console.warn('yt-dlp failed, falling back to ytdl:', ytDlpErr);
      }
    }

    // 3. Fallback Method: @distube/ytdl-core
    await this.streamWithYtdl(id, req, res);
  }

  private async streamWithYtdl(id: string, _req: Request, res: Response) {
    try {
      let format: any;
      let info: any;
      try {
        info = await getCachedInfo(id);
        format = chooseFormat(info.formats, {
          filter: { hasAudio: true, hasVideo: false },
          quality: 'highestaudio',
        });
      } catch (infoErr) {
        console.warn('Could not pre-fetch info format, downloading directly:', infoErr);
      }

      const mimeType = format?.mimeType?.split(';')[0] || 'audio/mp4';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      if (format?.contentLength) {
        res.setHeader('Content-Length', format.contentLength);
      }

      const audioStream = info
        ? ytdlClient.download(info, {
            filter: { hasAudio: true, hasVideo: false },
            quality: 'highestaudio',
            ...(format ? { format } : {}),
          })
        : ytdlClient.download(id, {
            filter: { hasAudio: true, hasVideo: false },
            quality: 'highestaudio',
          });

      audioStream.on('error', (err: any) => {
        console.error('ytdl stream error:', err?.message || err);
        if (!res.headersSent) {
          res.status(502).json({
            status: 502,
            message: err?.message || 'Failed to stream audio from YouTube',
            timestamp: new Date().toISOString(),
          });
        }
      });

      audioStream.pipe(res);
    } catch (error: any) {
      console.error('YouTube audio stream exception:', error);
      throw new NotFoundError(`Unable to resolve audio stream for '${id}'`);
    }
  }
}

export const mediaService = new MediaService();
