FROM node:22.14.0-alpine AS builder
RUN apk update && apk upgrade
WORKDIR /app
COPY package* ./
RUN yarn install --frozen-lockfile --ignore-engines
COPY . ./
RUN yarn build

FROM node:22.14.0-alpine
RUN apk update && apk upgrade && apk add dumb-init && adduser -D nuxtuser
USER nuxtuser
WORKDIR /app
COPY --chown=nuxtuser:nuxtuser --from=builder /app/.output ./
ENV HOST=0.0.0.0 PORT=3000 NODE_ENV=production
CMD ["dumb-init", "node", "/app/server/index.mjs"]
