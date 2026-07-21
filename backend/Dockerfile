# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --legacy-peer-deps

# Копируем исходный код
COPY . .

# Используем полный путь к TypeScript компилятору
RUN ./node_modules/.bin/tsc

# Или используем node для запуска
# RUN node ./node_modules/typescript/bin/tsc

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
