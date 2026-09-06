This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Importar treinos Garmin

Selecione um arquivo `.zip`, `.gpx`, `.tcx` ou `.fit` exportado do Garmin Connect (limite de 20 MB). ZIPs com um treino FIT, GPX ou TCX sao extraidos automaticamente, inclusive em subpastas. O limite de 20 MB tambem vale para o treino descompactado. ZIPs com varios treinos devem ser extraidos e importados individualmente. A importacao manual nao exige credenciais Garmin.

- GPX: distancia estimada pelas coordenadas, sem ligar segmentos separados; duracao entre o primeiro e o ultimo horario.
- TCX: distancia e tempo dos totais das voltas, com fallback para GPS e horarios.
- FIT: leitura pelo SDK oficial Garmin, incluindo sessoes de piscina sem GPS; prioriza o tempo do cronometro da sessao. Arquivos multiesporte devem ser exportados como sessoes individuais.
- Ritmo: minutos por 100 metros; fica indisponivel quando nao ha distancia ou duracao. A frequencia cardiaca depende dos dados presentes no arquivo.

O historico e salvo localmente em `src/data/workouts.json`. Isso requer um servidor com disco persistente; hospedagem com armazenamento efemero precisa de banco de dados. O painel conta treinos do mes atual pela data da atividade. Distancia e tempo somam todo o historico; o ritmo usa tempo e distancia das atividades que possuem ambos os valores.

Execute `npm test` para verificar os parsers com casos GPX, TCX e FIT, incluindo dados invalidos.
