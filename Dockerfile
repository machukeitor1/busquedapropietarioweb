FROM mcr.microsoft.com/playwright:v1.62.1-focal

USER root
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8080

CMD ["node", "src/index.js"]
