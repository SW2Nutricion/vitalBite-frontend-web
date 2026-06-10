# Stage 1: Construcción
FROM node:22-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias (usaremos npm para evitar restricciones de pnpm)
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copiar el resto del código y compilar
COPY . .
RUN npm run build

# Stage 2: Servidor Nginx
FROM nginx:alpine

# Copiar el resultado de la compilación
COPY --from=build /app/dist/vitalBite-frontend-web /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
