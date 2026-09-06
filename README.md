# Open Water Coach — Projeto Natação

Aplicação pessoal para organizar e consultar treinos de natação a partir de arquivos exportados do Garmin Connect. Permite importar atividades, acompanhar distância e tempo acumulados e visualizar a frequência cardíaca durante cada treino.

O projeto está em desenvolvimento. O fluxo disponível é a **importação manual de arquivos**, sem necessidade de credenciais da API Garmin.

## Funcionalidades

- Importação de arquivos **ZIP, FIT, GPX e TCX**.
- Extração automática de ZIP com uma atividade, inclusive em subpastas.
- Histórico de treinos salvo no servidor local.
- Detalhes com data da atividade, duração, distância, ritmo por 100 metros e frequência cardíaca média, quando disponíveis.
- Painel com indicadores calculados a partir do histórico importado.
- Gráfico de frequência cardíaca durante todo o treino, com consulta por mouse, toque ou controle deslizante.
- Validação de arquivos vazios, inválidos e acima do limite de tamanho.

## Tecnologias

| Tecnologia | Uso |
| --- | --- |
| Next.js 16 e React 19 | Interface e rotas da aplicação |
| TypeScript | Tipagem do código |
| Tailwind CSS 4 | Estilização |
| Garmin FIT SDK | Leitura de arquivos FIT |
| fflate | Extração dos arquivos ZIP |
| date-fns | Formatação de datas |
| Vitest e jsdom | Testes automatizados |
| ESLint | Verificação de código |

As versões utilizadas estão em `package.json`; o `package-lock.json` registra as versões instaladas.

## Executar localmente

Ambiente usado no desenvolvimento: **Node.js 24.11.1**, com npm. Também é necessário ter Git instalado para clonar o repositório e acesso autorizado ao repositório privado.

