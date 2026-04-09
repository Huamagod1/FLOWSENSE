# Imagen base de Node.js LTS
FROM node:20-alpine

# Carpeta de trabajo
WORKDIR /app

# Copiar package.json primero (optimización de caché)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Puerto que usa React en desarrollo
EXPOSE 3000

# Comando para iniciar en modo desarrollo
CMD ["npm", "run", "dev", "--", "--host"]