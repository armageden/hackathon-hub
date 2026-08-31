export interface ItineraryItem {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  location: string | null;
  room_area: string | null;
  speaker_name: string | null;
  materials_url: string | null;
  starts_at: string;
  ends_at: string;
  session_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}
