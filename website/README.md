# TTK VIDEO MIXER — Website

Landing page, cadastro, quiz de onboarding gamificado, diagnóstico de perfil e download do aplicativo desktop TTK
VIDEO MIXER. É um projeto Next.js **independente** dentro do mesmo repositório do app desktop (`../`), mas conectado
ao **mesmo** projeto Supabase — mesma tabela de usuários, mesmo trial de 27 vídeos, mesma assinatura. Nenhum sistema
de contas paralelo foi criado.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS · Framer Motion · `@supabase/ssr` ·
canvas-confetti · Vitest (lógica pura) · Playwright (E2E).

## Como isso se conecta ao resto do projeto

- **Autenticação e trial**: usa o mesmo Supabase Auth do desktop (`@supabase/supabase-js` + `@supabase/ssr` para
  cookies de sessão no Next.js). Uma conta criada no site funciona exatamente igual dentro do aplicativo desktop, e
  vice-versa — mesmo `auth.users`, mesmo gatilho `handle_new_user()`, mesma tabela `entitlements`.
- **Schema novo, mesmo projeto**: a migration `../supabase/migrations/20260908000000_website_onboarding.sql`
  adiciona apenas o que o site precisa (`creator_onboarding`, `marketing_leads`, `support_tickets`,
  `analytics_events`) sem alterar nada do schema comercial existente do desktop.
- **Licença exibida no site**: a página de resultado do quiz chama a mesma função `resolve_entitlement()` (RPC do
  Postgres) que o desktop e a Edge Function `get-entitlement` usam — nunca inventa ou cacheia o número de vídeos
  grátis restantes.
- **Download**: resolve a release estável mais recente do repositório GitHub do app desktop (`GITHUB_REPOSITORY`).
  Não inventa links — se não houver uma build publicada para uma plataforma, o botão mostra "Em breve" e explica por
  quê, em vez de apontar para um arquivo inexistente.

## Painel administrativo (`/admin`)

Painel completo para operar o negócio — usuários, assinaturas, pagamentos, receita/MRR/churn, quem não renovou,
bloqueio de contas, bônus de acesso, dispositivos, funil, aquisição, downloads, atividade, insights do quiz, suporte,
webhooks, saúde do sistema e audit log. Está sobre o **mesmo** banco do desktop e do site — nenhuma tabela ou
autenticação paralela.

### Como isso funciona

- **Autoridade única**: `public._compute_entitlement(user_id)` (em
  `../supabase/migrations/20260910000000_admin_panel.sql`) é a ÚNICA função que decide se alguém pode gerar vídeos.
  `resolve_entitlement()` (desktop/site, sempre a própria conta) e `admin_resolve_entitlement()` (admin, qualquer
  conta) são só wrappers finos dela. Prioridade: **bloqueado** > **bônus admin ativo** > **assinatura ativa** > **trial +
  créditos bônus** > nenhum acesso. A especificação testada dessa prioridade está em
  `src/lib/entitlementEngine.ts`/`.test.ts` (não pude rodar a versão SQL contra um Postgres real neste ambiente — ver
  seção de testes).
- **Leitura**: cada tabela relevante ganhou uma policy adicional de RLS (`is_staff()`) — quem tem
  `role` `support`/`admin`/`super_admin` em `profiles` enxerga todas as linhas; um usuário comum continua vendo só as
  próprias. As rotas `/api/admin/**` fazem consultas normais do PostgREST usando a sessão do próprio admin (nunca a
  service role key).
- **Escrita**: bloquear, desbloquear, conceder bônus, resetar trial, revogar dispositivo, notas, tags e troca de
  cargo são funções `SECURITY DEFINER` que reconferem o cargo do chamador a partir de `profiles.role` (nunca confiam
  no client) e gravam uma linha em `admin_audit_log` na MESMA transação — uma ação sensível nunca acontece sem log.
- **Pagar.me e revogação de sessão**: as únicas operações que realmente precisam da secret key da Pagar.me ou da
  service role do Supabase (cancelar/reativar/reconciliar assinatura, reembolsar, reprocessar webhook, checagem de
  saúde) ficam concentradas na Edge Function `admin-actions` — o site nunca guarda essas chaves.
