#!/bin/bash

# Configuration des couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

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

# 5. Génération automatique du fichier service Systemd personnalisé
echo -e "\n${YELLOW}[OPTIONNEL] Génération du fichier Systemd personnalisé...${NC}"

CURRENT_DIR=$(pwd)
CURRENT_USER=$(whoami)

cat <<EOF > shiftplan.service
[Unit]
Description=ShiftPlan Pro Service
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=PORT=$PORT

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}[OK] Fichier de configuration systemd généré : 'shiftplan.service'${NC}"

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}${BOLD}      CONFIGURATION DE SHIFTPLAN PRO TERMINÉE !      ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "Pour démarrer l'application maintenant :"
echo -e "  ${BOLD}npm start${NC}"
echo ""
echo -e "Pour installer l'application en tant que service systemd persistant :"
echo -e "  1. Copiez le fichier service : ${BOLD}sudo cp shiftplan.service /etc/systemd/system/shiftplan.service${NC}"
echo -e "  2. Rechargez systemd :         ${BOLD}sudo systemctl daemon-reload${NC}"
echo -e "  3. Activez au démarrage :      ${BOLD}sudo systemctl enable shiftplan${NC}"
echo -e "  4. Démarrez le service :       ${BOLD}sudo systemctl start shiftplan${NC}"
echo -e "  5. Vérifiez le statut :        ${BOLD}sudo systemctl status shiftplan${NC}"
echo -e "===================================================="
exit 0
