export type UserRole = "super_admin" | "owner" | "manager";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "enterprise";
export type TaskFrequency = "daily" | "weekly" | "monthly";
export type TaskCategory =
  | "opening"
  | "closing"
  | "food_safety"
  | "cleaning"
  | "custom";
export type ScheduleEventType = "training" | "inspection" | "audit" | "other";
export type CompletionStatus = "pending" | "due" | "completed" | "missed";
export type RangeType = "min_only" | "max_only" | "min_max";
export type NotificationType =
  | "failed_reading"
  | "missed_checklist"
  | "unfilled_shift"
  | "billing";
export type BranchStatusVocab = "on_track" | "behind" | "needs_attention";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  locale: "ar" | "en";
  digest_enabled: boolean;
  digest_frequency: "weekly" | "off";
  digest_last_sent_at: string | null;
  /** Set after the one-time first-login email OTP succeeds. */
  first_login_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  owner_user_id: string;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
  commercial_registration: string | null;
  vat_number: string | null;
  timezone: string;
  notify_missed_checklist: boolean;
  notify_food_safety_failure: boolean;
  notify_weekly_summary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  restaurant_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Manager {
  id: string;
  user_id: string;
  branch_id: string;
  restaurant_id: string;
  created_at: string;
}

export interface Task {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  title: string;
  title_ar: string | null;
  category: TaskCategory;
  frequency: TaskFrequency;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskItem {
  id: string;
  task_id: string;
  label: string;
  label_ar: string | null;
  sort_order: number;
  requires_photo: boolean;
  requires_note: boolean;
  requires_number: boolean;
  created_at: string;
}

export interface TaskCompletion {
  id: string;
  task_item_id: string;
  branch_id: string;
  manager_id: string;
  photo_url: string | null;
  note: string | null;
  number_value: number | null;
  status: CompletionStatus;
  submitted_at: string;
}

export interface FoodSafetyStandard {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  name: string;
  name_ar: string | null;
  range_type: RangeType;
  min_value: number | null;
  max_value: number | null;
  unit: string;
  check_frequency: TaskFrequency;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodSafetyReading {
  id: string;
  standard_id: string;
  branch_id: string;
  manager_id: string;
  value: number;
  passed: boolean;
  note: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  submitted_at: string;
}

export interface ScheduleEvent {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  type: ScheduleEventType;
  title: string;
  title_ar: string | null;
  description: string | null;
  event_date: string;
  created_by: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  restaurant_id: string;
  plan: string;
  branch_count: number;
  paid_branch_limit: number;
  status: SubscriptionStatus;
  moyasar_customer_id: string | null;
  moyasar_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  restaurant_id: string;
  moyasar_token: string;
  card_company: string | null;
  card_last_four: string | null;
  is_default: boolean;
  created_at: string;
}

export interface BillingPayment {
  id: string;
  restaurant_id: string;
  moyasar_payment_id: string;
  amount_halalas: number;
  branch_count: number;
  status: string;
  payment_type: string;
  created_at: string;
}

export interface Notification {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const BRANCH_PRICE_SAR = 50;
export const MAX_MANAGERS_PER_BRANCH = 2;
export const TRIAL_DAYS = 14;
export const ENTERPRISE_BRANCH_THRESHOLD = 10;

export const ROLE_ROUTES: Record<UserRole, string> = {
  super_admin: "/admin",
  owner: "/owner",
  manager: "/manager",
};

export const TASK_CATEGORIES: TaskCategory[] = [
  "opening",
  "closing",
  "food_safety",
  "cleaning",
  "custom",
];
