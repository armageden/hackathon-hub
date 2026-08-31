-- Migration 019: Add checked_out_at to check_ins

ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;
