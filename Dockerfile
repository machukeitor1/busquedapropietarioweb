FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y chromium --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8080

CMD ["node", "src/index.js"]
