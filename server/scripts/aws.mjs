#!/usr/bin/env node
/**
 * Publica (ou remove) a API na AWS: Lambda + API Gateway HTTP API.
 *
 *   npm run deploy:aws     compila, empacota e cria/atualiza a stack do CloudFormation
 *   npm run destroy:aws    apaga a stack (para de consumir créditos)
 *
 * Pré-requisitos: Node 20+, AWS CLI v2 configurado (`aws configure` ou as
 * credenciais do AWS Academy em ~/.aws/credentials).
 *
 * Configuração (variáveis de ambiente ou arquivo server/.env, nunca versionado):
 *   FIREBASE_SERVICE_ACCOUNT_FILE  caminho do JSON da conta de serviço  (ou as 3 abaixo)
 *   FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 *   FIREBASE_DATABASE_URL          obrigatório
 *   EXPO_ACCESS_TOKEN              opcional
 *   AWS_REGION                     padrão us-east-1
 *   STACK_NAME                     padrão cp2-chat-api
 *   LAMBDA_ROLE_ARN                opcional; se vazio, usa a LabRole quando existir (AWS Academy)
 *                                  ou deixa o template criar uma role mínima
 *
 * Os comandos são executados com argumentos separados (sem shell), então a
 * chave privada não passa por nenhuma interpretação de aspas ou espaços.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_DIR = path.resolve(SERVER_DIR, '..');
const DEPLOY_DIR = path.join(SERVER_DIR, '.deploy');
const LAMBDA_DIR = path.join(DEPLOY_DIR, 'lambda');
const TEMPLATE = path.join(SERVER_DIR, 'aws', 'template.yaml');
const PACKAGED_TEMPLATE = path.join(DEPLOY_DIR, 'packaged.yaml');
const APP_JSON = path.join(REPO_DIR, 'app.json');

dotenv.config({ path: path.join(SERVER_DIR, '.env') });

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const STACK_NAME = process.env.STACK_NAME || 'cp2-chat-api';
const IS_WINDOWS = process.platform === 'win32';

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function step(message) {
  console.log(`\n▶ ${message}`);
}

/** Executa um comando e devolve a saída; `allowFailure` devolve null em vez de abortar. */
function run(command, args, { cwd = SERVER_DIR, capture = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    // npm é um .cmd no Windows e precisa do shell; o AWS CLI é um .exe e não precisa.
    shell: IS_WINDOWS && command === 'npm',
  });
  if (result.error) {
    if (allowFailure) return null;
    fail(`Não foi possível executar "${command}": ${result.error.message}`);
  }
  if (result.status !== 0) {
    if (allowFailure) return null;
    if (capture && result.stderr) console.error(result.stderr.trim());
    fail(`"${command} ${args[0] ?? ''}" terminou com erro (código ${result.status}).`);
  }
  return capture ? result.stdout.trim() : '';
}

function aws(args, options) {
  return run('aws', [...args, '--region', REGION], options);
}

function awsJson(args, options) {
  const output = aws([...args, '--output', 'json'], { ...options, capture: true });
  return output === null ? null : JSON.parse(output);
}

function readFirebaseCredentials() {
  let projectId = process.env.FIREBASE_PROJECT_ID;
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  if (serviceAccountFile) {
    const file = path.resolve(SERVER_DIR, serviceAccountFile);
    if (!existsSync(file)) fail(`Arquivo da conta de serviço não encontrado: ${file}`);
    const account = JSON.parse(readFileSync(file, 'utf8'));
    projectId = account.project_id;
    clientEmail = account.client_email;
    privateKey = account.private_key;
  }

  const databaseUrl = process.env.FIREBASE_DATABASE_URL;
  const missing = Object.entries({
    FIREBASE_PROJECT_ID: projectId,
    FIREBASE_CLIENT_EMAIL: clientEmail,
    FIREBASE_PRIVATE_KEY: privateKey,
    FIREBASE_DATABASE_URL: databaseUrl,
  })
    .filter(([, value]) => !value || value.trim().length === 0 || value.includes('CONFIGURAR'))
    .map(([key]) => key);
  if (missing.length > 0) {
    fail(
      `Faltam credenciais do Firebase: ${missing.join(', ')}.\n` +
        '  Defina FIREBASE_SERVICE_ACCOUNT_FILE + FIREBASE_DATABASE_URL em server/.env (veja server/.env.example).',
    );
  }

  return {
    projectId,
    clientEmail,
    // Uma linha só: a API converte `\n` literal de volta em quebra de linha.
    privateKey: privateKey.replace(/\r?\n/g, '\\n'),
    databaseUrl: databaseUrl.trim(),
    expoAccessToken: process.env.EXPO_ACCESS_TOKEN?.trim() ?? '',
  };
}

