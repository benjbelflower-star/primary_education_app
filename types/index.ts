export type TutorCredentialType = 
  | 'High School Diploma'
  | 'College (or Higher) Diploma'
  | 'Teaching / Substitute Teaching Certificate - AZ State'
  | 'Subject Matter Expert (SME) Certification'
  | ""; // Include empty string to allow for null values without causing type errors';

export type ServiceLog = {
  id: string;
  school_id: string;
  student_id: string;
  tutor_id: string | null;
  staff_id: string | null;
  service_type_id: string | null;
  service_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  service_description: string;
  hours: number;
  delivery_mode: DeliveryMode | null;
  location: string | null;
  billable_flag: boolean;
  esa_eligible_flag: boolean;
  esa_category: string | null;
  provider_name_snapshot: string | null;  // historical accuracy
  group_session_flag: boolean;
  student_count: number | null;
  notes: string | null;
  invoice_line_item_id: string | null;
  invoice_id: string | null;
  student_display_name: string | null;
  student_grade_level: string | null;
  created_at: string;
  updated_at: string;
}

// Ensure Invoice includes the tutor_id for the link
export type Invoice = {
  id: string;
  school_id: string;
  invoice_number: string;
  status: string;                          // draft, issued, partially_paid, paid, void, submitted_for_reimbursement, reimbursed
  issue_date: string;
  due_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  subtotal: number;
  discount_amount: number;
  tax: number;
  total: number;
  balance_due: number;
  currency_code: string;
  notes: string | null;
  billing_notes: string | null;
  classwallet_ready_flag: boolean;
  submission_ready_flag: boolean;
  // Student / billing context
  student_id: string | null;
  billing_account_id: string | null;
  // Legacy ESA snapshot fields
  bill_to_name: string | null;
  student_display_name: string | null;
  student_grade_level: string | null;
  transaction_date: string | null;
  transaction_method: string | null;
  vendor_name: string | null;
  merchant_name: string | null;
  tutor_id: string | null;
  tutor_name: string | null;
  tutor_credential_type: TutorCredentialType | string | null;
  tutor_field_of_study: string | null;
  tutor_credential_url: string | null;
  tutoring_subject: string | null;
  created_at: string;
  updated_at: string;
};

