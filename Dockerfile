FROM node:22-bullseye-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

RUN npx playwright install --with-deps chromium

COPY . .

EXPOSE 8080

CMD ["node", "src/index.js"]
