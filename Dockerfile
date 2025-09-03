FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg bash

COPY package*.json ./
RUN npm ci --only=production

COPY . .
ARG REACT_APP_API_URL

ENV REACT_APP_API_URL=$REACT_APP_API_URL

EXPOSE 3000
CMD ["node", "src/index.js"]