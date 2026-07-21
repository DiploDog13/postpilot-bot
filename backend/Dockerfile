# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости с флагом --legacy-peer-deps
RUN npm install --legacy-peer-deps

# Копируем исходный код
COPY . .

# Даем права на выполнение для node_modules/.bin
RUN chmod -R +x node_modules/.bin

# Собираем TypeScript с использованием npx
RUN npx tsc

# Или используем полный путь к tsc
# RUN node node_modules/typescript/bin/tsc

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
