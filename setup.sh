#!/bin/bash

# Configuration des couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
GREEN_BOLD='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Extraire la version actuelle
VERSION=$(grep '"version":' package.json | cut -d'"' -f4)

clear
echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}${BOLD}        SHIFTPLAN PRO - CONFIGURATION INITIALE      ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo -e "Ce script va configurer votre instance ShiftPlan Pro."
echo ""

# 1. Vérification des prérequis
echo -e "${YELLOW}[1/4] Vérification de l'environnement...${NC}"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERREUR] Node.js n'est pas installé. Veuillez installer Node.js (v18+) avant de continuer.${NC}"
    exit 1
else
    echo -e "${GREEN}[OK] Node.js détecté : $(node -v)${NC}"
fi

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERREUR] npm n'est pas installé. Veuillez installer npm avant de continuer.${NC}"
    exit 1
else
    echo -e "${GREEN}[OK] npm détecté : $(npm -v)${NC}"
fi

# 2. Configuration interactive des variables (Port)
echo -e "\n${YELLOW}[2/4] Configuration de l'environnement...${NC}"

# Demander le port de l'application
DEFAULT_PORT=3000
read -p "Sur quel port souhaitez-vous faire tourner l'application ? [$DEFAULT_PORT] : " PORT
PORT=${PORT:-$DEFAULT_PORT}

# Valider que le port est un nombre
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}[ERREUR] Le port doit être un nombre valide. Utilisation du port par défaut $DEFAULT_PORT.${NC}"
    PORT=$DEFAULT_PORT
fi

echo -e "${GREEN}[OK] L'application sera configurée sur le port : $PORT${NC}"

# Création du fichier .env
echo "PORT=$PORT" > .env
echo -e "${GREEN}[OK] Fichier de configuration '.env' généré avec succès !${NC}"

# 3. Installation des dépendances npm
echo -e "\n${YELLOW}[3/4] Installation des dépendances npm (npm install)...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERREUR] Échec de l'installation des dépendances npm. Veuillez vérifier votre connexion internet ou vos permissions.${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Toutes les dépendances ont été installées avec succès.${NC}"

# 4. Compilation de production (build)
echo -e "\n${YELLOW}[4/4] Compilation des fichiers de production (npm run build)...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERREUR] Échec de la compilation de production. Veuillez inspecter les logs d'erreurs ci-dessus.${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Compilation de production terminée.${NC}"

# 5. Choix du mode de déploiement et configuration
echo -e "\n${YELLOW}[5/5] Choix du mode de déploiement...${NC}"
echo -e "Comment souhaitez-vous déployer ShiftPlan Pro ?"
echo -e "  1) Service système classique (Systemd) - Recommandé pour VPS/Serveur dédié Linux"
echo -e "  2) Conteneur Docker - Recommandé pour la portabilité et le cloud"
echo -e "  3) Aucun (Lancement manuel)"
read -p "Sélectionnez une option [1-3] (Défaut: 1) : " DEPLOY_MODE
DEPLOY_MODE=${DEPLOY_MODE:-1}

# Initialiser les variables de suivi
DOCKER_STARTED=false
SYSTEMD_STARTED=false

# Fonction pour exécuter avec sudo si nécessaire
run_as_sudo() {
    if [ "$EUID" -ne 0 ]; then
        if command -v sudo &> /dev/null; then
            sudo "$@"
        else
            echo -e "${RED}[ERREUR] Cette opération nécessite des privilèges root mais 'sudo' n'est pas installé.${NC}"
            return 1
        fi
    else
        "$@"
    fi
}

if [ "$DEPLOY_MODE" = "1" ]; then
    echo -e "\n${YELLOW}Configuration du service Systemd...${NC}"
    CURRENT_DIR=$(pwd)
    CURRENT_USER=$(whoami)

    cat <<EOF > shiftplan.service
[Unit]
Description=ShiftPlan Pro - Gestion de Planning
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=$(command -v node) $CURRENT_DIR/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=$PORT

