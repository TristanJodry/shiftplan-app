#!/bin/bash

# Fichier de log
LOG_FILE="update.log"
echo "--- Début de l'exécution de update_core.sh : $(date) ---" >> "$LOG_FILE"

# Fonction pour logger et afficher
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Configuration des couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
GREEN_BOLD='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BLUE_BOLD='\033[1;34m'
NC='\033[0m' # No Color
NC_BOLD='\033[1m'

# Fonction pour exécuter en tant qu'utilisateur non-root (si lancé via sudo)
run_as_user() {
    if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
        sudo -u "$SUDO_USER" "$@"
    else
        "$@"
    fi
}

# Extraire la version actuelle
VERSION=$(grep '"version":' package.json | cut -d'"' -f4)

log "${BLUE}====================================================${NC}"
log "${BLUE_BOLD}       SHIFTPLAN PRO - COMPILATION & REDÉMARRAGE     ${NC}"
log "${BLUE}====================================================${NC}"

# 1. Réinstallation des dépendances
log "${YELLOW}[1/3] Installation des dépendances (npm install)...${NC}"
run_as_user npm install >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    log "${RED}[ERREUR] Échec de l'installation des dépendances npm.${NC}"
    exit 1
fi
log "${GREEN}[SUCCÈS] Dépendances npm installées.${NC}"

# 2. Build de production
log "${YELLOW}[2/3] Compilation des assets de production (npm run build)...${NC}"
run_as_user npm run build >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    log "${RED}[ERREUR] Échec de la compilation du projet avec 'npm run build'.${NC}"
    exit 1
fi
log "${GREEN}[SUCCÈS] Compilation de production terminée.${NC}"

# Fonction pour exécuter avec sudo si nécessaire
run_as_sudo() {
    if [ "$EUID" -ne 0 ]; then
        if command -v sudo &> /dev/null; then
            sudo "$@"
        else
            log "${RED}[ERREUR] Cette opération nécessite des privilèges root mais 'sudo' n'est pas installé.${NC}"
            return 1
        fi
    else
        "$@"
    fi
}

# 3. Redémarrage des services (Systemd et/ou Docker)
log "${YELLOW}[3/3] Redémarrage des conteneurs / services...${NC}"

SERVICE_RESTARTED=false

# Gestion de Docker
if command -v docker &> /dev/null; then
    # Vérifier si un conteneur docker ou compose pour shiftplan tourne
    if run_as_sudo docker ps --format '{{.Names}}' | grep -q "shiftplan-pro" || [ -f "docker-compose.yml" ]; then
        log "${YELLOW}Détection d'un déploiement Docker. Redémarrage du conteneur...${NC}"
        if command -v docker-compose &> /dev/null; then
            run_as_sudo docker-compose up -d --build >> "$LOG_FILE" 2>&1
            if [ $? -eq 0 ]; then
                log "${GREEN}[SUCCÈS] Conteneur Docker reconstruit et redémarré via docker-compose.${NC}"
                SERVICE_RESTARTED=true
            fi
        elif docker compose version &> /dev/null; then
            run_as_sudo docker compose up -d --build >> "$LOG_FILE" 2>&1
            if [ $? -eq 0 ]; then
                log "${GREEN}[SUCCÈS] Conteneur Docker reconstruit et redémarré via docker compose.${NC}"
                SERVICE_RESTARTED=true
            fi
        else
            run_as_sudo docker build -t shiftplan-pro . >> "$LOG_FILE" 2>&1
            run_as_sudo docker stop shiftplan-pro >> "$LOG_FILE" 2>&1
            run_as_sudo docker rm shiftplan-pro >> "$LOG_FILE" 2>&1
            # Extraire le PORT depuis .env ou par défaut 3000
            PORT_ENV=$(grep "^PORT=" .env | cut -d'=' -f2)
            PORT_ENV=${PORT_ENV:-3000}
            run_as_sudo docker run -d -p $PORT_ENV:3000 --name shiftplan-pro -v $(pwd)/db.json:/app/db.json -v $(pwd)/logs.json:/app/logs.json -v $(pwd)/uploads:/app/uploads --restart always shiftplan-pro >> "$LOG_FILE" 2>&1
            if [ $? -eq 0 ]; then
                log "${GREEN}[SUCCÈS] Conteneur Docker manuel reconstruit et redémarré.${NC}"
                SERVICE_RESTARTED=true
            fi
        fi
    fi
fi

# Gestion de Systemd
if systemctl is-active --quiet shiftplan; then
    log "${YELLOW}Détection du service Systemd 'shiftplan'. Redémarrage...${NC}"
    run_as_sudo systemctl restart shiftplan >> "$LOG_FILE" 2>&1
    if [ $? -eq 0 ]; then
        log "${GREEN}[SUCCÈS] Le service Systemd a été redémarré automatiquement.${NC}"
        SERVICE_RESTARTED=true
    else
        log "${RED}[ERREUR] Impossible de redémarrer le service Systemd automatiquement.${NC}"
    fi
fi

log "\n${GREEN}====================================================${NC}"
log "${GREEN_BOLD}      SHIFTPLAN A ÉTÉ MIS À JOUR (v${VERSION})      ${NC}"
log "${GREEN}====================================================${NC}"
if [ "$SERVICE_RESTARTED" = true ]; then
    log "${GREEN}Statut : Services et/ou conteneurs redémarrés avec succès.${NC}"
else
    log "${YELLOW}Note : Aucun service automatique actif détecté. Relancez manuellement avec 'npm start' ou 'docker compose up -d'.${NC}"
fi
echo -e "\n"
exit 0
