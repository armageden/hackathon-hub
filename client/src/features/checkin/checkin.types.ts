export interface Checkin {
  id: string;
  event_id: string;
  user_id: string;
  itinerary_item_id: string | null;
  method: string;
  checked_in_by: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  status: string;
  full_name: string;
  email: string;
  session_title: string | null;
}

export interface CheckinStats {
  total_checkins: number;
  unique_users: number;
  qr_checkins: number;
  manual_checkins: number;
  session_stats: SessionStat[];
}

export interface SessionStat {
  session_id: string;
  session_title: string;
  checkin_count: number;
  unique_users: number;
}