[Install]
WantedBy=multi-user.target
EOF

    echo -e "${GREEN}[OK] Fichier de configuration systemd généré : 'shiftplan.service'${NC}"

    read -p "Souhaitez-vous installer et activer ShiftPlan Pro en tant que service système (systemd) ? [y/N] : " INSTALL_SERVICE
    if [[ "$INSTALL_SERVICE" =~ ^[yY](es|es)?$ ]]; then
        echo -e "${YELLOW}Installation du service...${NC}"
        run_as_sudo cp shiftplan.service /etc/systemd/system/shiftplan.service
        run_as_sudo systemctl daemon-reload
        run_as_sudo systemctl enable shiftplan
        run_as_sudo systemctl start shiftplan
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}[OK] Le service a été installé et démarré avec succès !${NC}"
            SYSTEMD_STARTED=true
        else
            echo -e "${RED}[ERREUR] Échec de l'installation du service.${NC}"
        fi
    else
        echo -e "${BLUE}Installation du service ignorée.${NC}"
    fi

elif [ "$DEPLOY_MODE" = "2" ]; then
    echo -e "\n${YELLOW}Configuration de l'environnement Docker...${NC}"
    
    # S'assurer que les fichiers de persistance existent pour éviter que Docker crée des dossiers vides
    touch db.json logs.json
    mkdir -p uploads

    # Écrire le fichier docker-compose.yml
    cat <<EOF > docker-compose.yml
version: '3.8'

services:
  shiftplan:
    build: .
    container_name: shiftplan-pro
    restart: always
    ports:
      - "$PORT:3000"
    volumes:
      - ./db.json:/app/db.json
      - ./logs.json:/app/logs.json
      - ./uploads:/app/uploads
EOF
    echo -e "${GREEN}[OK] Fichier 'docker-compose.yml' généré ! (Port mappé : $PORT -> 3000)${NC}"

    if command -v docker &> /dev/null; then
        read -p "Souhaitez-vous construire et démarrer le conteneur Docker maintenant ? [y/N] : " RUN_DOCKER
        if [[ "$RUN_DOCKER" =~ ^[yY](es|es)?$ ]]; then
            echo -e "${YELLOW}Construction et lancement du conteneur...${NC}"
            
            # Utiliser le format de commande de composition disponible
            if command -v docker-compose &> /dev/null; then
                docker-compose up -d --build
            elif docker compose version &> /dev/null; then
                docker compose up -d --build
            else
                docker build -t shiftplan-pro .
                docker run -d -p $PORT:3000 --name shiftplan-pro -v $(pwd)/db.json:/app/db.json -v $(pwd)/logs.json:/app/logs.json -v $(pwd)/uploads:/app/uploads --restart always shiftplan-pro
            fi

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}[OK] Le conteneur Docker a été lancé avec succès !${NC}"
                DOCKER_STARTED=true
            else
                echo -e "${RED}[ERREUR] Impossible de lancer le conteneur. Vérifiez le démon Docker.${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}[INFO] 'docker' n'est pas détecté. Vous pourrez exécuter le conteneur manuellement plus tard.${NC}"
    fi
else
    echo -e "${BLUE}Déploiement automatique ignoré.${NC}"
fi

SUDO_PREFIX=""
if [ "$EUID" -ne 0 ] && command -v sudo &> /dev/null; then
    SUDO_PREFIX="sudo "
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}${BOLD}      SHIFTPLAN PRO v${VERSION} - CONFIGURATION TERMINÉE !      ${NC}"
echo -e "${GREEN}====================================================${NC}"

if [ "$DEPLOY_MODE" = "1" ]; then
    if [ "$SYSTEMD_STARTED" = true ] || systemctl is-active --quiet shiftplan; then
        echo -e "L'application tourne en tâche de fond en tant que service systemd."
        echo -e "Statut : ${BOLD}${SUDO_PREFIX}systemctl status shiftplan${NC}"
    else
        echo -e "Pour démarrer manuellement le service :"
        echo -e "  ${BOLD}${SUDO_PREFIX}systemctl start shiftplan${NC}"
    fi
elif [ "$DEPLOY_MODE" = "2" ]; then
    if [ "$DOCKER_STARTED" = true ]; then
        echo -e "Le conteneur Docker tourne actuellement en arrière-plan."
        echo -e "Suivi : ${BOLD}docker ps${NC} ou ${BOLD}docker compose ps${NC}"
        echo -e "Logs :  ${BOLD}docker compose logs -f${NC}"
    else
        echo -e "Pour démarrer votre conteneur Docker :"
        echo -e "  ${BOLD}docker compose up -d --build${NC}"
    fi
else
    echo -e "Pour démarrer l'application manuellement :"
    echo -e "  ${BOLD}npm start${NC}"
fi
echo -e "===================================================="
exit 0
