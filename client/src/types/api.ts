/**
 * Shared API types - matches backend response format
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams extends PaginationParams {
  search?: string;
  status?: string;
  category?: string;
  [key: string]: unknown;
}

/**
 * User & Auth
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  global_role: 'admin' | 'user';
  admin_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

export interface MeResponse {
  success: boolean;
  data: {
    user: User;
  };
}

/**
 * Event
 */
export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: 'draft' | 'active' | 'archived';
  settings: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventMember {
  id: string;
  event_id: string;
  user_id: string;
  role: 'organizer' | 'participant' | 'volunteer' | 'judge';
  status: 'active' | 'pending' | 'removed';
  joined_at: string;
  user?: User;
}

export interface CreateEventRequest {
  name: string;
  slug: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {}

/**
 * Hardware
 */
export interface HardwareItem {
  id: string;
  event_id: string;
  name: string;
  category: string | null;
  model: string | null;
  serial_number: string | null;
  quantity_available: number;
  condition: string;
  status: 'available' | 'checked_out' | 'damaged' | 'lost' | 'retired';
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HardwareCheckout {
  id: string;
  event_id: string;
  hardware_item_id: string;
  borrower_user_id: string;
  checked_out_by: string;
  checked_out_at: string;
  due_at: string | null;
  status: 'active' | 'overdue' | 'returned' | 'damaged';
  notes: string | null;
  hardware_item?: HardwareItem;
  borrower?: User;
}

export interface HardwareReturn {
  id: string;
  checkout_id: string;
  returned_at: string;
  condition: string | null;
  received_by: string;
  notes: string | null;
}

export interface HardwareDamageReport {
  id: string;
  event_id: string;
  hardware_item_id: string;
  checkout_id: string | null;
  reported_by: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  status: 'open' | 'resolved';
  resolved_at: string | null;
  created_at: string;
}

export interface CreateHardwareItemRequest {
  name: string;
  category?: string;
  model?: string;
  serial_number?: string;
  quantity_available?: number;
  condition?: string;
  location?: string;
  notes?: string;
  status?: string;
}

export interface UpdateHardwareItemRequest extends Partial<CreateHardwareItemRequest> {}

export interface CheckoutHardwareRequest {
  hardware_item_id: string;
  borrower_user_id: string;
  due_at?: string;
  notes?: string;
}

export interface ReturnHardwareRequest {
  checkout_id: string;
  condition: string;
  received_by: string;
  notes?: string;
  damage_severity?: 'minor' | 'moderate' | 'major' | 'critical';
}

export interface CreateDamageReportRequest {
  hardware_item_id: string;
  checkout_id?: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

export interface HardwareAnalytics {
  totalItems: number;
  availableItems: number;
  checkedOutItems: number;
  damagedItems: number;
  overdueItems: number;
  activeCheckouts: number;
  itemsByCategory: Record<string, number>;
  itemsByStatus: Record<string, number>;
  checkoutsOverTime: Array<{ date: string; count: number }>;
  topBorrowedItems: Array<{ item: HardwareItem; checkoutCount: number }>;
}

/**
 * Venue
 */
export interface VenueLocation {
  id: string;
  event_id: string;
  name: string;
  location_type: 'room' | 'booth' | 'table' | 'stage' | 'lab' | 'desk';
  capacity: number | null;
  description: string | null;
  position_x?: number | null;
  position_y?: number | null;
  created_at: string;
}

export interface VenueAssignment {
  id: string;
  event_id: string;
  venue_location_id: string;
  assignable_type: 'team' | 'project' | 'exhibit';
  team_id: string | null;
  project_submission_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  assigned_by: string;
  status: 'active' | 'cancelled';
  created_at: string;
  venue_location?: VenueLocation;
  team?: { id: string; name: string };
  project?: { id: string; title: string };
}

export interface CreateVenueLocationRequest {
  name: string;
  location_type: 'room' | 'booth' | 'table' | 'stage' | 'lab' | 'desk';
  capacity?: number;
  description?: string;
  position_x?: number | null;
  position_y?: number | null;
}

export interface UpdateVenueLocationRequest extends Partial<CreateVenueLocationRequest> {}

export interface CreateVenueAssignmentRequest {
  venue_location_id: string;
  assignable_type: 'team' | 'project' | 'exhibit';
  team_id?: string;
  project_submission_id?: string;
  starts_at?: string;
  ends_at?: string;
}

export interface UpdateVenueAssignmentRequest extends Partial<CreateVenueAssignmentRequest> {}

export interface ScheduleGridItem {
  location: VenueLocation;
  assignments: VenueAssignment[];
}

/**
 * Projects
 */
export interface ProjectSubmission {
  id: string;
  event_id: string;
  team_id: string;
  title: string;
  description: string | null;
  repo_url: string | null;
  demo_url: string | null;
  status: 'draft' | 'submitted' | 'disqualified';
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  team?: { id: string; name: string };
  team_name?: string;
  scores?: JudgingScore[];
  is_own?: boolean;
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  repo_url?: string;
  demo_url?: string;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {}

export interface SubmitProjectRequest {
  project_id: string;
}

/**
 * Judging
 */
export interface JudgingScore {
  id: string;
  project_submission_id: string;
  judge_user_id: string;
  judge_name?: string;
  judge_email?: string;
  score_total: number | null;
  score_innovation: number | null;
  score_technical: number | null;
  score_presentation: number | null;
  score_usefulness: number | null;
  feedback: string | null;
  submitted_at: string;
  judge?: User;
}

export interface SubmitScoresRequest {
  project_submission_id: string;
  score_innovation: number;
  score_technical: number;
  score_presentation: number;
  score_usefulness: number;
  feedback?: string;
}

export interface LeaderboardEntry {
  project_submission_id: string;
  project_title: string;
  team_name: string;
  team_id: string;
  scores: {
    innovation: number;
    technical: number;
    presentation: number;
    usefulness: number;
    total: number;
  };
  judge_count: number;
  feedback?: string[];
  rank: number;
  previous_rank?: number;
}

export interface JudgingAnalytics {
  totalSubmissions: number;
  scoredSubmissions: number;
  averageScores: {
    innovation: number;
    technical: number;
    presentation: number;
    usefulness: number;
    total: number;
  };
  scoreDistributions: {
    innovation: number[];
    technical: number[];
    presentation: number[];
    usefulness: number[];
    total: number[];
  };
  judgeAgreement: number[][];
  criteriaCorrelations: Record<string, number>;
}

/**
 * Participant Profiles & Teams
 */
export interface ParticipantProfile {
  id: string;
  event_id: string;
  user_id: string;
  bio: string | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  preferred_role: string | null;
  looking_for_team: boolean;
  tech_stack_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  max_size: number;
  status: 'forming' | 'full' | 'dissolved';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'member';
  assigned_by: string | null;
  joined_at: string;
  user?: User;
}

export interface TeamApplication {
  id: string;
  team_id: string;
  participant_profile_id: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
}

/**
 * Itinerary & Check-in
 */
export interface ItineraryItem {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  session_type: string;
  status: 'active' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  event_id: string;
  user_id: string;
  itinerary_item_id: string | null;
  method: 'qr' | 'manual';
  checked_in_by: string | null;
  checked_in_at: string;
  status: string;
}

/**
 * Budget
 */
export interface Sponsor {
  id: string;
  event_id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  tier: string | null;
  notes: string | null;
  created_at: string;
}

export interface SponsorContribution {
  id: string;
  sponsor_id: string;
  event_id: string;
  contribution_type: 'cash' | 'in_kind';
  amount: number;
  description: string | null;
  received_at: string | null;
  recorded_by: string;
}

export interface Expenditure {
  id: string;
  event_id: string;
  category: string;
  amount: number;
  vendor: string | null;
  description: string | null;
  spent_at: string | null;
  recorded_by: string;
  approved_by: string | null;
}

export interface BudgetSummary {
  totalSponsorship: number;
  totalExpenditures: number;
  remainingBudget: number;
  byCategory: Record<string, number>;
  bySponsor: Record<string, number>;
}

/**
 * Certificates
 */
export interface Certificate {
  id: string;
  event_id: string;
  user_id: string;
  certificate_type: 'attendance' | 'completion' | 'volunteer' | 'judge';
  status: 'eligible' | 'issued' | 'revoked';
  verification_code: string | null;
  issued_at: string | null;
  revoked_at: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Incidents
 */
export interface Incident {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  location: string | null;
  reported_by: string;
  assigned_to: string | null;
  occurred_at: string | null;
  resolved_at: string | null;
  reporter?: User;
  assignee?: User;
}

/**
 * Volunteers
 */
export interface VolunteerShift {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  required_skills: string | null;
  status: 'open' | 'full' | 'cancelled';
}

export interface VolunteerAssignment {
  id: string;
  volunteer_shift_id: string;
  user_id: string;
  status: 'assigned' | 'checked_in' | 'completed' | 'no_show';
  assigned_by: string | null;
  checked_in_at: string | null;
  completed_at: string | null;
}