# Stage 1: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

# Stage 2: Final minimal image
FROM gcr.io/distroless/nodejs18
WORKDIR /app
COPY --from=build /app /app
CMD ["server.js"]


