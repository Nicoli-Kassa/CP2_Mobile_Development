import 'dotenv/config';

import app from './app';

/** Servidor HTTP comum: usado em `npm run dev` e em hospedagens Node tradicionais. */
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`CP2 Chat API ouvindo na porta ${PORT}`);
});
