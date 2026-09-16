This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, start the sibling `typeracer-api` service. Its realtime server is preferred for low-latency PvP, while the REST service remains a fallback. Then configure this app:

```bash
copy .env.example .env
```

Set `DATABASE_URL`, `GUEST_SESSION_SECRET`, and `ROOM_TOKEN_SECRET`. The two secrets must each contain at least 32 characters, and `ROOM_TOKEN_SECRET` must match the battle API. Apply the authoritative battle schema before starting either service:

```bash
npm run db:migrate
```

Protocol v2 is enabled with `NEXT_PUBLIC_GAME_PROTOCOL_VERSION=2`. Version 1 remains available temporarily as a deployment rollback option.

Run the development server:

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

For production REST fallback, deploy `typeracer-api` as an Express API on Vercel and set `NEXT_PUBLIC_API_URL`. For low-latency PvP, deploy the API's persistent realtime entrypoint on a WebSocket-capable Node host and set `NEXT_PUBLIC_WEBSOCKET_URL=wss://your-realtime-api.example.com/ws`. When that variable is present, protocol v2 sends inputs immediately and receives authoritative snapshots over the socket instead of polling. Redeploy the frontend whenever either public URL changes.

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
