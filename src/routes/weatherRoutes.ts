import express from 'express';
import { weatherController } from '../controller/weatherController.js';

const router = express.Router();

router.post('/webhook', weatherController);

export default router;
