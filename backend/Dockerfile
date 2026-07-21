FROM node:18-alpine

WORKDIR /app

# Копируем файлы
COPY package*.json ./
COPY tsconfig.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Собираем проект
RUN npx tsc --noEmitOnError false

# Очищаем и даем права
RUN chmod +x node_modules/.bin/*

EXPOSE 3000

CMD ["node", "dist/index.js"]
