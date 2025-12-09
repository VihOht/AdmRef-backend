/**
 * Initialize and configure the Express application.
 * Applies necessary middlewares and sets up the main API routes.
 */


import express from 'express';
import { mainRouter } from './routes'
import middlewares from './middlewares';
import cors from 'cors';

const app = express();

// Apply middlewares
app.use(express.json());
app.use(middlewares.jwtValidator);
app.use(cors());

app.use('/api', mainRouter);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

export default app;