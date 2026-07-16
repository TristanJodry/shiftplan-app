#!/bin/bash

# Fichier de log
LOG_FILE="update.log"
echo "--- Lancement de l'utilitaire de mise à jour stable : $(date) ---" >> "$LOG_FILE"

# Configuration des couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}          SHIFTPLAN PRO - PORTAIL DE MISE À JOUR    ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Vérification de Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}[ERREUR] 'git' n'est pas installé sur votre système. Impossible de mettre à jour.${NC}"
    exit 1
fi

if [ ! -d .git ]; then
    echo -e "${RED}[ERREUR] Ce dossier n'est pas un dépôt git valide. Impossible de mettre à jour depuis GitHub.${NC}"
    exit 1
fi

# Déterminer la branche active
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# 2. Récupérer et appliquer la mise à jour de manière sécurisée
echo -e "${YELLOW}Vérification et téléchargement des mises à jour depuis GitHub (${BRANCH})...${NC}"

# Mettre de côté temporairement toutes les modifications locales (y compris dans update.sh)
git stash >> "$LOG_FILE" 2>&1

# Pull les dernières modifications
git pull origin ${BRANCH} >> "$LOG_FILE" 2>&1
PULL_STATUS=$?

# Restaurer les modifications locales de l'utilisateur
git stash pop >> "$LOG_FILE" 2>&1

if [ $PULL_STATUS -ne 0 ]; then
    echo -e "${RED}[ERREUR] Échec du téléchargement des mises à jour via 'git pull'.${NC}"
    echo -e "${YELLOW}Conseil : Si des conflits bloquent la mise à jour, résolvez-les ou lancez :${NC}"
    echo -e "  git stash && git pull && git stash pop"
    exit 1
fi

echo -e "${GREEN}[SUCCÈS] Code source synchronisé avec succès depuis GitHub.${NC}"

# 3. Transférer le contrôle au script d'exécution des tâches complexes
if [ -f "./update_core.sh" ]; then
    chmod +x ./update_core.sh
    exec ./update_core.sh "$@"
else
    echo -e "${RED}[ERREUR] Le script principal 'update_core.sh' est introuvable après la mise à jour.${NC}"
    exit 1
fi