- **Tempo real**: a tabela `entitlements` está na publicação `supabase_realtime`; o desktop assina as mudanças da
  própria linha (`src/main/auth/realtime.ts`) e atualiza a licença em segundos após uma ação do admin, sem esperar o
  heartbeat de 12 minutos.

### Papéis (roles)

`user` (padrão, nenhum acesso admin) · `support` (visualização + notas) · `admin` (usuários, trials, assinaturas,
bônus, relatórios) · `super_admin` (tudo, incluindo excluir conta e gerenciar outros admins).

**Não existe cadastro público de admin.** O primeiro `super_admin` é criado localmente:

```bash
# nunca coloque estas duas variáveis em .env.local — exporte só nesta sessão de terminal
export SUPABASE_URL=https://SEU-PROJETO.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=xxxxx
npm run admin:promote -- dono@example.com
```

A partir daí, um `admin`/`super_admin` pode promover `support`/`admin` pela própria tela `/admin/admins` — mas nunca
para `super_admin` (só o script acima faz isso).

### Segurança

- **2FA obrigatório**: `/admin` exige um segundo fator (TOTP, via `supabase.auth.mfa`, recurso nativo do Supabase
  Auth) antes de mostrar qualquer dado — sem fator configurado, a conta é levada a `/admin/security` para configurar
  na primeira vez.
- Ações destrutivas (bloquear, excluir conta) sempre exigem um motivo digitado; excluir conta exige digitar
  "EXCLUIR" para confirmar.
- Exclusão de conta é sempre soft-delete (`profiles.deleted_at`) — nunca apaga registros financeiros.
- Refund em massa não existe por padrão — reembolso só individual, na tela de Pagamentos, com confirmação.
- PII é parcialmente mascarada (e-mail) na página de um usuário quando o cargo do visitante é `support`.

### Testes

```bash
npm test    # inclui a especificação testada da prioridade de entitlement (bloqueado > bônus > assinatura > trial)
npm run test:e2e   # inclui o gate de autenticação do /admin (redireciona para /login quando deslogado)
```

Não há um projeto Supabase real neste ambiente de desenvolvimento, então o fluxo autenticado completo (logar como
admin, ver o dashboard, bloquear um usuário e ver a licença mudar) não pôde ser testado ponta a ponta aqui — apenas
verificado para falhar de forma honesta (nunca quebrar, nunca fingir sucesso) sem as credenciais.

## Configuração

```bash
cp .env.example .env.local
```

Preencha pelo menos:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — os MESMOS valores públicos já usados pelo app
  desktop (veja `../.env.example`). Sem isso, login/cadastro/quiz mostram um aviso honesto de "não configurado" em
  vez de quebrar a build.
- `GITHUB_REPOSITORY` (formato `dono/repositorio`) — necessário para os botões de download funcionarem em produção.
- `DEV_LOCAL_WINDOWS_INSTALLER_PATH=../release` — **apenas desenvolvimento**: serve o instalador Windows que
  `npm run dist` já gera em `../release`, para poder testar o fluxo de download sem precisar de uma release real no
  GitHub. É automaticamente desativado quando `NODE_ENV=production`.

## Rodar localmente

```bash
npm install
npm run dev
```

## Testes

```bash
npm test              # lógica pura: cálculo de combinações, engine de diagnóstico do quiz, matching de assets do GitHub Releases
npx playwright install chromium
npm run test:e2e      # navegação real: landing, calculadora, FAQ, menu mobile, download, gates de autenticação
```

## Build

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploy

Recomendado: Vercel, apontando o "Root Directory" do projeto para `website/`. Configure as mesmas variáveis de
`.env.example` como Environment Variables do projeto na Vercel (nunca a `SUPABASE_SERVICE_ROLE_KEY` — o site não
precisa e não deve receber essa chave).

## Publicar uma nova versão do desktop (para os botões de Download funcionarem)

O workflow `../.github/workflows/release-desktop.yml` builda o instalador Windows e o `.dmg` do macOS e publica
ambos numa GitHub Release sempre que uma tag `v*` é enviada ao repositório:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Assim que a Release existir, `/download` passa a resolver os arquivos reais automaticamente — nada precisa ser
alterado no site.
