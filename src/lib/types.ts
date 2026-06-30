export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      games: { Row: Game; Insert: Partial<Game>; Update: Partial<Game> };
      game_screenshots: { Row: GameScreenshot; Insert: Partial<GameScreenshot>; Update: Partial<GameScreenshot> };
      game_plans: { Row: GamePlan; Insert: Partial<GamePlan>; Update: Partial<GamePlan> };
      user_game_subscriptions: { Row: UserGameSubscription; Insert: Partial<UserGameSubscription>; Update: Partial<UserGameSubscription> };
      game_sessions: { Row: GameSession; Insert: Partial<GameSession>; Update: Partial<GameSession> };
      gpu_types: { Row: GpuType; Insert: Partial<GpuType>; Update: Partial<GpuType> };
      gpu_plans: { Row: GpuPlan; Insert: Partial<GpuPlan>; Update: Partial<GpuPlan> };
      gpu_rentals: { Row: GpuRental; Insert: Partial<GpuRental>; Update: Partial<GpuRental> };
      wallet_transactions: { Row: WalletTransaction; Insert: Partial<WalletTransaction>; Update: Partial<WalletTransaction> };
      support_tickets: { Row: SupportTicket; Insert: Partial<SupportTicket>; Update: Partial<SupportTicket> };
      ticket_replies: { Row: TicketReply; Insert: Partial<TicketReply>; Update: Partial<TicketReply> };
    };
  };
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  wallet_balance: number;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  title: string;
  description: string | null;
  genre: string;
  developer: string | null;
  publisher: string | null;
  thumbnail_url: string | null;
  banner_url: string | null;
  trailer_url: string | null;
  rating: number;
  release_year: number | null;
  is_featured: boolean;
  is_active: boolean;
  player_count_online: number;
  tags: string[];
  created_at: string;
}

export interface GameScreenshot {
  id: string;
  game_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface GamePlan {
  id: string;
  game_id: string;
  plan_type: 'hourly' | 'monthly' | 'yearly';
  price: number;
  hours_included: number | null;
  created_at: string;
}

export interface UserGameSubscription {
  id: string;
  user_id: string;
  game_id: string;
  plan_type: 'hourly' | 'monthly' | 'yearly';
  amount_paid: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  game?: Game;
}

export interface GameSession {
  id: string;
  user_id: string;
  game_id: string;
  subscription_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  is_trial: boolean;
  status: 'provisioning' | 'active' | 'ended' | 'expired';
  connection_info?: { stream_url?: string; container_name?: string; provider?: string; trial_seconds?: number };
  created_at: string;
  game?: Game;
}

export interface GpuType {
  id: string;
  name: string;
  model: string;
  description: string | null;
  vram_gb: number;
  cuda_cores: number | null;
  memory_bandwidth_gbps: number | null;
  tflops: number | null;
  tier: 'budget' | 'standard' | 'premium' | 'enterprise';
  use_cases: string[];
  thumbnail_url: string | null;
  is_available: boolean;
  stock_count: number;
  created_at: string;
}

export interface GpuPlan {
  id: string;
  gpu_type_id: string;
  plan_type: 'hourly' | 'monthly' | 'yearly';
  price: number;
  created_at: string;
}

export interface GpuRental {
  id: string;
  user_id: string;
  gpu_type_id: string;
  plan_type: 'hourly' | 'monthly' | 'yearly';
  workload_type: string;
  amount_paid: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  status: 'provisioning' | 'running' | 'stopped' | 'expired' | 'terminated';
  connection_info: Record<string, unknown>;
  created_at: string;
  gpu_type?: GpuType;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  balance_after: number | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: 'general' | 'billing' | 'technical' | 'gpu' | 'gaming' | 'account';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  replies?: TicketReply[];
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff: boolean;
  created_at: string;
}

export type Page =
  | 'landing'
  | 'auth'
  | 'games'
  | 'game-detail'
  | 'gpu-rentals'
  | 'dashboard'
  | 'wallet'
  | 'subscriptions'
  | 'support'
  | 'admin'
  | 'cloud-player';
