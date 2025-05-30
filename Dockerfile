# Usa l'immagine ufficiale di Node.js
FROM node:23

# Imposta la cartella di lavoro nel container
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il resto del codice
COPY . .

ENV PORT=5000
ENV DB=database.db

# Esponi la porta usata dall'app
EXPOSE 5000

# Comando per avviare il server
CMD ["node", "app.js"]
