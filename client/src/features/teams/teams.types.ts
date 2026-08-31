export interface ParticipantProfile {
  id: string;
  event_id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  bio: string | null;
  experience_level: string | null;
  preferred_role: string | null;
  looking_for_team: boolean;
  tech_stack_summary: string | null;
  tech_stack: TechTag[];
  created_at: string;
  updated_at: string;
}

export interface TechTag {
  id: string;
  name: string;
  category: string | null;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  max_size: number;
  status: string;
  created_by: string;
  creator_name: string;
  member_count: number;
  members: TeamMember[];
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  full_name: string;
  email: string;
  bio: string | null;
  experience_level: string | null;
  preferred_role: string | null;
  tech_stack_summary: string | null;
}

export interface TeamApplication {
  id: string;
  team_id: string;
  participant_profile_id: string;
  message: string | null;
  status: string;
  user_id: string;
  bio: string | null;
  experience_level: string | null;
  tech_stack_summary: string | null;
  full_name: string;
  email: string;
  created_at: string;
}