FROM node:18-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

# Устанавливаем зависимости
RUN npm install --legacy-peer-deps

# Копируем исходный код
COPY . .

# Вместо npm run build используем npx
RUN npx tsc

# Открываем порт
EXPOSE 3000

CMD ["node", "dist/index.js"]
