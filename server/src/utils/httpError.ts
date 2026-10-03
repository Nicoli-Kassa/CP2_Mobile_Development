import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Erro com status HTTP e mensagem segura para devolver ao aplicativo. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Express 4 não captura rejeições de handlers `async`; este wrapper encaminha para o error handler. */
export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };
}
