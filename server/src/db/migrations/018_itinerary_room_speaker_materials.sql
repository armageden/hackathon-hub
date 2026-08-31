-- Migration 018: Add room_area, speaker_name, and materials_url to itinerary_items

ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS room_area VARCHAR(255);
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS speaker_name VARCHAR(255);
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS materials_url TEXT;
