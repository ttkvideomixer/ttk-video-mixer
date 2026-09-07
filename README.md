# TTK Video Mixer

Aplicativo desktop para Windows (e, em breve, macOS) que gera automaticamente centenas ou milhares de vídeos combinando três grupos de clipes:

```
GANCHO + CORPO + CTA = VÍDEO FINAL
```

Se você adicionar 10 Ganchos, 10 Corpos e 10 CTAs, o Video Mixer gera as 10 × 10 × 10 = 1.000 combinações únicas automaticamente, com todo o processamento de vídeo (FFmpeg) rodando localmente no seu computador — nenhum arquivo é enviado para a internet.

## O que o programa faz

1. Você importa vídeos nas três categorias: Ganchos, Corpos e CTAs (arquivos individuais ou uma pasta inteira).
2. O app calcula e mostra em tempo real quantas combinações serão geradas.
3. Você escolhe a pasta de destino e as configurações de exportação (resolução, FPS, transição, etc).
4. Ao clicar em "Gerar Vídeos", o app processa a fila de combinações usando FFmpeg, com controle de quantos processos rodam ao mesmo tempo, barra de progresso, pausa/retomada, cancelamento e nova tentativa em caso de erro.

## Funções avançadas (textos, variação criativa, preview obrigatório)

Além do fluxo básico Gancho+Corpo+CTA, o Video Mixer inclui:

- **Textos de Gancho** — botão discreto "+ Texto de Gancho" (card de Ganchos) abre uma lista de frases (sem limite de quantidade, até 90 caracteres cada) que são distribuídas automaticamente entre os vídeos gerados. Em Configurações Avançadas é possível ativar "Cada texto gera uma nova variação", que multiplica o total (ex.: 1.000 combinações × 12 textos = 12.000 vídeos) em vez de apenas distribuir.
- **CTA Visual Automático** — switch no card de CTAs que sobrepõe uma frase (de um banco interno com mais de 100 variações, sem alegações de urgência inventadas) somente durante o trecho de CTA.
- **Variação Criativa** — zoom, crop suave, rotação suave, brilho/contraste/saturação, velocidade e espelho horizontal, aplicados de forma sutil e balanceada (nunca a mesma configuração dominando o lote) para diferenciar visualmente os vídeos finais além da própria combinação de clipes. O texto do app nunca é espelhado (é desenhado depois do espelhamento do vídeo).
- **Ajustar pausas nas emendas** — remove automaticamente pequenos silêncios no início/fim de cada trecho (via `silencedetect` do FFmpeg), com cache por arquivo para não reanalisar o mesmo vídeo repetidamente.
- **Preview obrigatório** — antes de liberar "Gerar Vídeos" é preciso visualizar uma combinação de exemplo, posicionar/redimensionar o texto do Gancho e o CTA Visual arrastando diretamente sobre o vídeo (coordenadas normalizadas — funcionam em qualquer resolução de saída), conferir as guias de "zona segura" do TikTok (nunca aparecem no vídeo exportado, são só uma referência visual) e clicar em "Aprovar Preview". Qualquer mudança relevante depois invalida a aprovação.
- **Garantia contra duplicidade** — cada vídeo final recebe um `VideoMixerID` (ex. `VM-000001`, gravado nos metadados `title`/`comment` do MP4 — o muxer do MP4 não preserva chaves de metadata arbitrárias, então a identificação estruturada completa fica no `project-manifest.json` gerado junto com os vídeos), um hash SHA-256 e uma impressão digital visual (perceptual hash de 3 frames). Se dois vídeos do mesmo lote saírem idênticos ou visualmente quase idênticos, o app tenta automaticamente uma nova variação (até 5 tentativas) antes de desistir e marcar erro naquele item — sem travar o restante da fila.
- **Fila anti-repetição** — a ordem de processamento evita sequências longas do mesmo Gancho (round-robin entre grupos), sem mudar quais combinações existem.
- **CSV estendido** — a exportação agora inclui `video_id`, `hook_text`, `visual_cta`, os parâmetros de variação, `variation_signature`, `sha256` e `visual_fingerprint`, mantendo as colunas originais intactas.

