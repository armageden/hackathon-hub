'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import type { HardwareCheckout } from '../types';
import { Package, AlertTriangle } from 'lucide-react';
import { formatRelativeTime, formatDateTime } from '@/lib/formatters';

// API may enrich checkout rows with these display fields
type EnrichedCheckout = HardwareCheckout & {
  hardware_item_name?: string;
  borrower_name?: string;
};

const returnSchema = z.object({
  checkout_id: z.string().uuid(),
  condition: z.enum(['new', 'good', 'fair', 'damaged']),
  received_by: z.string().uuid(),
  notes: z.string().optional(),
});

type ReturnFormData = z.infer<typeof returnSchema>;

interface ReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkout: EnrichedCheckout | null;
  organizers: Array<{ id: string; full_name: string; email: string }>;
  onSubmit: (data: ReturnFormData) => Promise<void>;
  isLoading?: boolean;
}

export function ReturnModal({ open, onOpenChange, checkout, organizers, onSubmit, isLoading }: ReturnModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      checkout_id: checkout?.id ?? '',
      condition: 'good',
      received_by: '',
      notes: '',
    },
  });

  const condition = watch('condition');
  const isDamaged = condition === 'damaged';

  const handleClose = () => {
    onOpenChange(false);
    reset({ checkout_id: checkout?.id ?? '', condition: 'good', received_by: '', notes: '' });
  };

  const handleFormSubmit = async (data: ReturnFormData) => {
    try {
      await onSubmit(data);
      handleClose();
    } catch {
      // Error handled by mutation
    }
  };

  if (!checkout) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Return Hardware</DialogTitle>
          <DialogDescription>
            Process the return of <strong>{checkout.hardware_item_name}</strong> from {checkout.borrower_name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Checkout Info */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-lg">
                  <Package className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium text-white">{checkout.hardware_item_name}</p>
                  <p className="text-sm text-gray-400">Checked out: {formatRelativeTime(checkout.checked_out_at)}</p>
                  {checkout.due_at && (
                    <p className="text-sm text-gray-400">Due: {formatDateTime(checkout.due_at)}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={checkout.status} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Condition */}
          <Select
            label="Condition on Return *"
            placeholder="Select condition"
            options={[
              { value: 'new', label: 'New' },
              { value: 'good', label: 'Good' },
              { value: 'fair', label: 'Fair' },
              { value: 'damaged', label: 'Damaged' },
            ]}
            {...register('condition')}
            error={errors.condition?.message}
          />

          {isDamaged && (
            <div className="p-3 bg-amber-900/30 border border-amber-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Damaged condition selected</span>
              </div>
              <p className="text-sm text-amber-300 mt-1">
                A damage report will be automatically created. Please add details in the notes field.
              </p>
            </div>
          )}

          {/* Received By */}
          <Select
            label="Received By *"
            placeholder="Select organizer"
            options={organizers.map(o => ({ value: o.id, label: `${o.full_name} (${o.email})` }))}
            {...register('received_by')}
            error={errors.received_by?.message}
          />

          {/* Notes */}
          <Input
            label="Notes"
            placeholder={isDamaged ? 'Describe the damage...' : 'Optional notes about this return'}
            {...register('notes')}
            error={errors.notes?.message}
          />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} disabled={isLoading} variant={isDamaged ? 'danger' : 'primary'}>
              {isDamaged ? 'Return as Damaged' : 'Process Return'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
