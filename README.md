# Bidion Achadinhos

Landing page estática dos Achadinhos de Leilão da Bidion.

## Rodar localmente

Não é necessário instalar dependências. Com Node.js instalado, execute:

```powershell
npm.cmd run dev
```

Acesse <http://127.0.0.1:3000>.

Em terminais que não bloqueiam o script do npm, também funciona:

```sh
npm run dev
```

## Meta Pixel e Conversions API

O Pixel `1562627931838707` registra `PageView` e `InitiateCheckout` no navegador. O servidor envia os mesmos eventos pela Conversions API usando o mesmo `event_id`, permitindo a deduplicação pela Meta.

Cadastre o token como segredo `META_ACCESS_TOKEN` no ambiente da hospedagem. Não coloque o token no HTML, no repositório ou em arquivos `.env` versionados. As opções disponíveis estão documentadas em `.env.example`.

Para testar localmente no PowerShell:

```powershell
$env:META_ACCESS_TOKEN="seu_novo_token"
$env:META_TEST_EVENT_CODE="codigo_de_teste_opcional"
npm.cmd run dev
```

A Conversions API exige uma hospedagem que execute o `server.js`. Ela não funciona em uma publicação puramente estática como o GitHub Pages.

### Publicar na Vercel

A Vercel serve o `index.html` como arquivo estático e publica `api/meta-event.mjs` como uma Function em `/api/meta-event`.

No painel do projeto, abra **Settings → Environment Variables** e cadastre:

- `META_ACCESS_TOKEN`: novo token da Conversions API;
- `META_TEST_EVENT_CODE`: opcional, somente durante testes no Gerenciador de Eventos;
- `META_GRAPH_API_VERSION`: opcional; o padrão do projeto é `v24.0`.

Não defina Build Command, Output Directory ou Install Command personalizados para este projeto. Depois de alterar as variáveis, faça um novo deploy.
