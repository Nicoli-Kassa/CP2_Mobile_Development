// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Ignora as pastas de build nativo.
 *
 * Ao rodar `npx expo run:android` junto com o Metro, o Gradle cria e apaga
 * arquivos em `node_modules/<pacote>/android/build/` e em `android/build/`.
 * O watcher do Metro tenta observar diretórios que somem no meio do caminho
 * e derruba o servidor inteiro com `ENOENT: watch`.
 *
 * A regex cobre as duas barras porque no Windows os caminhos vêm com `\`.
 */
config.resolver.blockList = /[\\/]android[\\/](app[\\/])?(build|\.gradle|\.cxx)[\\/]/;

module.exports = config;
