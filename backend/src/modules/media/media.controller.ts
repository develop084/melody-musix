import { Request, Response, NextFunction } from 'express';
import { mediaService } from './media.service';
import { BadRequestError } from '../../utils/errors';

export class MediaController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        throw new BadRequestError('Search query parameter "q" is required');
      }
      const results = await mediaService.search(query);
      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  }

  getSamples(_req: Request, res: Response, next: NextFunction) {
    try {
      const samples = mediaService.getSamples();
      res.status(200).json(samples);
    } catch (error) {
      next(error);
    }
  }

  async stream(req: Request, res: Response, next: NextFunction) {
    try {
      const videoId = req.query.videoId as string;
      if (!videoId) {
        throw new BadRequestError('Query parameter "videoId" is required');
      }
      await mediaService.streamAudio(videoId, req, res);
    } catch (error) {
      next(error);
    }
  }
}

export const mediaController = new MediaController();