function checkAwsCli() {
  const version = run('aws', ['--version'], { capture: true, allowFailure: true });
  if (version === null) {
    fail('AWS CLI não encontrado. Instale a versão 2: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html');
  }
  const identity = awsJson(['sts', 'get-caller-identity'], { allowFailure: true });
  if (!identity) {
    fail(
      'Credenciais da AWS inválidas ou expiradas.\n' +
        '  Conta comum: rode `aws configure`.\n' +
        '  AWS Academy: Learner Lab → AWS Details → AWS CLI → copie para ~/.aws/credentials (expiram a cada sessão).',
    );
  }
  console.log(`  Conta ${identity.Account} · região ${REGION} · ${identity.Arn}`);
  return identity.Account;
}

/** LAMBDA_ROLE_ARN explícito > LabRole do AWS Academy > role criada pelo template. */
function resolveLambdaRole() {
  if (process.env.LAMBDA_ROLE_ARN) {
    console.log(`  Role da Lambda: ${process.env.LAMBDA_ROLE_ARN}`);
    return process.env.LAMBDA_ROLE_ARN;
  }
  const labRole = awsJson(['iam', 'get-role', '--role-name', 'LabRole'], { allowFailure: true });
  if (labRole?.Role?.Arn) {
    console.log(`  AWS Academy detectado: usando ${labRole.Role.Arn}`);
    return labRole.Role.Arn;
  }
  console.log('  Role da Lambda: criada pelo template (somente logs no CloudWatch)');
  return '';
}

function buildLambdaPackage() {
  step('Compilando a API (TypeScript → dist/)');
  rmSync(path.join(SERVER_DIR, 'dist'), { recursive: true, force: true });
  run('npm', ['run', 'build']);

  step('Montando o pacote da Lambda (somente dependências de produção)');
  rmSync(DEPLOY_DIR, { recursive: true, force: true });
  mkdirSync(LAMBDA_DIR, { recursive: true });
  cpSync(path.join(SERVER_DIR, 'dist'), path.join(LAMBDA_DIR, 'dist'), { recursive: true });
  for (const file of ['package.json', 'package-lock.json']) {
    cpSync(path.join(SERVER_DIR, file), path.join(LAMBDA_DIR, file));
  }
  run('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: LAMBDA_DIR });
}

function ensureArtifactBucket(accountId) {
  const bucket = `${STACK_NAME}-artifacts-${accountId}-${REGION}`;
  const exists = aws(['s3api', 'head-bucket', '--bucket', bucket], { capture: true, allowFailure: true });
  if (exists === null) {
    step(`Criando o bucket S3 de artefatos ${bucket}`);
    aws(['s3', 'mb', `s3://${bucket}`]);
  }
  return bucket;
}

/** Troca só o valor de `expo.extra.apiUrl`, preservando a formatação do app.json. */
function updateAppJson(apiUrl) {
  const text = readFileSync(APP_JSON, 'utf8');
  const pattern = /("apiUrl"\s*:\s*)"[^"]*"/;
  if (!pattern.test(text)) {
    console.log(`  ⚠ "apiUrl" não encontrado no app.json. Configure expo.extra.apiUrl = ${apiUrl}`);
    return;
  }
  writeFileSync(APP_JSON, text.replace(pattern, `$1${JSON.stringify(apiUrl)}`));
  console.log(`  app.json → expo.extra.apiUrl = ${apiUrl}`);
}

