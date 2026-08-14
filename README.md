# Automação de Prospecção via WhatsApp

Automação Node.js para envio de mensagens de prospecção a escritórios de advocacia sem site, lidos de um dataset estruturado em formato de tabela, com fila sequencial, intervalo aleatório, controle de envios persistido, retomada automática e respeito a horário comercial.

## Árvore do projeto

```
whatsapp-outreach/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── data/
│   ├── contatos.json        # dataset de entrada (sua base de prospecção)
│   └── control.json         # gerado automaticamente - estado dos envios
├── logs/
│   └── automacao-YYYY-MM-DD.log
└── src/
    ├── index.js                        # ponto de entrada
    ├── config/
    │   ├── index.js                    # variáveis de ambiente tipadas
    │   └── filters.js                  # regras de filtro dos contatos (extensível)
    ├── controllers/
    │   └── campaignController.js       # orquestra a campanha do início ao fim
    ├── data/
    │   ├── datasetReader.js            # lê o dataset (tabela em JSON) e converte para objetos JS
    │   └── controlRepository.js        # persiste o estado de envio (control.json)
    ├── message/
    │   └── messageTemplate.js          # texto da mensagem - único arquivo a editar
    ├── scheduler/
    │   ├── businessHours.js            # regras de horário comercial
    │   └── queueProcessor.js           # fila sequencial com intervalo aleatório
    ├── services/
    │   ├── whatsappService.js          # integração com o WhatsApp
    │   └── logService.js               # logging em console + arquivo
    └── utils/
        ├── randomInterval.js           # intervalo aleatório + sleep
        ├── phoneFormatter.js           # normalização de telefone
        └── dateFormatter.js            # formatação de data/hora em pt-BR
```

## Formato do dataset (`data/contatos.json`)

Em vez de uma planilha Excel, os contatos ficam num arquivo JSON organizado como uma tabela: um array de objetos, onde cada objeto é uma "linha" e cada campo é uma "coluna" — exatamente o mesmo significado de `Nº de telefone`, `Nome do lugar`, `Tem site?`, `Link do site` e `Cidade` da planilha original, só que em texto estruturado:

```json
[
  {
    "telefone": "+55 71 98604-6754",
    "nome": "Dra. Sandra Regina | Advogado em Salvador",
    "temSite": "Não",
    "linkSite": null,
    "cidade": "Salvador"
  }
]
```

Para adicionar, remover ou editar contatos, basta abrir esse arquivo em qualquer editor de texto e alterar o array — sem precisar de Excel nem de nenhuma ferramenta especial.

## Decisões de arquitetura

**Separação em camadas.** `data/` só sabe ler e persistir dados (dataset e JSON de controle). `services/` só sabe falar com sistemas externos (WhatsApp, logs). `scheduler/` só sabe decidir *quando* e *em que ordem* algo deve acontecer. `controllers/` orquestra essas camadas sem conter lógica de negócio própria. `message/` isola o texto enviado, para que ele possa mudar sem tocar em nenhuma outra parte do sistema.

**Fonte de dados desacoplada.** `datasetReader.js` é o único arquivo que sabe como os contatos estão armazenados fisicamente. Ele lê o JSON e devolve exatamente o mesmo formato de objeto que o resto do sistema espera (`telefone`, `nome`, `cidade`, `possuiSite`, `linkSite`). Se no futuro você quiser voltar a usar Excel, importar de um banco de dados, ou ler de uma API, é só criar um novo leitor com a mesma assinatura de retorno — `campaignController.js` não muda uma linha.

**Fila sempre sequencial, nunca paralela.** `queueProcessor.js` usa um único `for...of` com `await` dentro. Não há `Promise.all`, não há disparo concorrente. Isso garante, por construção, que nunca duas mensagens saiam ao mesmo tempo.

**Retomada exata após reinício.** O `controlRepository` persiste cada contato em `data/control.json` com um `status` (`pendente`, `enviado`, `erro`). A cada início, a fila é reconstruída a partir desse arquivo, não do dataset. Contatos já marcados como `enviado` nunca voltam à fila.

**Erro nunca interrompe a fila.** `enviarParaContato()` tem seu próprio `try/catch`. Uma falha é registrada no log e no `control.json` com `status: 'erro'`, e o `for` da fila segue normalmente para o próximo contato.

**Horário comercial com múltiplas janelas, como barreira, não como filtro.** `config.businessHours.windows` aceita quantas janelas forem necessárias (padrão: 09:00–11:30 e 14:00–16:30, respeitando o intervalo de almoço). Antes de cada envio, `aguardarHorarioComercialSeNecessario()` verifica se o horário atual cai em alguma das janelas. Se estiver fora — seja no intervalo do almoço, seja depois das 16:30 — a automação simplesmente aguarda até a próxima janela abrir, hoje ou amanhã.

