import React, { useState } from 'react';
import { HardDrive, Loader2, Sparkles, FolderSync, CheckCircle2 } from 'lucide-react';
import { googlePickerService, PickedDriveFile, PickerViewMode } from '../../utils/googlePickerService';
import { googleDriveService } from '../../utils/googleDriveService';

interface GooglePickerButtonProps {
  onFilesSelected: (files: PickedDriveFile[]) => void;
  viewMode?: PickerViewMode;
  multiSelect?: boolean;
  title?: string;
  buttonText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'amber';
  allowedMimeTypes?: string[];
  disabled?: boolean;
  showIcon?: boolean;
}

export const GooglePickerButton: React.FC<GooglePickerButtonProps> = ({
  onFilesSelected,
  viewMode = 'all',
  multiSelect = false,
  title = 'Pick Documents from Google Drive',
  buttonText = 'Pick from Google Drive',
  className = '',
  size = 'md',
  variant = 'primary',
  allowedMimeTypes,
  disabled = false,
  showIcon = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [successBadge, setSuccessBadge] = useState<string | null>(null);

  const handleClick = async () => {
    if (isLoading || disabled) return;
    setIsLoading(true);
    try {
      const picked = await googlePickerService.openPicker({
        viewMode: viewMode as PickerViewMode,
        multiSelect,
        title,
        allowedMimeTypes,
        includeUploadView: true,
      });

      if (picked && picked.length > 0) {
        setSuccessBadge(`${picked.length} selected`);
        setTimeout(() => setSuccessBadge(null), 3000);
        onFilesSelected(picked);
      }
    } catch (err: any) {
      console.warn('Google Picker invocation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-3.5 py-2 text-xs font-semibold rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-sm font-bold rounded-xl gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs border border-indigo-700 active:scale-[0.98]',
    secondary:
      'bg-slate-800 hover:bg-slate-900 text-white shadow-xs border border-slate-700 active:scale-[0.98]',
    outline:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 active:scale-[0.98] shadow-2xs',
    amber:
      'bg-amber-600 hover:bg-amber-700 text-white shadow-xs border border-amber-700 active:scale-[0.98]',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition cursor-pointer select-none ${sizeClasses[size]} ${variantClasses[variant]} ${
        disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''
      } ${className}`}
      title={title}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : successBadge ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      ) : showIcon ? (
        <HardDrive className="w-4 h-4 text-current" />
      ) : null}

      <span>
        {isLoading
          ? 'Opening Google Drive...'
          : successBadge
          ? `Picked ${successBadge}`
          : buttonText}
      </span>
    </button>
  );
};
