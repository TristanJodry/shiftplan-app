#!/bin/bash

# Fichier de log
LOG_FILE="update.log"
echo "--- Nouvelle tentative de mise à jour : $(date) ---" >> "$LOG_FILE"

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

# Extraire la version actuelle
VERSION=$(grep '"version":' package.json | cut -d'"' -f4)

log "${BLUE}====================================================${NC}"
log "${BLUE_BOLD}          SHIFTPLAN PRO - MISE À JOUR & LOGS        ${NC}"
log "${BLUE}====================================================${NC}"

# 1. Vérifier si git est installé
if ! command -v git &> /dev/null; then
    log "${RED}[ERREUR] 'git' n'est pas installé sur votre système. Impossible de vérifier les mises à jour.${NC}"
    exit 1
fi

# 2. Vérifier s'il s'agit d'un dépôt git valide
if [ ! -d .git ]; then
    log "${RED}[ERREUR] Ce dossier n'est pas un dépôt git valide. Impossible de mettre à jour depuis GitHub.${NC}"
    exit 1
fi

# 3. Récupérer les informations de la branche distante
log "${YELLOW}[1/4] Connexion à GitHub pour vérifier les mises à jour...${NC}"
git fetch origin >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    log "${RED}[ERREUR] Impossible de se connecter à GitHub pour récupérer les dernières informations.${NC}"
    exit 1
fi

# Déterminer la branche courante (main ou master)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "${BLUE}Branche active détectée : ${BRANCH}${NC}"

# Vérifier si on est en retard par rapport au serveur distant
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u} 2>/dev/null)

if [ $? -ne 0 ]; then
    log "${YELLOW}[AVERTISSEMENT] Pas de branche distante configurée pour le suivi. Tentative d'utiliser origin/${BRANCH}...${NC}"
    REMOTE=$(git rev-parse origin/${BRANCH} 2>/dev/null)
fi

if [ -z "$REMOTE" ]; then
    log "${RED}[ERREUR] Impossible de trouver la branche distante correspondante origin/${BRANCH}.${NC}"
    exit 1
fi

if [ "$LOCAL" = "$REMOTE" ]; then
    log "${GREEN}[SUCCÈS] Shiftplan est à jour (v${VERSION})${NC}"
    exit 0
fi

# Nous sommes en retard, il y a des mises à jour
log "${YELLOW}[INFO] Des mises à jour sont disponibles sur le serveur distant.${NC}"
log "${YELLOW}Commits en attente de téléchargement :${NC}"
git log HEAD..${REMOTE} --oneline | tee -a "$LOG_FILE"

log "\n${YELLOW}[2/4] Téléchargement de la nouvelle mise à jour...${NC}"
# Mettre de côté les modifications locales (comme les scripts modifiés)
git stash >> "$LOG_FILE" 2>&1
git pull origin ${BRANCH} >> "$LOG_FILE" 2>&1
PULL_STATUS=$?
# Réappliquer les modifications locales
git stash pop >> "$LOG_FILE" 2>&1
if [ $PULL_STATUS -ne 0 ]; then
    log "${RED}[ERREUR] Échec lors du téléchargement des mises à jour avec 'git pull'.${NC}"
    log "${YELLOW}[CONSEIL] Si le conflit persiste, essayez : git stash && git pull && git stash pop${NC}"
    exit 1
fi
log "${GREEN}[SUCCÈS] Code source mis à jour avec succès depuis GitHub.${NC}"

# 4. Réinstallation des dépendances
log "${YELLOW}[3/4] Installation des dépendances (npm install)...${NC}"
npm install >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    log "${RED}[ERREUR] Échec de l'installation des dépendances npm.${NC}"
    exit 1
fi
log "${GREEN}[SUCCÈS] Dépendances npm installées.${NC}"

# 5. Build de production
log "${YELLOW}[4/4] Compilation des assets de production (npm run build)...${NC}"
npm run build >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    log "${RED}[ERREUR] Échec de la compilation du projet avec 'npm run build'.${NC}"
    exit 1
fi

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

# 6. Redémarrage du service (si installé)
if systemctl is-active --quiet shiftplan; then
    log "${YELLOW}Redémarrage du service systemd 'shiftplan'...${NC}"
    run_as_sudo systemctl restart shiftplan >> "$LOG_FILE" 2>&1
    if [ $? -eq 0 ]; then
        log "${GREEN}[SUCCÈS] Le service a été redémarré automatiquement.${NC}"
    else
        log "${RED}[ERREUR] Impossible de redémarrer le service automatiquement.${NC}"
    fi
fi

log "\n${GREEN}====================================================${NC}"
log "${GREEN_BOLD}      SHIFTPLAN A ÉTÉ MIS À JOUR (v${VERSION})      ${NC}"
log "${GREEN}====================================================${NC}"
if systemctl is-active --quiet shiftplan; then
    log "${GREEN}Statut : Service redémarré avec succès.${NC}"
else
    log "${YELLOW}Note : Relancez manuellement avec 'npm start'${NC}"
fi
echo -e "\n"
exit 0
