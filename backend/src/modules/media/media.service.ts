import ytsr from 'ytsr';
import ytdl from '@distube/ytdl-core';
import { Request, Response } from 'express';
import { SAMPLE_TRACKS } from './sampleAudio';
import { NotFoundError } from '../../utils/errors';

export class MediaService {
  async search(query: string) {
    const trimmed = query.trim().toLowerCase();

    // Check if matching internal samples first
    const matchingSamples = SAMPLE_TRACKS.filter(
      (s) => s.title.toLowerCase().includes(trimmed) || s.author.toLowerCase().includes(trimmed)
    ).map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      duration: s.duration,
      thumbnail: s.thumbnail,
      author: s.author,
    }));

    try {
      // Use ytsr to search YouTube without an API key
      const searchResults = await ytsr(query, { limit: 12 });
      const videoItems = searchResults.items.filter(
        (item): item is ytsr.Video => item.type === 'video'
      );

      const ytTracks = videoItems.map((v) => ({
        id: v.id,
        title: v.title,
        url: v.url,
        duration: v.duration || '0:00',
        thumbnail: v.bestThumbnail?.url || (v.thumbnails && v.thumbnails[0]?.url) || '',
        author: v.author?.name || 'YouTube Creator',
      }));

      return [...matchingSamples, ...ytTracks];
    } catch (error) {
      console.warn('YouTube search fallback to sample tracks:', error);
      // If external search fails (e.g. rate limit), return matching samples + all samples
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

    // 2. Handle YouTube Stream
    try {
      const cleanUrl = videoId.startsWith('http')
        ? videoId
        : `https://www.youtube.com/watch?v=${videoId}`;

      // Validate URL
      if (!ytdl.validateURL(cleanUrl) && !ytdl.validateID(videoId)) {
        throw new NotFoundError(`Invalid YouTube video ID or URL: ${videoId}`);
      }

      // Stream highest quality audio
      const audioStream = ytdl(cleanUrl, {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 25, // 32MB buffer
      });

      res.setHeader('Content-Type', 'audio/webm');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');

      audioStream.on('error', (err) => {
        console.error('ytdl stream error:', err);
        if (!res.headersSent) {
          res.status(502).json({
            status: 502,
            message: 'Failed to stream audio from YouTube',
            timestamp: new Date().toISOString(),
          });
        }
      });

      audioStream.pipe(res);
    } catch (error: any) {
      console.error('YouTube audio stream exception:', error);
      throw new NotFoundError(`Unable to resolve audio stream for '${videoId}'`);
    }
  }
}

export const mediaService = new MediaService();
