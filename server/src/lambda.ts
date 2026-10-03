import serverless from 'serverless-http';

import app from './app';

/**
 * Ponto de entrada na AWS Lambda.
 *
 * O API Gateway (HTTP API) recebe a requisição HTTPS e entrega o evento à
 * Lambda; o `serverless-http` converte esse evento em uma requisição do
 * Express e a resposta do Express de volta no formato do API Gateway.
 *
 * O Firebase Admin é inicializado uma vez por contêiner (ao importar `app`)
 * e reaproveitado nas próximas invocações.
 */
export const handler = serverless(app);
