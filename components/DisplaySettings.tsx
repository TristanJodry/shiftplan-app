import React, { useState } from 'react';
import { X, Image as ImageIcon, Layout, Check, RotateCcw, Upload, AlertCircle, Globe, Palette } from 'lucide-react';

interface DisplaySettingsProps {
  showWeekends: boolean;
  onToggleWeekends: (show: boolean) => void;
  moduleTheme: 'solid' | 'pastel';
  onSetModuleTheme: (theme: 'solid' | 'pastel') => void;
  backgroundImage: string | null;
  onSetBackgroundImage: (url: string | null) => void;
  bgOpacity: number;
  onSetBgOpacity: (opacity: number) => void;
  onClose: () => void;
}

const PRESET_BACKGROUNDS = [
  { name: 'Bureau Moderne', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Nature Calme', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Abstrait Bleu', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Architecture', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1920' },
];

export const DisplaySettings: React.FC<DisplaySettingsProps> = ({
  showWeekends, onToggleWeekends, moduleTheme, onSetModuleTheme, backgroundImage, onSetBackgroundImage, bgOpacity, onSetBgOpacity, onClose
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl) {
      onSetBackgroundImage(customUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // Limit to 2MB
        setUploadError("L'image est trop lourde (Max 2Mo)");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        try {
            onSetBackgroundImage(result);
            setUploadError(null);
        } catch (err) {
            setUploadError("Erreur lors de la sauvegarde.");
        }
    };
    reader.onerror = () => {
        setUploadError("Erreur lors de la lecture du fichier.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200 transition-colors">
        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Layout className="w-5 h-5 text-blue-600" />
            Personnalisation
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Calendar Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Affichage Calendrier</h3>
            
            {/* Weekends */}
            <label className="flex items-center justify-between p-3 border dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
              <span className="text-slate-700 dark:text-slate-200 font-medium">Afficher les week-ends</span>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${showWeekends ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${showWeekends ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={showWeekends} 
                onChange={(e) => onToggleWeekends(e.target.checked)} 
              />
            </label>

             {/* Module Theme */}
             <div className="space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-slate-500"/> Thème des modules
                </span>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => onSetModuleTheme('solid')}
                        className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${moduleTheme === 'solid' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                    >
                        <div className="flex gap-1">
                            <div className="w-4 h-4 rounded bg-blue-600"></div>
                            <div className="w-4 h-4 rounded bg-red-600"></div>
                        </div>
                        <span className={`text-xs font-bold ${moduleTheme === 'solid' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>Contrasté</span>
                    </button>

                    <button 
                        onClick={() => onSetModuleTheme('pastel')}
                        className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${moduleTheme === 'pastel' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                    >
                        <div className="flex gap-1">
                            <div className="w-4 h-4 rounded bg-blue-200 border border-blue-300"></div>
                            <div className="w-4 h-4 rounded bg-red-200 border border-red-300"></div>
                        </div>
                        <span className={`text-xs font-bold ${moduleTheme === 'pastel' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>Pastel</span>
                    </button>
                </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-700"></div>

          {/* Background Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Arrière-plan</h3>
                 <span className="flex items-center gap-1 text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold uppercase"><Globe className="w-3 h-3"/> Partagé</span>
               </div>
               {backgroundImage && (
                 <button onClick={() => onSetBackgroundImage(null)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                   <RotateCcw className="w-3 h-3"/> Réinitialiser
                 </button>
               )}
            </div>
            
            {/* Opacity Slider */}
            {backgroundImage && (
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Opacité du contenu</span>
                  <span className="text-xs font-bold text-blue-600">{Math.round(bgOpacity * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1" 
                  step="0.05" 
                  value={bgOpacity}
                  onChange={(e) => onSetBgOpacity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            )}

            {/* Custom Uploads */}
            <div className="space-y-2">
                <label className="flex items-center justify-center w-full px-4 py-2 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <Upload className="w-4 h-4" />
                    Importer une image (Max 2Mo)
                    <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileUpload} />
                </label>
                {uploadError && (
                    <div className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {uploadError}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 my-2">
                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                <span className="text-xs text-slate-400 uppercase">Ou via URL</span>
                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
            </div>

            {/* URL Input */}
            <form onSubmit={handleCustomUrlSubmit} className="flex gap-2">
              <div className="relative flex-1">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ImageIcon className="h-4 w-4 text-slate-400" />
                 </div>
                 <input 
                   type="text" 
                   placeholder="https://..." 
                   className="w-full pl-9 pr-3 py-2 text-sm border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white"
                   value={customUrl}
                   onChange={(e) => setCustomUrl(e.target.value)}
                 />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg font-medium text-sm">OK</button>
            </form>

            {/* Presets */}
            <div className="grid grid-cols-2 gap-2 mt-4">
               {PRESET_BACKGROUNDS.map((bg) => (
                 <button
                   key={bg.name}
                   onClick={() => onSetBackgroundImage(bg.url)}
                   className={`relative h-20 rounded-lg overflow-hidden group border-2 transition-all ${backgroundImage === bg.url ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-transparent hover:border-blue-300'}`}
                 >
                   <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-bold">{bg.name}</span>
                   </div>
                   {backgroundImage === bg.url && (
                     <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                       <Check className="w-3 h-3 text-white" />
                     </div>
                   )}
                 </button>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};