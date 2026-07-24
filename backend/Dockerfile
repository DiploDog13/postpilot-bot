# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Устанавливаем права на выполнение
RUN chmod -R 755 /usr/local/bin

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --legacy-peer-deps

# Копируем исходный код
COPY . .

# Даем права на выполнение для node_modules/.bin
RUN chmod -R +x node_modules/.bin

# Проверяем, что tsc доступен
RUN ls -la node_modules/.bin/tsc

# Собираем TypeScript через npx
RUN npx tsc

# Проверяем, что dist создался
RUN ls -la dist/

# Открываем порт
EXPOSE 3000

# Запускаем
CMD ["node", "dist/main.js"]
