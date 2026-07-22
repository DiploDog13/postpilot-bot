# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --legacy-peer-deps

# Копируем исходный код
COPY . .

# Даем права на выполнение
RUN chmod -R +x node_modules/.bin

# Собираем TypeScript
RUN npx tsc

# Проверяем, что файл создался
RUN ls -la dist/

# Открываем порт
EXPOSE 3000

# Запускаем приложение - ПРАВИЛЬНЫЙ ПУТЬ
CMD ["node", "dist/main.js"]