async function checkHealth(healthUrl) {
  step(`Health check: ${healthUrl}`);
  try {
    const response = await fetch(healthUrl);
    const body = await response.text();
    console.log(`  HTTP ${response.status} ${body}`);
    if (response.status !== 200) {
      console.log('  ⚠ A API respondeu, mas o Firebase Admin não inicializou. Confira as credenciais e os logs.');
    }
  } catch (error) {
    console.log(`  ⚠ Não foi possível chamar o health check agora (${error.message}). Tente em alguns segundos.`);
  }
}

async function deploy() {
  const firebase = readFirebaseCredentials();

  step('Verificando a AWS CLI e as credenciais');
  const accountId = checkAwsCli();
  const roleArn = resolveLambdaRole();

  buildLambdaPackage();
  const bucket = ensureArtifactBucket(accountId);

  step('Enviando o pacote para o S3 (aws cloudformation package)');
  aws([
    'cloudformation', 'package',
    '--template-file', TEMPLATE,
    '--s3-bucket', bucket,
    '--s3-prefix', STACK_NAME,
    '--output-template-file', PACKAGED_TEMPLATE,
  ]);

  step(`Criando/atualizando a stack ${STACK_NAME} (aws cloudformation deploy)`);
  aws([
    'cloudformation', 'deploy',
    '--stack-name', STACK_NAME,
    '--template-file', PACKAGED_TEMPLATE,
    '--capabilities', 'CAPABILITY_IAM',
    '--no-fail-on-empty-changeset',
    '--parameter-overrides',
    `FirebaseProjectId=${firebase.projectId}`,
    `FirebaseClientEmail=${firebase.clientEmail}`,
    `FirebasePrivateKey=${firebase.privateKey}`,
    `FirebaseDatabaseUrl=${firebase.databaseUrl}`,
    `ExpoAccessToken=${firebase.expoAccessToken}`,
    `LambdaRoleArn=${roleArn}`,
  ]);

  const stack = awsJson(['cloudformation', 'describe-stacks', '--stack-name', STACK_NAME]);
  const outputs = Object.fromEntries(stack.Stacks[0].Outputs.map((o) => [o.OutputKey, o.OutputValue]));

  step('Configurando o aplicativo');
  updateAppJson(outputs.ApiUrl);

  await checkHealth(outputs.HealthUrl);

  console.log(`\n✔ API publicada: ${outputs.ApiUrl}`);
  console.log(`  Logs: CloudWatch → /aws/lambda/${outputs.FunctionName}  (ou: aws logs tail /aws/lambda/${outputs.FunctionName} --follow --region ${REGION})`);
}

function destroy() {
  step('Verificando a AWS CLI e as credenciais');
  const accountId = checkAwsCli();

  step(`Apagando a stack ${STACK_NAME}`);
  aws(['cloudformation', 'delete-stack', '--stack-name', STACK_NAME]);
  aws(['cloudformation', 'wait', 'stack-delete-complete', '--stack-name', STACK_NAME]);

  const bucket = `${STACK_NAME}-artifacts-${accountId}-${REGION}`;
  if (aws(['s3api', 'head-bucket', '--bucket', bucket], { capture: true, allowFailure: true }) !== null) {
    step(`Apagando o bucket de artefatos ${bucket}`);
    aws(['s3', 'rb', `s3://${bucket}`, '--force']);
  }
  console.log('\n✔ Recursos da API removidos da AWS.');
}

const command = process.argv[2];
if (command === 'deploy') {
  await deploy();
} else if (command === 'destroy') {
  destroy();
} else {
  fail('Uso: node scripts/aws.mjs <deploy|destroy>');
}
