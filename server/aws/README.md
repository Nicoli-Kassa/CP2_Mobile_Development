# API na AWS (alternativa ao Render)

A hospedagem principal da API é o Render (veja o [README principal](../../README.md#-api-online)). Esta pasta permite publicar **a mesma API** na AWS, usando **AWS Lambda** atrás de um **Amazon API Gateway (HTTP API)**, com a infraestrutura versionada em [`template.yaml`](template.yaml) (CloudFormation).

Diferente do plano gratuito do Render, a Lambda não "dorme": a primeira chamada depois de um tempo parado leva de 1 a 3 s. O custo sai dos créditos da AWS.

## Arquitetura na AWS

```text
App (Expo) ──HTTPS──► API Gateway HTTP API ──► Lambda cp2-chat-api (Express via serverless-http)
                      · rota $default                 │
                      · CORS (Expo Web)               ├─► Firebase Auth / Firestore / Realtime DB (Admin SDK)
                      · limite 20 req/s, pico 40      └─► Expo Push Service ─► FCM (Android) / APNs (iOS)
                                                      logs: CloudWatch /aws/lambda/cp2-chat-api (14 dias)
```

| Recurso (CloudFormation) | Função |
| --- | --- |
| `AWS::Lambda::Function` | Roda o mesmo app Express ([`lambda.ts`](../src/lambda.ts)); Node.js 22, 1024 MB, timeout 25 s. |
| `AWS::ApiGatewayV2::Api` + `Stage` + `Route` + `Integration` | URL HTTPS pública, rota coringa para a Lambda, CORS e limite de requisições (protege os créditos). |
| `AWS::Lambda::Permission` | Permite que só esse API Gateway invoque a Lambda. |
| `AWS::Logs::LogGroup` | Logs da API, guardados por 14 dias. |
| `AWS::IAM::Role` *(opcional)* | Role mínima (só logs). Não é criada no AWS Academy, onde a `LabRole` é usada. |

**Custo.** Com o uso de uma turma, a API fica dentro do nível gratuito da Lambda (1 milhão de requisições/mês) e consome centavos de API Gateway (US$ 1,00 por milhão de requisições), descontados dos créditos. Não há servidor ligado o tempo todo: a Lambda só cobra quando é chamada e **não "dorme"** como o plano gratuito de outras hospedagens. A primeira chamada depois de um tempo parado (cold start) leva de 1 a 3 s.

## Publicar a API na AWS

**Pré-requisitos:** Node.js 20+ e o [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html). Não é preciso instalar SAM, Docker nem nada além disso.

1. **Credenciais da AWS**
   - *Conta AWS com créditos (AWS Educate / promoção):* `aws configure` com uma chave de acesso de um usuário IAM, região `us-east-1`.
   - *AWS Academy Learner Lab:* clique em **Start Lab**, depois em **AWS Details → AWS CLI → Show** e cole o conteúdo em `~/.aws/credentials` (no Windows, `%USERPROFILE%\.aws\credentials`). Essas credenciais **expiram ao fim de cada sessão**; repita o passo antes de cada deploy.
2. **Conta de serviço do Firebase:** gere a chave JSON (Firebase Console → ⚙ Configurações do projeto → Contas de serviço → Gerar nova chave privada) e salve **fora do repositório**.
3. **Configuração do deploy:**

   ```bash
   cd server
   npm install
   cp .env.example .env
   # edite server/.env:
   #   FIREBASE_SERVICE_ACCOUNT_FILE=C:/chaves/cp2-chat-api.json   (ou ~/chaves/cp2-chat-api.json)
   #   FIREBASE_DATABASE_URL=https://<project-id>-default-rtdb.firebaseio.com
   ```

4. **Publicar:**

   ```bash
   npm run deploy:aws
   ```

   O script ([`server/scripts/aws.mjs`](../scripts/aws.mjs)):
   1. confere o AWS CLI e as credenciais;
   2. escolhe a role da Lambda: `LAMBDA_ROLE_ARN`, se definida; senão a **`LabRole`** quando detecta o AWS Academy (que não permite criar roles); senão uma role mínima criada pelo template;
   3. compila o TypeScript e monta o pacote só com as dependências de produção (~14 MB compactado);
   4. cria um bucket S3 privado para o pacote e roda `aws cloudformation package` + `aws cloudformation deploy`;
   5. grava a URL da API em `app.json` → `expo.extra.apiUrl` e chama o `/health`.

   Para atualizar a API depois de mudar o código, rode o mesmo comando.

5. Faça o commit do `app.json` com a URL nova e gere o build do app.

**Remover tudo** (para de consumir créditos): `npm run destroy:aws`.

**Logs:** CloudWatch → *Log groups* → `/aws/lambda/cp2-chat-api`, ou `aws logs tail /aws/lambda/cp2-chat-api --follow`.

> **AWS Academy Learner Lab.** O laboratório só permite `us-east-1` e `us-west-2`. Ao fim da sessão a AWS desliga instâncias EC2, mas funções Lambda e o API Gateway não são instâncias e continuam publicados. Mesmo assim, depois de encerrar uma sessão, abra o `/health` para confirmar que a API responde antes de entregar.

## Variáveis de ambiente da Lambda (somente os nomes)

Preenchidas pelo script como parâmetros `NoEcho` do CloudFormation. Não aparecem nos eventos nem nas saídas da stack e ficam criptografadas em repouso na Lambda (KMS).

| Variável | Conteúdo |
| --- | --- |
| `FIREBASE_PROJECT_ID` | ID do projeto |
| `FIREBASE_CLIENT_EMAIL` | E-mail da conta de serviço |
| `FIREBASE_PRIVATE_KEY` | Chave privada da conta de serviço (**só na Lambda**) |
| `FIREBASE_DATABASE_URL` | URL do Realtime Database |
| `EXPO_ACCESS_TOKEN` | Opcional: token do Expo, se "Enhanced Security for Push" estiver ativo |
