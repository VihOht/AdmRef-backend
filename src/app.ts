import express from 'express';
import { mainRouter } from './routes'
import middlewares from './middlewares';


const app = express();

// Apply middlewares
app.use(express.json());
app.use(middlewares.jwtValidator);

app.use('/api', mainRouter);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

export default app;