```bash
git clone https://github.com/felipefezzi1978/projeto-natacao.git
cd projeto-natacao
npm ci
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador. Para encerrar o servidor, pressione `Ctrl+C` no terminal.

### Variáveis de ambiente

**A importação manual não exige arquivo `.env.local`.**

O `.env.example` contém variáveis de uma integração experimental com a API Garmin (`GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET` e `GARMIN_REDIRECT_URI`). Essa conexão automática está incompleta e não faz parte do fluxo disponível na interface. Preencher essas variáveis, por si só, não habilita a sincronização.

## Importar um treino

1. Exporte uma atividade pelo portal Garmin Connect.
2. No painel, localize **Importar treino Garmin**.
3. Selecione o arquivo ZIP, FIT, GPX ou TCX.
4. Aguarde a confirmação de importação.
5. Abra o treino no histórico para consultar o resumo e o gráfico.

Não é necessário extrair previamente um ZIP que contenha apenas uma atividade compatível. Após salvar, o histórico e os indicadores são atualizados automaticamente.

### Formatos e limites

| Formato | Dados utilizados e comportamento |
| --- | --- |
| ZIP | Extrai uma atividade FIT, GPX ou TCX. Arquivos auxiliares e metadados de macOS são ignorados. |
| FIT | Usa o SDK oficial Garmin. Lê totais da sessão e registros, inclusive treinos de piscina sem GPS. |
| GPX | Estima a distância pelas coordenadas e calcula a duração entre os horários dos registros. Não conecta segmentos separados para calcular distância. |
| TCX | Prioriza distância e tempo informados nas voltas; na ausência desses totais, utiliza coordenadas e horários disponíveis. |

- Limite de **20 MB** para o arquivo selecionado e para a atividade descompactada.
- ZIPs com várias atividades não são importados em lote: extraia e importe os arquivos individualmente.
- ZIPs dentro de outros ZIPs não são extraídos recursivamente.
- FIT com mais de uma sessão e TCX com mais de uma atividade são recusados.
- Os valores disponíveis dependem do conteúdo do arquivo: sem dados de distância ou duração, o ritmo fica indisponível.

## Entender os indicadores

| Indicador | Como é calculado |
| --- | --- |
| Treinos no mês | Quantidade de atividades realizadas no mês e ano atuais, pela data de início do treino. |
| Distância total | Soma das distâncias de todo o histórico importado. |
| Tempo em água | Soma das durações de todo o histórico importado. |
| Ritmo médio | Tempo total dividido pela distância total das atividades que possuem ambos os valores, expresso em minutos por 100 metros. |

O ritmo do painel é ponderado pela distância; não é a média simples dos ritmos exibidos em cada treino. Por exemplo, 1 km em 20 minutos e 3 km em 90 minutos resultam em **2:45 /100m** no conjunto.

Um treino de janeiro importado em setembro entra nos totais do histórico, mas não na contagem de treinos de setembro.

### Datas e duração

A data exibida no histórico e nos detalhes é a **data do treino** (`startTime`). O campo `createdAt` registra quando ele foi importado e não substitui a data da atividade.

Os horários são apresentados no fuso local do navegador, no formato `dd/MM/yyyy HH:mm:ss`. Datas ausentes ou inválidas aparecem como indisponíveis.

No FIT, a duração prioriza o tempo do cronômetro da sessão. Por isso, ela pode ser menor que o intervalo entre início e fim quando houve pausas. No GPX, a duração corresponde ao intervalo entre os registros, podendo incluir pausas.

### Frequência cardíaca

**bpm** significa batimentos por minuto. O gráfico usa todos os registros com horário e frequência cardíaca válidos e mostra os valores mínimo e máximo registrados.

- Passe o mouse, toque no gráfico ou use o controle deslizante para consultar horário e bpm.
- O eixo horizontal representa o horário; o vertical representa bpm.
- Intervalos superiores a um minuto sem registros ficam sem linha.
- Se o arquivo não possuir registros válidos, a tela informa a ausência de dados.

A média do FIT prioriza o valor informado pela sessão; quando não está disponível, é calculada a partir das amostras. Ela pode diferir da média visual do gráfico.

## Armazenamento e execução em produção

O histórico fica em **`src/data/workouts.json`**, criado automaticamente pelo servidor. A pasta está ignorada pelo Git e não é enviada ao GitHub. Faça uma cópia desse arquivo para preservar seus dados antes de trocar de ambiente.

Os arquivos originais são processados no navegador; o resumo e os registros extraídos são enviados à rota `/api/workouts` e salvos no JSON.

Para executar a compilação de produção localmente:

```bash
npm run build
npm run start
```

A implementação atual precisa de um servidor com permissão de escrita e disco persistente. Hospedagem com armazenamento efêmero requer a migração do histórico para um banco de dados ou outro armazenamento persistente.

## Comandos de desenvolvimento

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Compila a aplicação para produção |
| `npm run start` | Inicia a aplicação já compilada |
| `npm run lint` | Executa o ESLint |
| `npm test` | Executa os testes automatizados |
| `npx tsc --noEmit` | Verifica os tipos sem gerar arquivos JavaScript |

Os testes cobrem importação GPX, TCX e FIT, ZIPs, rejeição de arquivos inválidos e cálculo dos indicadores. A suíte não equivale a uma validação de todos os modelos Garmin, nem há percentual de cobertura configurado.

## Estrutura principal

```text
src/
  app/
    page.tsx                    # Painel e importação
    api/
      workouts/route.ts         # Consulta e gravação do histórico
      garmin/                   # Rotas experimentais de autenticação
    treino/
      [id]/page.tsx             # Detalhes de uma atividade
      heart-rate-chart.tsx      # Gráfico de frequência cardíaca
  lib/
    import-workout.ts           # Leitores FIT, GPX, TCX e ZIP
    import-workout.test.ts      # Testes de importação
    workout-stats.ts            # Cálculo dos indicadores
    workout-stats.test.ts       # Testes dos indicadores
    garmin.ts                  # Configuração experimental da API Garmin
  data/
    workouts.json              # Dados locais, criados durante o uso
```

## Limitações atuais

- Não há sincronização automática com o Garmin Connect.
- A seção **Próximos treinos** e o botão **Novo bloco** ainda são demonstrativos.
- Não há detecção de duplicatas: importar novamente a mesma atividade cria outro registro e aumenta os totais.
- Não há edição ou exclusão de treinos pela interface.
- O armazenamento JSON é voltado ao uso local; não há autenticação, separação por usuário ou controle de gravações simultâneas.
- Métricas específicas de natação, como SWOLF, estilos e comprimentos de piscina, ainda não são exibidas.

## Solução de problemas

| Situação | O que verificar |
| --- | --- |
| ZIP com vários treinos | Extraia o conteúdo e importe uma atividade por vez. |
| Arquivo inválido ou corrompido | Faça uma nova exportação da atividade e tente novamente. |
| Arquivo acima de 20 MB | Exporte uma atividade individual dentro do limite. |
| Frequência cardíaca ausente | O arquivo precisa conter medições de FC; o gráfico também precisa de horários válidos. |
| Treinos no mês mostra zero | Confira a data real das atividades: os demais cartões incluem todo o histórico. |
| Totais maiores que o esperado | Confira se a mesma atividade foi importada mais de uma vez. |
| Falha ao salvar | Confira o terminal do servidor e a permissão de escrita em `src/data`. |
| Histórico desapareceu após mudar de ambiente | Os dados ficam no disco do servidor anterior, não no repositório Git. |