export type ClaimPacket = {
  id: string;
  school_id: string;
  invoice_id: string;
  student_id: string | null;
  guardian_id: string | null;
  claim_program_name: string | null;
  claim_program_case_id: string | null;
  // Use packet_status (new) falling back to status (legacy) for transition period
  packet_status: PacketStatus;
  status: string;
  submission_date: string | null;
  approval_date: string | null;
  reimbursement_date: string | null;
  reimbursed_amount: number | null;
  packet_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  school_id: string;
  line_number: number | null;
  service_date: string | null;
  service_log_id: string | null;
  service_type_id: string | null;
  description: string;
  quantity: number;
  unit_of_measure: string | null;
  unit_price: number;
  amount: number;
  provider_staff_id: string | null;
  provider_name_snapshot: string | null;
  esa_eligible_flag: boolean;
  esa_category: string | null;
  classwallet_category: string | null;
  service_date_start: string | null;
  service_date_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PacketView = {
  packet: ClaimPacket;
  lineItems: InvoiceLineItem[];
  linkedLogs: ServiceLog[];
};

export type Tutor = {
  id: string;
  school_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  credential_type: string | null;
  credential_expiration: string | null; // This is the one TypeScript is looking for
  field_of_study: string | null;
  degree_title: string | null;
  issue_date: string | null;
  credential_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type EnrollmentStatus = 'inquiry' | 'applicant' | 'enrolled' | 'active' | 'inactive' | 'withdrawn' | 'graduated';
export type SupportPlanType  = 'IEP' | '504' | 'intervention' | 'learning_plan';
export type FundingSource    = 'private_pay' | 'ESA' | 'scholarship' | 'mixed';
export type DeliveryMode     = 'in_person' | 'virtual' | 'hybrid';
export type PacketStatus     = 'draft' | 'ready' | 'submitted' | 'needs_correction' | 'approved' | 'denied' | 'reimbursed';

export type Student = {
  id: string;
  school_id: string;
  student_number: string | null;
  state_student_id: string | null;         // state reporting
  first_name: string;
  middle_name: string | null;
  last_name: string;
  preferred_name: string | null;
  dob: string | null;
  grade_level: string | null;
  grade_level_id: string | null;
  primary_program_id: string | null;
  status: 'active' | 'inactive' | 'graduated';
  enrollment_date: string | null;
  withdrawal_date: string | null;
  withdrawal_reason: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  primary_language: string | null;
  homeroom_staff_id: string | null;
  advisor_id: string | null;
  classifications: string[];
  // Compliance flags (FERPA/IDEA/504/ELL)
  iep_flag: boolean;
  section_504_flag: boolean;
  ell_flag: boolean;
  medical_alert_flag: boolean;
  emergency_notes: string | null;
  internal_notes: string | null;           // staff-only, never shown to families
  // Legacy flat guardian contact
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  created_at: string;
  updated_at: string;
};

export type GradeLevel = {
  id: string;
  school_id: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export type Program = {
  id: string;
  school_id: string;
  program_code: string;
  program_name: string;
  program_type: string | null;
  description: string | null;
  esa_eligible_default: boolean;
  is_active: boolean;
};

export type ServiceType = {
  id: string;
  school_id: string;
  service_code: string;
  service_name: string;
  category: string | null;
  description: string | null;
  default_unit: string | null;
  esa_eligible: boolean;
  tutoring_flag: boolean;
  active_flag: boolean;
};

export type Enrollment = {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  grade_level: string | null;
  grade_level_id: string | null;
  program_id: string | null;
  homeroom_teacher_id: string | null;
  tuition_plan_id: string | null;
  funding_source: FundingSource | null;
  residency_status: string | null;
  entry_date: string;
  exit_date: string | null;
  exit_reason: string | null;
  status: EnrollmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentAccommodation = {
  id: string;
  school_id: string;
  student_id: string;
  support_plan_type: SupportPlanType;
  start_date: string;
  end_date: string | null;
  case_manager_staff_id: string | null;
  accommodation_summary: string | null;
  active_flag: boolean;
  document_url: string | null;
  created_at: string;
};

export type EmergencyContact = {
  id: string;
  student_id: string;
  contact_name: string;
  relationship_to_student: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  pickup_authorized_flag: boolean;
  priority_order: number;
  notes: string | null;
};

export type Assessment = {
  id: string;
  school_id: string;
  assessment_name: string;
  assessment_type: string;
  subject_area: string | null;
  administration_date: string | null;
  grade_band: string | null;
  is_active: boolean;
};

export type AssessmentResult = {
  id: string;
  assessment_id: string;
  student_id: string;
  score_raw: number | null;
  score_scaled: number | null;
  proficiency_level: string | null;
  percentile_rank: number | null;
  notes: string | null;
};

export type TuitionPlan = {
  id: string;
  school_id: string;
  plan_name: string;
  billing_frequency: string;
  amount: number;
  description: string | null;
  active_flag: boolean;
};

export type BillingAccount = {
  id: string;
  school_id: string;
  guardian_name: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'inactive';
  created_at: string;
};

export type Guardian = {
  id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  relationship_label: string | null;
  email: string | null;
  phone: string | null;
  phone_secondary: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  preferred_contact_method: string | null;
  emergency_contact_flag: boolean;
  billing_responsible_flag: boolean;
  active_flag: boolean;
  created_at: string;
  updated_at: string;
};

// ─── Messaging ────────────────────────────────────────────────────────────────

export type SenderType = 'staff' | 'tutor' | 'guardian' | 'system';
export type ThreadType = 'direct' | 'broadcast';
export type ThreadStatus = 'open' | 'closed';

export type MessageThread = {
  id: string;
  school_id: string | null;
  subject: string;
  thread_type: ThreadType;
  category: string;
  status: ThreadStatus;
  created_by_type: SenderType;
  created_by_id: string | null;
  created_by_name: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  response_window_closes_at: string | null;
  auto_reply_message: string | null;
  sendbird_channel_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  school_id: string | null;
  thread_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  sender_name: string;
  body: string;
  original_language: string;
  is_auto_reply: boolean;
  created_at: string;
};

export type ThreadParticipant = {
  thread_id: string;
  participant_type: SenderType;
  participant_id: string;
  participant_name: string | null;
};

export type AppNotification = {
  id: string;
  school_id: string | null;
  recipient_type: SenderType;
  recipient_id: string | null;
  recipient_name: string | null;
  notification_type: string;
  title: string;
  body: string;
  related_thread_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};
