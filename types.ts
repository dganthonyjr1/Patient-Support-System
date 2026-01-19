export enum VoiceState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING', // Mic is open, user can speak
  SPEAKING = 'SPEAKING',   // Agent is speaking
  PROCESSING = 'PROCESSING', // Thinking/Turn complete
  ERROR = 'ERROR',
  ENDED = 'ENDED'
}

export interface InteractionLog {
  channel: string;
  caller_name: string;
  phone: string;
  email: string;
  intent: string;
  med_status: "routine_refill" | "out_of_meds" | "not_applicable";
  risk_level: "low" | "medium" | "high";
  summary: string;
  followup_bundle: "bundle_1" | "bundle_2" | "bundle_3" | "none";
  escalation_required: "yes" | "no";
  escalation_reason: string;
  next_step: string;
}

export interface AudioConfig {
  sampleRate: number;
}

export interface PatientDetails {
  name: string;
  email: string;
  phone: string;
}