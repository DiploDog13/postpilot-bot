FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY . .

# Обходим проблему с executable bit у tsc
RUN node ./node_modules/typescript/bin/tsc --noEmitOnError false

EXPOSE 3000

CMD ["node", "dist/main.js"]
