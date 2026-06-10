# Stage 1: Construcción
FROM node:20-alpine AS build
WORKDIR /app

# Habilitar pnpm
RUN corepack enable pnpm

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copiar el resto del código y compilar
COPY . .
RUN pnpm run build

# Stage 2: Servidor Nginx
FROM nginx:alpine

# Copiar el resultado de la compilación
COPY --from=build /app/dist/vitalBite-frontend-web /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