## Sistema comercial (contas, teste grátis e assinatura)

O Video Mixer é um software comercial: para gerar vídeos (não para usar o Preview ou configurar o projeto) é necessário estar logado e ter direito de uso.

- **Conta** — e-mail/senha ou Google, com sessão persistida localmente via `safeStorage` do Electron (nunca em texto plano quando a criptografia do SO está disponível).
- **Teste grátis** — 27 vídeos por conta (apresentado como 3 Ganchos × 3 Corpos × 3 CTAs), consumidos de forma atômica no servidor. Reinstalar o app ou trocar de conta no mesmo computador não devolve o teste (há uma verificação por dispositivo).
- **Video Mixer Pro — R$ 14,99/mês** — assinatura recorrente via cartão (checkout hospedado da Pagar.me; o Electron nunca vê número de cartão, CVV ou validade).
- **Pix — R$ 14,99 = 30 dias** — pagamento único (não é renovação automática) que libera 30 dias de acesso Pro.
- **Autoridade do servidor** — todo o controle de plano/limite/validade vive no Supabase (Postgres + RLS + Edge Functions). O app desktop nunca decide sozinho se pode gerar: a cada clique em "Gerar Vídeos" (e a cada geração avulsa do Preview) o processo principal do Electron pergunta ao servidor `authorize-generation` e só inicia o FFmpeg se a resposta for "permitido". Não existe `isPro = true` guardado localmente.
- **Dispositivos** — contas Pro podem usar até 2 dispositivos ativos ao mesmo tempo; a tela "Minha Conta" permite ver e remover dispositivos.

Isso é tratado inteiramente pelos arquivos em `supabase/` (schema, funções SQL e Edge Functions) e por `src/main/auth/`, `src/main/billing/`, `src/renderer/src/state/useAuthStore.ts`. Veja a próxima seção para configurar as credenciais reais.

## Configuração comercial (Supabase + Pagar.me + Google OAuth)

Sem essa configuração, a tela de login aparece normalmente, mas nenhuma autenticação real nem cobrança funciona — é preciso um projeto Supabase e uma conta Pagar.me reais, com valores próprios (o repositório nunca contém credenciais).

1. **Crie um projeto no Supabase** e aplique o schema em `supabase/migrations/20260907000000_commercial_schema.sql` (via `supabase db push` ou colando no SQL Editor). Ele cria as tabelas de perfis/assinaturas/dispositivos, todas as políticas de RLS e as funções `SECURITY DEFINER` (`resolve_entitlement`, `reserve_trial_generation`, `register_device`, etc).
2. **Configure a autenticação por e-mail/senha e Google** no painel do Supabase (Authentication → Providers). Para o Google, use um Client ID/Secret OAuth próprios; a URL de redirecionamento usada pelo desktop é `videomixer://auth/callback` (protocolo customizado registrado pelo próprio instalador via `build.protocols` no `package.json`).
3. **Configure sua conta Pagar.me** (API V5) — crie o plano de assinatura mensal e anote o `PAGARME_PLAN_ID`, pegue a `PAGARME_SECRET_KEY` do ambiente correto (sandbox ao testar) e configure a URL de webhook do seu projeto Supabase (`.../functions/v1/billing-webhook`) apontando para o evento de pagamentos, com o segredo `PAGARME_WEBHOOK_SECRET` usado na autenticação do webhook. `npm run billing:setup` cadastra o plano automaticamente se ele ainda não existir (revise o script antes de rodar — está comentado indicando o que confirmar na documentação da Pagar.me da sua conta).
4. **Publique as Edge Functions** (`supabase functions deploy <nome>` para cada pasta em `supabase/functions/`, exceto `_shared`) e defina os secrets do backend com `supabase secrets set NOME=valor` para cada variável da seção "Backend" do `.env.example`.
5. **Preencha o `.env`** na raiz do projeto (copie de `.env.example`) com os valores públicos `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` — são os únicos dois valores comerciais que entram no app desktop.
6. Rode `npm run check:commercial-setup` para conferir se todas as variáveis obrigatórias (desktop e backend) estão presentes — ele nunca imprime os valores, só se existem.

