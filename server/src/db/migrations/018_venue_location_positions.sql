-- Venue map layout persistence: drag positions for the VenueMap sketch.
-- Nullable: locations without a saved position fall back to the client's
-- auto-layout grid.
ALTER TABLE venue_locations
  ADD COLUMN IF NOT EXISTS position_x DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS position_y DOUBLE PRECISION;
