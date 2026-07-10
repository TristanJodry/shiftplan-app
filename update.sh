#!/bin/bash

# Configuration des couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0;3m' # No Color
NC_BOLD='\033[1m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE_BOLD}          SHIFTPLAN PRO - DESTRUCTURÉ & MAJ         ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Vérifier si git est installé
if ! command -v git &> /dev/null; then
    echo -e "${RED}[ERREUR] 'git' n'est pas installé sur votre système. Impossible de vérifier les mises à jour.${NC}"
    exit 1
fi

# 2. Vérifier s'il s'agit d'un dépôt git valide
if [ ! -d .git ]; then
    echo -e "${RED}[ERREUR] Ce dossier n'est pas un dépôt git valide. Impossible de mettre à jour depuis GitHub.${NC}"
    exit 1
fi

# 3. Récupérer les informations de la branche distante
echo -e "${YELLOW}[1/4] Connexion à GitHub pour vérifier les mises à jour...${NC}"
git fetch origin
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERREUR] Impossible de se connecter à GitHub pour récupérer les dernières informations.${NC}"
    exit 1
fi

# Déterminer la branche courante (main ou master)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${BLUE}Branche active détectée : ${BRANCH}${NC}"

# Vérifier si on est en retard par rapport au serveur distant
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u} 2>/dev/null)

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}[AVERTISSEMENT] Pas de branche distante configurée pour le suivi. Tentative d'utiliser origin/${BRANCH}...${NC}"
    REMOTE=$(git rev-parse origin/${BRANCH} 2>/dev/null)
fi

if [ -z "$REMOTE" ]; then
    echo -e "${RED}[ERREUR] Impossible de trouver la branche distante correspondante origin/${BRANCH}.${NC}"
    exit 1
fi

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}[SUCCÈS] Votre application est déjà parfaitement à jour (v1.1.0). Aucune action requise !${NC}"
    exit 0
fi

# Nous sommes en retard, il y a des mises à jour
echo -e "${YELLOW}[INFO] Des mises à jour sont disponibles sur le serveur distant.${NC}"
echo -e "${YELLOW}Commits en attente de téléchargement :${NC}"
git log HEAD..${REMOTE} --oneline

echo -e "\n${YELLOW}[2/4] Téléchargement de la nouvelle mise à jour...${NC}"
git pull origin ${BRANCH}
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERREUR] Échec lors du téléchargement des mises à jour avec 'git pull'.${NC}"
    exit 1
fi
echo -e "${GREEN}[SUCCÈS] Code source mis à jour avec succès depuis GitHub.${NC}"

# 4. Réinstallation des dépendances
echo -e "${YELLOW}[3/4] Installation des dépendances (npm install)...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERREUR] Échec de l'installation des dépendances npm.${NC}"
    exit 1
fi
echo -e "${GREEN}[SUCCÈS] Dépendances npm installées.${NC}"

# 5. Build de production
echo -e "${YELLOW}[4/4] Compilation des assets de production (npm run build)...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERREUR] Échec de la compilation du projet avec 'npm run build'.${NC}"
    exit 1
fi

# 6. Redémarrage du service (si installé)
if systemctl is-active --quiet shiftplan; then
    echo -e "${YELLOW}Redémarrage du service systemd 'shiftplan'...${NC}"
    sudo systemctl restart shiftplan
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[SUCCÈS] Le service a été redémarré automatiquement.${NC}"
    else
        echo -e "${RED}[ERREUR] Impossible de redémarrer le service automatiquement.${NC}"
    fi
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN_BOLD}  [SUCCÈS] Mises à jour appliquées et build complété !  ${NC}"
if systemctl is-active --quiet shiftplan; then
    echo -e "${GREEN}  L'application a été mise à jour et redémarrée.      ${NC}"
else
    echo -e "${GREEN}  Relancez votre service ou exécutez 'npm start'      ${NC}"
fi
echo -e "${GREEN}====================================================${NC}"
exit 0