**Regra de segurança que vale para toda essa configuração:** `SUPABASE_SERVICE_ROLE_KEY`, `PAGARME_SECRET_KEY` e `GOOGLE_CLIENT_SECRET` são segredos de backend — vivem só nos secrets das Edge Functions, nunca no `.env` do desktop nem em qualquer variável com prefixo `VITE_`.

## Site (landing page, cadastro e download)

A landing page pública, o cadastro/login pelo navegador, o quiz de onboarding gamificado, a página de download e o
**painel administrativo** (`/admin` — usuários, assinaturas, receita/MRR/churn, bloqueio de contas, bônus, funil,
audit log) ficam em [`website/`](website/) — um projeto Next.js independente, conectado ao **mesmo** projeto Supabase
(mesmas contas, mesmo trial de 27 vídeos, mesma tabela de entitlements). Veja [`website/README.md`](website/README.md)
para configuração, papéis de admin e deploy (recomendado: Vercel, com "Root Directory" apontando para `website/`). O
workflow [`.github/workflows/release-desktop.yml`](.github/workflows/release-desktop.yml) publica os instaladores
Windows e macOS que a página `/download` do site consome automaticamente a cada tag `v*`.

## Requisitos

- Windows 10 ou 11 (64 bits)
- Node.js 20 ou superior (apenas para desenvolvimento/build — o instalador final não exige Node.js no computador do usuário final)

O FFmpeg **não precisa ser instalado manualmente**: o projeto usa `ffmpeg-static` e `@ffprobe-installer/ffprobe`, que baixam os binários automaticamente durante `npm install` e o aplicativo os localiza sozinho, mesmo depois de empacotado em um instalador.

## Instalação (desenvolvimento)

```bash
npm install
```

## Rodar em modo desenvolvimento

```bash
npm run dev
```

Isso abre a janela do Electron com hot-reload da interface (React) e recompilação automática do processo principal.

## Testes

```bash
npm test
```

Cobrem: geração das combinações (produto cartesiano), cálculo de totais, nomes de arquivo, ordenação natural, sanitização de prefixo, amostragem/embaralhamento sem duplicatas, fila de processamento (limite de concorrência, retomada de arquivos já existentes, continuidade após erro).

## Verificação de tipos e lint

```bash
npm run typecheck
npm run lint
```

## Build de produção (gerar o instalador .exe)

```bash
npm run dist
```

Esse comando:

1. Compila o processo principal, o preload e a interface (`electron-vite build`).
2. Empacota tudo com `electron-builder` gerando um instalador NSIS para Windows x64.

O instalador (`Video Mixer Setup x.x.x.exe`) fica em:

```
release/
```

Basta rodar esse `.exe` para instalar o programa normalmente, como qualquer outro aplicativo Windows.

## Estrutura do projeto

```
src/
  shared/          Tipos e lógica pura (combinações, nomes, ordenação, sanitização, billing) — usados por main e renderer, e testados com Vitest
  main/            Processo principal do Electron
    ffmpeg/        Localização dos binários, ffprobe, geração de thumbnail, filtros e execução do FFmpeg
    queue/         Fila de geração com concorrência limitada, pausa/retomada/cancelamento
    store/         Persistência local (preferências e projetos) em disco, sem servidor externo
    ipc/           Handlers de IPC expostos ao renderer
    auth/          Sessão Supabase (email/senha, Google OAuth via deep link), armazenamento seguro (safeStorage)
    billing/       Chamadas às Edge Functions (entitlement, checkout, dispositivos) — autoriza a geração antes de abrir o FFmpeg
  preload/         Ponte segura entre o processo principal e a interface (contextBridge)
  renderer/        Interface React (Vite)
    src/components Componentes da UI (cards de importação, contador de combinações, progresso, modais, login, conta, paywall)
    src/state       Estado global (Zustand) — useAppStore (projeto/geração) e useAuthStore (conta/licença)
supabase/
  migrations/      Schema Postgres, RLS e funções SECURITY DEFINER (fonte única de verdade sobre plano/limite/validade)
  functions/       Edge Functions (Deno) — entitlement, autorização de geração, checkout, webhook da Pagar.me, dispositivos
```

