import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(express.json());

// Servir les fichiers statiques (le frontend compilé)
app.use(express.static(path.join(__dirname, 'dist')));

// API: Lecture de la DB
app.get('/api/db', (req, res) => {
  if (!fs.existsSync(DB_FILE)) {
    // Si pas de DB, on renvoie un objet vide pour que le frontend utilise ses données par défaut
    return res.json({}); 
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({ error: 'Erreur lecture DB' });
  }
});

// API: Écriture dans la DB
app.post('/api/db', (req, res) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur écriture DB' });
  }
});

// Toutes les autres routes renvoient l'app React (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});