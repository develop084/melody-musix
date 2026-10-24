import { Router } from 'express';
import { mediaController } from './media.controller';

const router = Router();

router.get('/search', mediaController.search.bind(mediaController));
router.get('/samples', mediaController.getSamples.bind(mediaController));
router.get('/stream', mediaController.stream.bind(mediaController));

export const mediaRouter = router;
