FROM node:18-alpine as base
WORKDIR /app

# Build layer
FROM base as build

COPY package-lock.json package.json ./
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build

# Production layer
FROM base as production

EXPOSE 3000
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output

CMD ["node", ".output/server/index.mjs"]
