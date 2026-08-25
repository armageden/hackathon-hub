-- Migration 016: uniqueness guarantees the application layer assumed existed.
-- The repositories use ON CONFLICT against (event_id, user_id, certificate_type)
-- and rely on check-in dedup, but migrations 006/011 never created those indexes.

-- 1. Certificates: one certificate per type per user per event.
-- Clear any existing duplicates first so the index can be built.
DELETE FROM certificates a
USING certificates b
WHERE a.event_id = b.event_id
  AND a.user_id = b.user_id
  AND a.certificate_type = b.certificate_type
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_event_user_type
  ON certificates (event_id, user_id, certificate_type);

-- 2. Check-ins: duplicate prevention was SELECT-then-INSERT only; concurrent
-- scans could both insert. Expression form keeps NULL itinerary_item_id rows
-- (whole-event check-ins) unique per user too.
DELETE FROM check_ins a
USING check_ins b
WHERE a.event_id = b.event_id
  AND a.user_id = b.user_id
  AND COALESCE(a.itinerary_item_id::text, '') = COALESCE(b.itinerary_item_id::text, '')
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_check_ins_event_user_item
  ON check_ins (
    event_id,
    user_id,
    COALESCE(itinerary_item_id::text, '')
  );
