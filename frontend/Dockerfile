FROM node:20-alpine AS build

WORKDIR /app

# Copy package configuration and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the Vite application for production
# This requires adding the correct API URL at build time if you are building inside docker, 
# or you can rely on relative paths if Nginx is configured to proxy requests!
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
