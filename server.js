import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { exec } from 'child_process';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de multer pour le stockage des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // On garde un nom fixe ou on génère un nom unique
    // L'utilisateur veut remplacer à chaque fois, donc on peut utiliser un nom fixe ou supprimer les anciens
    const ext = path.extname(file.originalname);
    cb(null, `background-${Date.now()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez PNG ou JPEG.'));
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const DB_FILE = path.join(__dirname, 'db.json');
  const LOGS_FILE = path.join(__dirname, 'logs.json');
  const UPLOADS_DIR = path.join(__dirname, 'uploads');

  // S'assurer que le dossier uploads existe
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  // Servir le dossier uploads
  app.use('/uploads', express.static(UPLOADS_DIR));

  // API: Lecture de la DB
  app.get('/api/db', (req, res) => {
    if (!fs.existsSync(DB_FILE)) {
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

  // API: Upload de fond d'écran
  app.post('/api/upload-bg', upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier envoyé' });
      }

      // Supprimer les anciens fichiers dans le dossier uploads (sauf le nouveau)
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        if (file !== req.file.filename) {
          fs.unlinkSync(path.join(UPLOADS_DIR, file));
        }
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      
      // Mettre à jour la DB directement pour le fond d'écran
      let db = { users: [], templates: [], assignments: [], holidays: [], backgroundImage: null };
      if (fs.existsSync(DB_FILE)) {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      }
      db.backgroundImage = imageUrl;
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

      res.json({ success: true, url: imageUrl });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }
  });

  // API: Lecture des logs
  app.get('/api/logs', (req, res) => {
    if (!fs.existsSync(LOGS_FILE)) {
      return res.json([]);
    }
    try {
      const data = fs.readFileSync(LOGS_FILE, 'utf8');
      res.json(JSON.parse(data));
    } catch (e) {
      res.status(500).json({ error: 'Erreur lecture logs' });
    }
  });

  // API: Ajout d'un log
  app.post('/api/logs', (req, res) => {
    try {
      let logs = [];
      if (fs.existsSync(LOGS_FILE)) {
        logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
      }
      const newLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...req.body
      };
      logs.unshift(newLog);
      if (logs.length > 1000) logs = logs.slice(0, 1000); // Augmenté pour l'historique complet
      
      fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
      res.json(newLog);
    } catch (e) {
      res.status(500).json({ error: 'Erreur écriture logs' });
    }
  });

  // API: Vérifier les mises à jour
  app.get('/api/check-update', (req, res) => {
    // Exécuter les commandes git pour voir si des commits distants manquent
    exec('git fetch origin && git log HEAD..origin/main --oneline', (error, stdout, stderr) => {
      if (error) {
        // Essayer origin/master si origin/main échoue
        exec('git fetch origin && git log HEAD..origin/master --oneline', (error2, stdout2, stderr2) => {
          if (error2) {
            // Si pas git ou pas internet, faire un fallback poli
            return res.json({
              success: true,
              isUpToDate: true,
              message: "Votre application est à jour (v1.1.0). (La vérification Git est indisponible hors-ligne)",
              commits: []
            });
          }
          const commits = stdout2.trim().split('\n').filter(Boolean);
          if (commits.length > 0) {
            return res.json({
              success: true,
              isUpToDate: false,
              message: `${commits.length} nouvelle(s) mise(s) à jour disponible(s) !`,
              commits: commits
            });
          } else {
            return res.json({
              success: true,
              isUpToDate: true,
              message: "Votre application est parfaitement à jour (v1.1.0).",
              commits: []
            });
          }
        });
        return;
      }
      
      const commits = stdout.trim().split('\n').filter(Boolean);
      if (commits.length > 0) {
        res.json({
          success: true,
          isUpToDate: false,
          message: `${commits.length} nouvelle(s) mise(s) à jour disponible(s) !`,
          commits: commits
        });
      } else {
        res.json({
          success: true,
          isUpToDate: true,
          message: "Votre application est parfaitement à jour (v1.1.0).",
          commits: []
        });
      }
    });
  });

  // API: Appliquer les mises à jour
  app.post('/api/apply-update', (req, res) => {
    exec('chmod +x update.sh && ./update.sh', (error, stdout, stderr) => {
      if (error) {
        console.error("Update failed", error);
        // On renvoie stdout et stderr pour aider au débugging
        return res.status(500).json({ 
          success: false, 
          message: "Échec de l'application de la mise à jour. Consultez les logs pour plus de détails.", 
          details: error.message,
          stdout: stdout,
          stderr: stderr
        });
      }
      res.json({ success: true, message: "La mise à jour a été appliquée avec succès !", output: stdout });
    });
  });

  // API: Lire les logs de mise à jour
  app.get('/api/update-log', (req, res) => {
    const logPath = path.join(process.cwd(), 'update.log');
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf8');
      res.json({ success: true, content: logContent });
    } else {
      res.status(404).json({ success: false, message: "Aucun log de mise à jour trouvé." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
