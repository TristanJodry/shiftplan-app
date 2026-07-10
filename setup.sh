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

# 5. Génération et installation du fichier service Systemd
echo -e "\n${YELLOW}[5/5] Configuration du service Systemd...${NC}"

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

read -p "Souhaitez-vous installer et activer ShiftPlan Pro en tant que service système (systemd) ? [y/N] : " INSTALL_SERVICE
if [[ "$INSTALL_SERVICE" =~ ^[yY](es|es)?$ ]]; then
    echo -e "${YELLOW}Installation du service...${NC}"
    run_as_sudo cp shiftplan.service /etc/systemd/system/shiftplan.service
    run_as_sudo systemctl daemon-reload
    run_as_sudo systemctl enable shiftplan
    run_as_sudo systemctl start shiftplan
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] Le service a été installé et démarré avec succès !${NC}"
    else
        echo -e "${RED}[ERREUR] Échec de l'installation du service.${NC}"
    fi
else
    echo -e "${BLUE}Installation du service ignorée.${NC}"
fi

SUDO_PREFIX=""
if [ "$EUID" -ne 0 ] && command -v sudo &> /dev/null; then
    SUDO_PREFIX="sudo "
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}${BOLD}      CONFIGURATION DE SHIFTPLAN PRO TERMINÉE !      ${NC}"
echo -e "${GREEN}====================================================${NC}"
if systemctl is-active --quiet shiftplan; then
    echo -e "L'application tourne actuellement en tant que service systemd."
    echo -e "Statut : ${BOLD}${SUDO_PREFIX}systemctl status shiftplan${NC}"
else
    echo -e "Pour démarrer l'application manuellement :"
    echo -e "  ${BOLD}npm start${NC}"
    echo ""
    echo -e "Si vous n'avez pas installé le service automatiquement :"
    echo -e "  1. Copiez le fichier service : ${BOLD}${SUDO_PREFIX}cp shiftplan.service /etc/systemd/system/shiftplan.service${NC}"
    echo -e "  2. Rechargez systemd :         ${BOLD}${SUDO_PREFIX}systemctl daemon-reload${NC}"
    echo -e "  3. Activez au démarrage :      ${BOLD}${SUDO_PREFIX}systemctl enable shiftplan${NC}"
    echo -e "  4. Démarrez le service :       ${BOLD}${SUDO_PREFIX}systemctl start shiftplan${NC}"
fi
echo -e "===================================================="
exit 0
