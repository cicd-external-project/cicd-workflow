import express, { type Express, type Request, type Response } from 'express';

const app: Express = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'FlowCI Studio Node.js Scaffold' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export { app };
