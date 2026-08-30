import { formatRelativeTime } from '@/lib/formatters';
import { useEffect, useState } from 'react';
import { Save, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface AutoSaveIndicatorProps {
  isDirty: boolean;
  isSaving: boolean;
  lastSaved?: Date | null;
  error?: string | null;
}

export function AutoSaveIndicator({ isDirty, isSaving, lastSaved, error }: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (lastSaved && !isDirty && !isSaving) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved, isDirty, isSaving]);

  if (!isDirty && !isSaving && !lastSaved && !error) {
    return null;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400" role="alert">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>Save failed: {error}</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Save className="h-4 w-4 animate-spin flex-shrink-0" />
        <span>Saving...</span>
      </div>
    );
  }

  if (showSaved) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400 animate-in fade-in slide-in-from-bottom-1">
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        <span>Saved</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span>Saved {formatRelativeTime(lastSaved)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-amber-400">
      <Clock className="h-4 w-4 flex-shrink-0" />
      <span>Unsaved changes</span>
    </div>
  );
}

// Hook for auto-save functionality
import { useCallback, useRef } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({ data, onSave, delay = 2000, enabled = true }: UseAutoSaveOptions<T>) {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedDataRef = useRef<unknown>(data);

  const save = useCallback(async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(data);
      setLastSaved(new Date());
      setIsDirty(false);
      lastSavedDataRef.current = JSON.parse(JSON.stringify(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [data, isDirty, isSaving, onSave]);

  useEffect(() => {
    if (!enabled) return;

    const hasChanged = JSON.stringify(data) !== JSON.stringify(lastSavedDataRef.current);
    setIsDirty(hasChanged);

    if (hasChanged) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(save, delay);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, enabled, delay, save]);

  const forceSave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    save();
  }, [save]);

  return { isDirty, isSaving, lastSaved, error, forceSave };
}