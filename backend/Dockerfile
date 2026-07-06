# Multi-stage build for production
# Stage 1: Build (Prisma generate + dependencies)
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --production && npm cache clean --force

COPY prisma ./prisma/
RUN npx prisma generate

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

# Sadece gerekli dosyaları kopyala
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY . .

# Güvenlik: Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 && \
    chown -R backend:nodejs /app
USER backend

# Environment validation: Kritik env vars kontrolü
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:5000/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

EXPOSE 5000
CMD ["npm", "start"]
