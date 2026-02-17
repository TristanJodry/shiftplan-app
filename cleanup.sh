#!/bin/bash

# ==============================================================================
# SCRIPT DE NETTOYAGE SHIFTPLAN PRO
# Usage: ./cleanup.sh [nombre_de_mois]
# Exemple: ./cleanup.sh 12  (Garde les 12 derniers mois)
# ==============================================================================

# Configuration
DB_FILE="db.json"
BACKUP_FILE="db.json.bak"
DEFAULT_MONTHS=6

# Récupération de l'argument (nombre de mois), sinon valeur par défaut
RETENTION_MONTHS=${1:-$DEFAULT_MONTHS}

# Couleurs pour le terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}--- Nettoyage de la base de données ShiftPlan ---${NC}"
echo -e "Fichier cible : $DB_FILE"
echo -e "Rétention     : $RETENTION_MONTHS mois"

# 1. Vérifications préliminaires
if [ ! -f "$DB_FILE" ]; then
    echo -e "${RED}[Erreur] Le fichier $DB_FILE n'existe pas dans ce dossier.${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}[Erreur] Node.js n'est pas installé ou n'est pas dans le PATH.${NC}"
    exit 1
fi

# 2. Création d'une sauvegarde de sécurité
echo -e "Création d'une sauvegarde vers $BACKUP_FILE..."
cp "$DB_FILE" "$BACKUP_FILE"
if [ $? -ne 0 ]; then
    echo -e "${RED}[Erreur] Impossible de créer la sauvegarde. Annulation.${NC}"
    exit 1
fi

# 3. Exécution du nettoyage via Node.js (Inline)
# On utilise node -e pour exécuter du JS directement depuis le shell
# Cela permet de parser le JSON proprement sans outils externes comme jq
echo "Traitement des données..."

node -e "
const fs = require('fs');
const fileName = '$DB_FILE';
const months = parseInt('$RETENTION_MONTHS');

try {
    const rawData = fs.readFileSync(fileName, 'utf8');
    const data = JSON.parse(rawData);

    if (!data.assignments || !Array.isArray(data.assignments)) {
        console.log('Format de base de données invalide ou vide.');
        process.exit(0);
    }

    const initialCount = data.assignments.length;

    // Calcul de la date limite
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const cutoffISO = cutoffDate.toISOString().split('T')[0];

    console.log('  > Date limite calculée : ' + cutoffISO);

    // Filtrage
    const newAssignments = data.assignments.filter(a => a.date >= cutoffISO);
    const removedCount = initialCount - newAssignments.length;

    if (removedCount > 0) {
        data.assignments = newAssignments;
        fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
        console.log('  > Succès : ' + removedCount + ' entrées supprimées.');
    } else {
        console.log('  > Aucune donnée ancienne à supprimer.');
    }

} catch (e) {
    console.error('Erreur JS:', e);
    process.exit(1);
}
"

# Vérification du code de sortie de Node
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Opération terminée avec succès.${NC}"
else
    echo -e "${RED}Une erreur est survenue lors du traitement Node.js.${NC}"
    echo "Restauration de la sauvegarde..."
    cp "$BACKUP_FILE" "$DB_FILE"
fi
