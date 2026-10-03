import express, { type NextFunction, type Request, type Response } from 'express';

import { authenticate } from './middleware/authenticate';
import groupsRouter from './routes/groups';
import notificationsRouter from './routes/notifications';
import usersRouter from './routes/users';
import { initializeFirebaseAdmin, isFirebaseAdminReady, missingAdminEnv } from './services/firebaseAdmin';
import { HttpError } from './utils/httpError';

/**
 * Aplicação Express da API, sem `listen()`.
 *
 * Ela é usada por dois pontos de entrada:
 *  - `lambda.ts`: AWS Lambda atrás do API Gateway (produção);
 *  - `server.ts`: servidor HTTP comum (testes locais ou qualquer hospedagem Node).
 */
const app = express();

// O API Gateway (ou outro proxy reverso) termina o HTTPS antes da API.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

if (!initializeFirebaseAdmin() && missingAdminEnv().length > 0) {
  console.error(`Firebase Admin não configurado. Variáveis ausentes: ${missingAdminEnv().join(', ')}`);
}

app.get('/', (_req: Request, res: Response) => {
  res.json({ service: 'cp2-chat-api', health: '/health' });
});

/** Health check público usado para verificar a disponibilidade da API. */
app.get('/health', (_req: Request, res: Response) => {
  const ready = isFirebaseAdminReady();
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    firebase: ready ? 'ready' : 'not-configured',
    timestamp: Date.now(),
  });
});

app.use('/notifications', authenticate, notificationsRouter);
app.use('/users', authenticate, usersRouter);
app.use('/groups', authenticate, groupsRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Nunca devolve stack trace ou detalhes internos ao aplicativo.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: 'JSON inválido.' });
    return;
  }
  console.error('Erro não tratado:', error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

export default app;
