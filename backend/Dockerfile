FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci --include=dev

COPY . .

RUN node ./node_modules/typescript/bin/tsc

EXPOSE 3000

CMD ["node", "dist/main.js"]