## Como funciona o processamento de vídeo

Cada combinação (Gancho + Corpo + CTA) é processada em uma única chamada ao FFmpeg usando `filter_complex`:

- Cada trecho é escalado/enquadrado para a resolução escolhida (mantendo a proporção, sem distorcer — usa `scale` + `pad` ou `crop`, conforme a opção "Ajuste de enquadramento").
- O áudio de cada trecho é normalizado para AAC/48kHz/estéreo; se um trecho não tiver áudio, é gerada uma trilha silenciosa compatível automaticamente, para a concatenação nunca falhar.
- A transição entre trechos pode ser corte seco (padrão, recomendado para TikTok), fade (fade para preto) ou crossfade (dissolução real entre os clipes, via `xfade`/`acrossfade`).
- O resultado é salvo primeiro em um arquivo temporário e só é renomeado para o nome final após terminar com sucesso — isso evita arquivos corrompidos caso o processo seja interrompido.

## Retomada de projetos grandes

Antes de processar cada vídeo, o app verifica se o arquivo de saída já existe na pasta de destino. Se existir (e a opção "Sobrescrever arquivos existentes" estiver desativada, que é o padrão), aquele vídeo é pulado. Isso permite fechar o programa no meio de uma geração de 1.000 vídeos e continuar depois sem refazer o que já foi concluído.

## Solução de problemas

**"FFmpeg: Não encontrado" no rodapé do aplicativo**
Reinstale o aplicativo. Os binários do FFmpeg/ffprobe são distribuídos junto do instalador; se estiverem ausentes, geralmente é sinal de uma instalação corrompida ou de antivírus removendo os executáveis.

**Um vídeo específico deu erro durante a geração**
A fila continua processando os outros vídeos normalmente. Abra o painel "Log" na tela de progresso para ver a mensagem de erro do FFmpeg daquele arquivo específico, e use "Tentar Novamente os Erros" depois de resolver a causa (por exemplo, um arquivo de origem corrompido).

**O vídeo final ficou deitado / com orientação errada**
O FFmpeg respeita automaticamente a metadata de rotação dos vídeos gravados em celular durante a normalização de cada trecho, então isso não deveria acontecer; se acontecer, verifique se o arquivo original já não está com problema de rotação ao ser reproduzido fora do app.

**Quero gerar apenas alguns exemplos antes de rodar tudo**
Use a seção "Seleção de Combinações" para limitar a quantidade (100/200/500) antes de clicar em "Gerar Vídeos", ou use o painel "Preview" para visualizar/gerar uma combinação específica sem rodar o projeto inteiro.

**O botão "Gerar Vídeos" está desabilitado mesmo com tudo preenchido**
É necessário aprovar um Preview primeiro (clique em "Visualizar Combinação" no painel "Preview" e depois em "Aprovar Preview"). Qualquer mudança em textos, CTA visual, variação criativa, silêncio ou configurações de exportação depois de aprovar invalida o preview e pede uma nova aprovação.

**Ao clicar em "Gerar Vídeos" aparece a tela de assinatura (paywall)**
Significa que o servidor negou a geração — o teste grátis de 27 vídeos acabou, a assinatura está com pagamento pendente/expirada, ou este é um novo dispositivo além do limite de 2 para contas Pro. O Preview e a configuração do projeto continuam liberados sem limite; assine ou pague os 30 dias de Pix na própria tela para continuar gerando.

**Erro de conexão ao entrar/gerar vídeos**
O Video Mixer precisa de internet para validar login e autorizar cada geração (a licença nunca é decidida só localmente). Verifique a conexão e tente novamente; se o problema persistir, confira se `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` estão configurados corretamente (veja "Configuração comercial").
