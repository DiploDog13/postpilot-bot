# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости с флагом --legacy-peer-deps для обхода конфликтов
RUN npm install --legacy-peer-deps

# Копируем исходный код
COPY . .

# Собираем TypeScript
RUN npm run build

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
