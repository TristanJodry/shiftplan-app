import React, { useState } from 'react';
import { X, HelpCircle, Terminal, RefreshCw, CheckCircle, AlertTriangle, ExternalLink, Copy, Check, Flag } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
  syncFrenchHolidays: () => Promise<{ success: boolean; count?: number; error?: string }>;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose, syncFrenchHolidays }) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    success: boolean;
    isUpToDate?: boolean;
    message: string;
    commits?: string[];
  } | null>(null);

  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ success: boolean; message: string; logs?: string } | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const [syncingHolidays, setSyncingHolidays] = useState(false);
  const [holidaySyncStatus, setHolidaySyncStatus] = useState<{ success: boolean; count?: number; message: string } | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleCheckUpdate = async () => {
    setChecking(true);
    setUpdateStatus(null);
    try {
      const response = await fetch('/api/check-update');
      const data = await response.json();
      setUpdateStatus({
        success: data.success,
        isUpToDate: data.isUpToDate,
        message: data.message,
        commits: data.commits
      });
    } catch (err) {
      console.error(err);
      setUpdateStatus({
        success: false,
        message: "Impossible de joindre le serveur pour vérifier les mises à jour."
      });
    } finally {
      setChecking(false);
    }
  };

  const handleApplyUpdate = async () => {
    setUpdating(true);
    setUpdateResult(null);
    setShowLogs(false);
    try {
      const response = await fetch('/api/apply-update', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setUpdateResult({
          success: true,
          message: data.message || "La mise à jour a été appliquée avec succès ! L'application redémarre.",
          logs: data.output
        });
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setUpdateResult({
          success: false,
          message: data.message || "Impossible d'appliquer la mise à jour.",
          logs: (data.stdout || '') + '\n' + (data.stderr || '') + '\n' + (data.details || '')
        });
      }
    } catch (err) {
      console.error(err);
      setUpdateResult({
        success: false,
        message: "Impossible de joindre le serveur pour appliquer la mise à jour."
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSyncHolidays = async () => {
    setSyncingHolidays(true);
    setHolidaySyncStatus(null);
    const result = await syncFrenchHolidays();
    if (result.success) {
      if (result.count === 0) {
        setHolidaySyncStatus({
          success: true,
          count: 0,
          message: `Aucun nouveau jour férié trouvé.`
        });
      } else {
        setHolidaySyncStatus({
          success: true,
          count: result.count,
          message: `Mise à jour réussie : ${result.count} nouveaux jours fériés synchronisés (incluant la Sainte-Barbe le 4 décembre) !`
        });
      }
    } else {
      setHolidaySyncStatus({
        success: false,
        message: `Échec de la synchronisation : ${result.error || "Erreur inconnue"}`
      });
    }
    setSyncingHolidays(false);
  };

  const setupCommands = `./setup.sh`;
  const manualCommands = `npm install\nnpm run build\nnpm start`;
  const systemdService = `[Unit]
Description=ShiftPlan Pro Service
After=network.target

[Service]
Type=simple
User=administrateur
WorkingDirectory=/opt/shiftplan-pro
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=PORT=3000

[Install]
WantedBy=multi-user.target`;

  const systemdCommands = `sudo cp shiftplan.service /etc/systemd/system/shiftplan.service
sudo systemctl daemon-reload
sudo systemctl enable shiftplan
sudo systemctl start shiftplan
sudo systemctl status shiftplan`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 border dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Aide & Mises à jour</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">ShiftPlan Pro v1.2.0 • Stable</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          
          {/* GitHub & Update Check Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Dépôt GitHub du Projet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Suivez le développement et le versionnage.</p>
              </div>
              <a 
                href="https://github.com/TristanJodry/shiftplan-app" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <span>Accéder au GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800"></div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">Vérification des mises à jour</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Compare le code local avec le dépôt GitHub distant.</p>
                </div>
                <button
                  onClick={handleCheckUpdate}
                  disabled={checking}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                  <span>{checking ? 'Recherche...' : 'Vérifier'}</span>
                </button>
              </div>

              {updateStatus && (
                <div className={`p-4 rounded-lg border flex flex-col gap-3 text-xs ${
                  updateStatus.success 
                    ? updateStatus.isUpToDate 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300' 
                      : 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-300'
                    : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-300'
                }`}>
                  <div className="flex items-start gap-3">
                    {updateStatus.success ? (
                      updateStatus.isUpToDate ? (
                        <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                      )
                    ) : (
                      <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                    )}
                    <div className="space-y-1 flex-1">
                      <p className="font-semibold">{updateStatus.message}</p>
                      {updateStatus.commits && updateStatus.commits.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-amber-200/50 dark:border-amber-900/30 space-y-1">
                          <p className="font-bold">Derniers commits disponibles :</p>
                          <ul className="list-disc pl-4 space-y-0.5 font-mono text-[10px]">
                            {updateStatus.commits.map((commit, i) => (
                              <li key={i}>{commit}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {updateStatus.success && !updateStatus.isUpToDate && !updateResult && (
                    <div className="mt-2 pt-2 border-t border-amber-200/50 dark:border-amber-900/30 flex items-center justify-between gap-4">
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">Une mise à jour est disponible. Souhaitez-vous l'appliquer maintenant ?</p>
                      <button
                        onClick={handleApplyUpdate}
                        disabled={updating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded shadow-sm transition-colors disabled:opacity-50 shrink-0 animate-pulse"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
                        <span>{updating ? 'Application...' : 'Mettre à jour l\'application'}</span>
                      </button>
                    </div>
                  )}

                  {updateResult && (
                    <div className="space-y-2">
                      <div className={`p-2.5 rounded border text-[11px] font-semibold flex items-center justify-between ${updateResult.success ? 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300'}`}>
                        <span>{updateResult.message}</span>
                        {updateResult.logs && (
                          <button 
                            onClick={() => setShowLogs(!showLogs)}
                            className="text-[10px] underline hover:no-underline"
                          >
                            {showLogs ? 'Masquer les logs' : 'Voir les logs'}
                          </button>
                        )}
                      </div>
                      
                      {showLogs && updateResult.logs && (
                        <div className="bg-slate-900 rounded-lg p-3 text-slate-300 font-mono text-[10px] max-h-40 overflow-y-auto border border-slate-700">
                          <pre className="whitespace-pre-wrap">{updateResult.logs}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Jours Fériés (Etalab API) Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Base officielle des Jours Fériés (Etalab)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Synchronisation du calendrier public officiel français de l'État.</p>
              </div>
              <button
                onClick={handleSyncHolidays}
                disabled={syncingHolidays}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{syncingHolidays ? 'Synchronisation...' : 'Synchroniser'}</span>
              </button>
            </div>

            {holidaySyncStatus && (
              <div className={`p-3 rounded-lg border text-xs ${
                holidaySyncStatus.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                <p className="font-semibold">{holidaySyncStatus.message}</p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-2xl flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>Scripts : `setup.sh` & `update.sh`</span>
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Logs : `update.log`</span>
            </span>
          </div>
          <span>ShiftPlan Pro © 2026</span>
        </div>

      </div>
    </div>
  );
};
