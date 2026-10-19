# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Builder
# Install dependencies and compile the production bundle with Rsbuild.
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Copy lockfile + manifests first so the layer cache is reused when only
# source files change.
COPY bun.lock package.json ./

RUN bun ci

# Copy the rest of the source
COPY . .

# Build-time env vars (injected into the JS bundle by Rsbuild).
# Pass them with --build-arg when running docker build:
#   docker build --build-arg API_BASE_URL=https://api.example.com .
ARG API_BASE_URL=""
ENV API_BASE_URL=${API_BASE_URL}

RUN bun run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Runner
# Serve the compiled static assets with a lightweight Bun static server
# on port 3000. No nginx inside the container — that's handled externally.
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS runner

WORKDIR /app

# Copy the compiled bundle from the builder stage
COPY --from=builder /app/dist ./dist

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["bun", "start"]
