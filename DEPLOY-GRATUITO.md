# Deploy Gratuito - Passo a Passo

## Arquitetura do Deploy
- **Frontend**: Vercel (gratuito)
- **Backend**: Render.com (gratuito com limitações)
- **Banco de Dados**: Supabase (PostgreSQL gratuito)

## PASSO 1: Configurar Banco de Dados no Supabase

### 1.1 Criar conta no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Clique em "Start your project"
3. Faça login com GitHub

### 1.2 Criar novo projeto
1. Clique em "New Project"
2. Preencha:
   - Name: `nawa-kanban`
   - Database Password: **ANOTE ESTA SENHA!**
   - Region: `South America (São Paulo)`
3. Clique em "Create new project" (demora ~2 minutos)

### 1.3 Pegar credenciais do banco
1. Vá em Settings > Database
2. Em "Connection string", copie a URI
3. Será algo como:
```
postgresql://postgres:[SUA-SENHA]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

### 1.4 Extrair as credenciais:
```
DB_HOST=db.xxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=[SUA-SENHA]
DB_NAME=postgres
```

## PASSO 2: Deploy do Backend no Render

### 2.1 Criar conta no Render
1. Acesse [render.com](https://render.com)
2. Clique em "Get Started for Free"
3. Faça login com GitHub

### 2.2 Conectar repositório
1. Clique em "New +" > "Web Service"
2. Conecte seu GitHub
3. Selecione o repositório `Nawa-Kanban`

### 2.3 Configurar o serviço
1. **Name**: `nawa-kanban-backend`
2. **Region**: `Oregon (US West)`
3. **Branch**: `main`
4. **Root Directory**: `backend`
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `npm run start:prod`

### 2.4 Adicionar variáveis de ambiente
Clique em "Advanced" e adicione:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=gere-uma-string-aleatoria-aqui-123456
DB_HOST=db.xxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=[SUA-SENHA-DO-SUPABASE]
DB_NAME=postgres
```

### 2.5 Criar o serviço
1. Clique em "Create Web Service"
2. Aguarde o build (~5-10 minutos)
3. Quando finalizar, copie a URL do serviço:
   - Será algo como: `https://nawa-kanban-backend.onrender.com`

## PASSO 3: Atualizar Frontend com URL do Backend

### 3.1 Editar arquivo de produção
No arquivo `frontend/src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://SEU-BACKEND.onrender.com'  // Coloque a URL do Render aqui
};
```

### 3.2 Fazer commit das mudanças
```bash
git add .
git commit -m "chore: configure production environment for deployment"
git push origin main
```

## PASSO 4: Deploy do Frontend no Vercel

### 4.1 Criar conta no Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Sign Up"
3. Faça login com GitHub

### 4.2 Importar projeto
1. Clique em "Add New..." > "Project"
2. Importe o repositório `Nawa-Kanban`

### 4.3 Configurar o projeto
1. **Framework Preset**: `Angular`
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist/frontend`
5. **Install Command**: `npm install`

### 4.4 Deploy
1. Clique em "Deploy"
2. Aguarde o build (~3-5 minutos)
3. Seu frontend estará disponível em:
   - `https://nawa-kanban.vercel.app`

## PASSO 5: Testar a Aplicação

### 5.1 Acessar o frontend
1. Abra `https://nawa-kanban.vercel.app`
2. Tente fazer login ou criar uma conta

### 5.2 Possíveis problemas

#### CORS Error
Se aparecer erro de CORS, no backend (`backend/src/main.ts`):
```typescript
app.enableCors({
  origin: ['https://nawa-kanban.vercel.app', 'http://localhost:4200'],
  credentials: true,
});
```

#### Banco não conecta
- Verifique as credenciais no Render
- No Supabase, vá em Settings > Database > Connection Pooling
- Use a "Connection string" do modo "Session"

## URLs Finais

- **Frontend**: https://nawa-kanban.vercel.app
- **Backend**: https://nawa-kanban-backend.onrender.com
- **API Docs**: https://nawa-kanban-backend.onrender.com/api/docs

## Limitações do Plano Gratuito

### Render (Backend)
- **Spin down**: Após 15 minutos sem uso, o servidor hiberna
- **Cold start**: Primeira requisição demora ~30 segundos
- **RAM**: 512 MB
- **CPU**: Compartilhada

### Supabase (Banco)
- **500 MB** de armazenamento
- **2 GB** de transferência/mês
- **Pausa após 1 semana** sem atividade

### Vercel (Frontend)
- **100 GB** de banda/mês
- Sem limitações significativas para projetos pequenos

## Dicas Importantes

1. **Mantenha ativo**: Acesse a aplicação semanalmente para evitar pausas
2. **Primeiro acesso lento**: Normal devido ao cold start do Render
3. **Monitoramento**: Use o dashboard do Render para ver logs
4. **Backup**: Faça backup dos dados importantes do Supabase

## Comandos Úteis

### Ver logs do backend
No dashboard do Render > Logs

### Atualizar deploy
```bash
git push origin main
```
Vercel e Render fazem deploy automático

### Testar localmente com prod
```bash
# Frontend
cd frontend
npm run build
npx http-server dist/frontend

# Backend
cd backend
npm run build
npm run start:prod
```