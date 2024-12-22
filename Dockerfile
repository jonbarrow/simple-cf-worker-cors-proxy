FROM node:20-alpine as base
WORKDIR /app

# Build layer
FROM base as build

RUN npm i -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Production layer
FROM base as production

EXPOSE 3000
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output

CMD ["node", ".output/server/index.mjs"]
