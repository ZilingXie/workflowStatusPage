FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_BASE_PATH=/status
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

RUN APP_BASE_URL=http://localhost:3000${NEXT_PUBLIC_BASE_PATH} \
    DATABASE_URL=postgresql://postgres:postgres@db:5432/n8n_status \
    INGEST_TOKEN=build_token \
    SESSION_SECRET=build_secret \
    APP_USERS_JSON='[{"username":"admin","role":"ADMIN","passwordHash":"$2a$12$QxsPXh3HOfsQW5ogYWkD7O5iPP0vJeyZJy.Gj1VyfVaAoJlXSlam6"}]' \
    npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

ARG NEXT_PUBLIC_BASE_PATH=/status
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

COPY --from=builder /app /app

EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run start -- -H 0.0.0.0 -p 3000"]
