# ── Stage 1: Build Production Assets with Vite ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ── Stage 2: Hardened Nginx 1.25 Alpine Web Server & Reverse Proxy ──
FROM nginx:1.25.4-alpine

# Install OpenSSL and generate fallback self-signed SSL certificate
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/key.pem \
      -out /etc/nginx/ssl/cert.pem \
      -subj "/C=DE/ST=NRW/L=Duisburg/O=ClimateSphere/CN=localhost"

# Copy custom reverse proxy configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy compiled production assets from builder stage
COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
