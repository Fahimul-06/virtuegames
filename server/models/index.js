import mongoose from 'mongoose';

const opts = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, strict: false };

const ProfileSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true, required: true, lowercase: true },
  password: { type: String, required: true },
  full_name: String,
  avatar_url: String,
  wallet_balance: { type: Number, default: 0 },
  is_admin: { type: Boolean, default: false }
}, opts);

const GameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  genre: String,
  developer: String,
  publisher: String,
  thumbnail_url: String,
  banner_url: String,
  trailer_url: String,
  rating: { type: Number, default: 4.5 },
  release_year: Number,
  is_featured: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  player_count_online: { type: Number, default: 0 },
  tags: [String]
}, opts);

const GameScreenshotSchema = new mongoose.Schema({ game_id: String, url: String, caption: String, sort_order: Number }, opts);
const GamePlanSchema = new mongoose.Schema({ game_id: String, plan_type: String, price: Number, hours_included: Number }, opts);
const UserGameSubscriptionSchema = new mongoose.Schema({ user_id: String, game_id: String, plan_type: String, amount_paid: Number, starts_at: Date, expires_at: Date, is_active: Boolean }, opts);
const GameSessionSchema = new mongoose.Schema({
  user_id: String,
  game_id: String,
  subscription_id: String,
  gpu_node_id: String,
  started_at: Date,
  ended_at: Date,
  expires_at: Date,
  duration_seconds: Number,
  is_trial: Boolean,
  status: { type: String, default: 'queued' }, // queued | provisioning | active | expired | ended | failed
  stream_url: String,
  signaling_room: String,
  connection_info: Object,
  billing: Object
}, opts);

const GpuTypeSchema = new mongoose.Schema({
  name: String, model: String, description: String, vram_gb: Number, cuda_cores: Number,
  memory_bandwidth_gbps: Number, tflops: Number, tier: String, use_cases: [String],
  thumbnail_url: String, is_available: { type: Boolean, default: true }, stock_count: Number
}, opts);
const GpuPlanSchema = new mongoose.Schema({ gpu_type_id: String, plan_type: String, price: Number }, opts);
const GpuRentalSchema = new mongoose.Schema({
  user_id: String,
  gpu_type_id: String,
  gpu_node_id: String,
  plan_type: String,
  workload_type: String,
  amount_paid: Number,
  starts_at: Date,
  expires_at: Date,
  is_active: Boolean,
  status: String,
  connection_info: Object
}, opts);
const WalletTransactionSchema = new mongoose.Schema({ user_id: String, type: String, amount: Number, description: String, reference_type: String, reference_id: String, balance_after: Number }, opts);
const SupportTicketSchema = new mongoose.Schema({ user_id: String, subject: String, category: String, priority: String, status: String }, opts);
const TicketReplySchema = new mongoose.Schema({ ticket_id: String, user_id: String, message: String, is_staff: Boolean }, opts);
const InstalledGameSchema = new mongoose.Schema({
  game_id: String,
  title: String,
  slug: String,
  platform: String,
  launch_path: String,
  install_dir: String,
  cover_url: String,
  executable_found: Boolean
}, { _id: false });

const GpuNodeSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  region: String,
  public_url: String,
  agent_token_hash: String,
  gpu_model: String,
  total_slots: { type: Number, default: 1 },
  used_slots: { type: Number, default: 0 },
  status: { type: String, default: 'offline' }, // online | offline | maintenance
  last_heartbeat_at: Date,
  installed_game_ids: [String],
  installed_games: [InstalledGameSchema],
  hardware: Object,
  system: Object,
  capabilities: [String]
}, opts);
const PaymentIntentSchema = new mongoose.Schema({
  user_id: String,
  provider: String,
  type: String,
  reference_type: String,
  reference_id: String,
  amount: Number,
  currency: { type: String, default: 'USD' },
  status: { type: String, default: 'pending' },
  checkout_url: String,
  metadata: Object
}, opts);

export const models = {
  profiles: mongoose.model('Profile', ProfileSchema),
  games: mongoose.model('Game', GameSchema),
  game_screenshots: mongoose.model('GameScreenshot', GameScreenshotSchema),
  game_plans: mongoose.model('GamePlan', GamePlanSchema),
  user_game_subscriptions: mongoose.model('UserGameSubscription', UserGameSubscriptionSchema),
  game_sessions: mongoose.model('GameSession', GameSessionSchema),
  gpu_types: mongoose.model('GpuType', GpuTypeSchema),
  gpu_plans: mongoose.model('GpuPlan', GpuPlanSchema),
  gpu_rentals: mongoose.model('GpuRental', GpuRentalSchema),
  wallet_transactions: mongoose.model('WalletTransaction', WalletTransactionSchema),
  support_tickets: mongoose.model('SupportTicket', SupportTicketSchema),
  ticket_replies: mongoose.model('TicketReply', TicketReplySchema),
  gpu_nodes: mongoose.model('GpuNode', GpuNodeSchema),
  payment_intents: mongoose.model('PaymentIntent', PaymentIntentSchema)
};

export function toClient(doc) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  obj.id = obj._id?.toString?.() ?? obj.id;
  delete obj._id;
  delete obj.__v;
  delete obj.password;
  return obj;
}
