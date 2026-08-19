FROM node:18-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/ ./

EXPOSE 5000
CMD ["node", "server.js"]