**Escalabilidade pensada desde o início:**
- Trocar o dataset → mudar `DATA_PATH` no `.env` ou editar `data/contatos.json`.
- Trocar a mensagem → editar apenas `message/messageTemplate.js`.
- Mudar o horário comercial ou o intervalo → variáveis no `.env`, nenhum código muda.
- Adicionar novos filtros → adicionar uma função em `config/filters.js`.
- Migrar para banco de dados → `controlRepository.js` tem uma interface pequena e isolada, é o único arquivo que precisaria mudar.

**Integração com WhatsApp isolada.** `whatsappService.js` é o único arquivo que conhece a biblioteca `whatsapp-web.js`. Ela automatiza o WhatsApp Web via navegador headless (Puppeteer) e está sujeita aos Termos de Uso do WhatsApp, que restringem mensagens em massa não solicitadas.

## ⚠️ Sobre o erro "No LID for user"

Se você já testou uma versão anterior e viu esse erro nos logs: **não é um bug do seu código nem da sua planilha/dataset**. É um problema conhecido e atualmente em ajuste na biblioteca `whatsapp-web.js`, causado pela migração do WhatsApp para um novo sistema interno de identificação de usuários (LID). Como essa biblioteca não é oficial (ela automatiza o navegador do WhatsApp Web), ela às vezes fica temporariamente dessincronizada com mudanças internas do WhatsApp.

Nesta versão, `whatsappService.js` foi ajustado para usar `client.getNumberId()` antes de cada envio — isso pede ao próprio WhatsApp para confirmar e resolver o número corretamente, em vez de montar o ID do chat manualmente, o que reduz bastante a chance desse erro.

Mesmo assim, como é uma limitação de uma dependência externa em constante ajuste, não há garantia de 0% de erro. Se voltar a acontecer:
1. Rode `npm update whatsapp-web.js` para garantir a versão mais recente.
2. O contato específico ficará com `status: "erro"` no `control.json` e será tentado novamente na próxima execução.
3. Para um projeto em produção com volume maior, vale considerar migrar para a API oficial do WhatsApp Business (Cloud API da Meta), que não sofre com esse tipo de instabilidade — isso exigiria reescrever apenas o `whatsappService.js`.

## ⚠️ Configuração atual: modo de teste

Esta versão do projeto está configurada para um teste controlado:

- `data/contatos.json` contém **apenas 5 contatos reais** (os 5 primeiros da sua base sem site).
- `.env.example` já vem com `MIN_INTERVAL_MINUTES=1` e `MAX_INTERVAL_MINUTES=2`, em vez de 2-5 minutos.

**Quando for para produção com a base completa:**
1. Edite `data/contatos.json` e acrescente os demais contatos, seguindo o mesmo formato.
2. No `.env`, volte `MIN_INTERVAL_MINUTES` e `MAX_INTERVAL_MINUTES` para valores mais seguros (ex: 2 e 5, ou maiores).
3. Apague `data/control.json` se quiser começar do zero, ou deixe como está se quiser continuar de onde o teste parou.

## Formato do arquivo de controle (`data/control.json`)

```json
{
  "chave": "5571986046754",
  "telefone": "+55 71 98604-6754",
  "nome": "Dra. Sandra Regina | Advogado em Salvador",
  "cidade": "Salvador",
  "linkSite": null,
  "enviado": true,
  "data": "2026-08-02",
  "horario": "09:10:32",
  "status": "enviado",
  "tentativas": 0,
  "ultimoErro": null
}
```

## Como executar - passo a passo

1. **Pré-requisitos:** Node.js 18 ou superior instalado, e o número de WhatsApp que fará os envios disponível para escanear um QR Code.

2. **Instalar dependências:**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```

4. **Conferir o dataset:** o arquivo `data/contatos.json` já está incluído, com os campos `telefone`, `nome`, `temSite`, `linkSite` e `cidade`. Para editar, adicionar ou remover contatos, basta abrir esse arquivo em qualquer editor de texto.

5. **Rodar a automação:**
   ```bash
   npm start
   ```
   Na primeira execução, um QR Code aparecerá no terminal. Escaneie com o WhatsApp (Aparelhos conectados → Conectar um aparelho) do número que fará os disparos. A sessão fica salva em `.wwebjs_auth/`.

6. **Acompanhar:** os logs aparecem no terminal em tempo real e também são gravados em `logs/automacao-AAAA-MM-DD.log`.

7. **Parar e retomar:** pode encerrar o processo (`Ctrl+C`) a qualquer momento. Ao rodar `npm start` novamente, a automação lê `data/control.json`, ignora quem já foi marcado como `enviado` e continua exatamente do próximo contato pendente.

8. **Fora do horário comercial:** se for iniciado fora das janelas configuradas (padrão 09:00–11:30 e 14:00–16:30), a automação fica aguardando automaticamente até a próxima janela abrir.

## Observação importante

Este projeto usa `whatsapp-web.js`, que automatiza o WhatsApp Web através de um navegador. Isso não é a via oficial de envio em massa do WhatsApp e está sujeito às políticas de uso da plataforma. Os intervalos aleatórios e o respeito ao horário comercial ajudam a reduzir o risco de bloqueio, mas para volumes maiores vale considerar a API oficial do WhatsApp Business no futuro.
