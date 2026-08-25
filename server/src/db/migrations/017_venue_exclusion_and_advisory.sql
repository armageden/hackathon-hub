-- Migration 017: database-level serialization for double-booking and bulk
-- assignment races that app-level checks cannot close under concurrency.

-- Range-exclusion constraint: two ACTIVE assignments may never overlap in
-- time on the same location. NULL time windows are exempt (un-timed bookings).
-- Requires the GiST-comparable text type for the location column pairing.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE venue_assignments ADD CONSTRAINT venue_no_double_booking
  EXCLUDE USING gist (
    venue_location_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status = 'active' AND starts_at IS NOT NULL AND ends_at IS NOT NULL);
