export interface Notification {
  id: string;
  event_id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read_at: string | null;
  link: string | null;
  created_at: string;
}
