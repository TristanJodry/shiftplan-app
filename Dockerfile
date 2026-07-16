# Étape 1 : Build de l'application React / Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances (y compris devDependencies pour le build)
RUN npm ci

# Copier le reste du code source
COPY . .

# Générer le build de production (dist/)
RUN npm run build

# Étape 2 : Image de production finale
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copier uniquement package.json et installer les dépendances de production
COPY package*.json ./
RUN npm ci --only=production

# Copier le serveur Express et les fichiers statiques compilés
COPY server.js ./
COPY --from=builder /app/dist ./dist

# Créer le dossier uploads pour les fichiers du planning et attribuer les bons droits
RUN mkdir -p uploads && chmod 777 uploads

# Exposer le port de l'application
EXPOSE 3000

# Lancer l'application
CMD ["node", "server.js"]
