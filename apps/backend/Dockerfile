FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/backend/ apps/backend/

RUN pnpm --filter @wecandoleb/shared build
RUN cd apps/backend && npx prisma generate
RUN cd apps/backend && npx tsc

EXPOSE 10000

CMD ["sh", "-c", "cd apps/backend && npx prisma db push --force-reset && npx tsx prisma/seed.ts && node dist/index.js"]
