import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { normalizeImageUrl } from '../services/eventService';
import { playClickBeep, playSuccessBeep } from '../utils/audioFeedback';
import { compressImage } from '../utils/imageCompressor';

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onOpenGallery?: () => void;
  placeholder?: string;
  recommendedSize?: string;
  previewHeight?: string; // e.g. "h-36" or "h-24"
  storageFolder?: string; // default "cms/images"
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  value,
  onChange,
  onOpenGallery,
  placeholder = 'Cole a URL da imagem ou faça o upload direto...',
  recommendedSize,
  previewHeight = 'h-36',
  storageFolder = 'cms/images'
}) => {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validação básica do tipo
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP, SVG).');
      return;
    }

    // Tamanho máximo sugerido: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('A imagem selecionada é muito pesada. Limite máximo recomendado: 10MB.');
      return;
    }

    setErrorMessage('');
    setUploading(true);
    setProgress(5);
    playClickBeep();

    // Compressão automática no cliente antes do envio:
    // Redimensiona imagem para largura máxima de 1280px e converte para JPEG com qualidade 0.8.
    // Isso evita estourar o limite de 15 segundos no upload móvel e acelera o carregamento.
    let uploadFile = file;
    try {
      uploadFile = await compressImage(file, { maxWidth: 1280, quality: 0.8 });
    } catch (compressionErr) {
      console.warn('Compressão automática falhou, usando arquivo original:', compressionErr);
    }

    const fallbackToLocalDataUrl = (reasonMessage?: string) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (dataUrl) {
            onChange(dataUrl);
            playSuccessBeep();
            setErrorMessage(
              reasonMessage || 'Imagem carregada localmente com sucesso para continuidade da sua edição!'
            );
          }
          setUploading(false);
          setProgress(100);
        };
        reader.onerror = () => {
          setErrorMessage('Erro ao converter arquivo localmente.');
          setUploading(false);
        };
        reader.readAsDataURL(uploadFile);
      } catch {
        setErrorMessage('Não foi possível processar a imagem localmente.');
        setUploading(false);
      }
    };

    // Sanitiza nome do arquivo
    const cleanFileName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${storageFolder}/${Date.now()}_${cleanFileName}`;

    let isCompleted = false;
    let uploadTimeout: any = null;

    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, uploadFile);

      // Timeout resiliente de 15 segundos
      uploadTimeout = setTimeout(() => {
        if (!isCompleted) {
          isCompleted = true;
          try {
            uploadTask.cancel();
          } catch {}
          fallbackToLocalDataUrl(
            'Aviso: O envio ao Storage demorou mais que o esperado (timeout 15s). A imagem foi processada localmente com sucesso para que você possa continuar sua edição!'
          );
        }
      }, 15000);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (!isCompleted) {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setProgress(percent);
          }
        },
        async (error: any) => {
          if (isCompleted) return;
          isCompleted = true;
          if (uploadTimeout) clearTimeout(uploadTimeout);
          console.warn('Firebase Storage upload error:', error);
          fallbackToLocalDataUrl(
            'Aviso: O Firebase Storage não respondeu ou recusou a gravação direta. A imagem foi carregada localmente com sucesso para continuar sua edição!'
          );
        },
        async () => {
          if (isCompleted) return;
          isCompleted = true;
          if (uploadTimeout) clearTimeout(uploadTimeout);
          // Sucesso no Firebase Storage
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            onChange(downloadUrl);
            playSuccessBeep();
            setUploading(false);
            setProgress(100);
          } catch (err: any) {
            console.warn('Error getting download URL:', err);
            fallbackToLocalDataUrl('Imagem enviada, mas obtida localmente com sucesso.');
          }
        }
      );
    } catch (err: any) {
      if (uploadTimeout) clearTimeout(uploadTimeout);
      console.warn('Error starting Firebase upload:', err);
      fallbackToLocalDataUrl('Aviso: Firebase Storage não disponível no momento. A imagem foi carregada localmente com sucesso.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Header com Rótulo e Alternador de Modo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-stone-300">
            {label}
          </label>
          {recommendedSize && (
            <span className="text-[10px] font-mono text-stone-500">
              ({recommendedSize})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenGallery && (
            <button
              type="button"
              onClick={onOpenGallery}
              className="px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-amber-400 text-[11px] font-semibold transition-all flex items-center gap-1"
            >
              <span>🖼️</span>
              <span>Galeria</span>
            </button>
          )}

          <div className="inline-flex rounded-lg bg-stone-950 p-0.5 border border-stone-800 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                mode === 'upload'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Upload Local
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                mode === 'url'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Via URL
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Erro ou Fallback */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs leading-relaxed flex items-start gap-2">
          <span className="text-amber-400 mt-0.5">ℹ️</span>
          <div className="flex-1">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-stone-400 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input File Oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Modo Upload Direto (Arrastar / Clicar) */}
      {mode === 'upload' && (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (!uploading && fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragOver
                ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
                : uploading
                ? 'border-amber-500/50 bg-stone-950/80 cursor-wait'
                : 'border-stone-800 hover:border-amber-500/50 bg-stone-950 hover:bg-stone-900/40'
            }`}
          >
            {uploading ? (
              <div className="space-y-3">
                <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-400">
                    Enviando imagem para o Firebase Storage... {progress}%
                  </p>
                  <div className="w-48 max-w-full h-1.5 bg-stone-900 rounded-full mx-auto overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl group-hover:scale-110 transition-transform">
                  ☁️
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-200">
                    Clique para selecionar ou arraste uma foto aqui
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    PNG, JPG, WEBP ou SVG (salvo no Firebase Storage)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modo URL Externa */}
      {mode === 'url' && (
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="px-3 py-2 bg-stone-900 border border-stone-800 text-stone-400 hover:text-white rounded-xl text-xs"
              title="Limpar imagem"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Pré-visualização ao Vivo com Botões de Ação */}
      {value && (
        <div className={`relative ${previewHeight} rounded-2xl overflow-hidden border border-stone-800 group`}>
          <img
            src={normalizeImageUrl(value)}
            alt="Preview"
            className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/assets/images/hero_rock_chopp_event_1790270216046.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3">
            <span className="text-[11px] font-mono text-stone-300 truncate max-w-[70%]">
              {value.startsWith('data:') ? 'Imagem Local Carregada' : value}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                    fileInputRef.current.click();
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black border border-stone-700 text-stone-200 text-[10px] font-bold"
              >
                Trocar
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 text-[10px] font-bold"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
