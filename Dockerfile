FROM node:22.14.0-alpine AS builder
RUN apk update && apk upgrade
WORKDIR /app
ARG BUILD_NUMBER=local
ARG BUILD_DATE=01.01.1970
ARG REPOSITORY_URL=https://github.com/AdmiralXy/spring-ai-rag-agent
ENV NUXT_PUBLIC_BUILD_NUMBER=${BUILD_NUMBER}
ENV NUXT_PUBLIC_BUILD_DATE=${BUILD_DATE}
ENV NUXT_PUBLIC_REPOSITORY_URL=${REPOSITORY_URL}
COPY package* ./
RUN yarn install --frozen-lockfile --ignore-engines
COPY . ./
RUN yarn build

FROM node:22.14.0-alpine
RUN apk update && apk upgrade && apk add dumb-init && adduser -D nuxtuser
ARG BUILD_NUMBER=local
ARG BUILD_DATE=01.01.1970
ARG REPOSITORY_URL=https://github.com/AdmiralXy/spring-ai-rag-agent
USER nuxtuser
WORKDIR /app
COPY --chown=nuxtuser:nuxtuser --from=builder /app/.output ./
ENV HOST=0.0.0.0 PORT=3000 NODE_ENV=production
ENV NUXT_PUBLIC_BUILD_NUMBER=${BUILD_NUMBER}
ENV NUXT_PUBLIC_BUILD_DATE=${BUILD_DATE}
ENV NUXT_PUBLIC_REPOSITORY_URL=${REPOSITORY_URL}
CMD ["dumb-init", "node", "/app/server/index.mjs"]
