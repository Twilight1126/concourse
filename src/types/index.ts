export type AppSource =
  | 'linkedin'
  | 'portal'
  | 'referral'
  | 'cold_email'
  | 'other';

export type AppStatus =
  | 'wishlist'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn'
  | 'ghosted';

export type StatusTrigger = 'manual' | 'email_detected' | 'auto_ghosted' | 'extension';

export type Channel = 'email' | 'linkedin' | 'portal';

export interface Profile {
  full_name: string;
  headline: string;
  skills: string;
  resume_link: string;
  followup_days: string;
}

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  job_url: string | null;
  location: string | null;
  salary_range: string | null;
  source: AppSource | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  contact_linkedin: string | null;
  status: AppStatus;
  applied_on: string | null;
  follow_up_on: string | null;
  last_activity_on: string | null;
  resume_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistory {
  id: string;
  application_id: string;
  from_status: AppStatus | null;
  to_status: AppStatus;
  changed_at: string;
  trigger: StatusTrigger;
}

export interface Note {
  id: string;
  application_id: string;
  body: string;
  created_at: string;
}

export interface ColdEmail {
  id: string;
  user_id: string;
  application_id: string;
  channel: Channel;
  sent_on: string;
  contact_name: string | null;
  contact_role: string | null;
  follow_up_count: number;
  replied: boolean;
  replied_on: string | null;
  converted_to_interview: boolean;
}

export type ApplicationInsert = Partial<Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  company: string;
  role: string;
  status: AppStatus;
};
