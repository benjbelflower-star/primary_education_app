export type TutorCredentialType = 
  | 'High School Diploma'
  | 'College (or Higher) Diploma'
  | 'Teaching / Substitute Teaching Certificate - AZ State'
  | 'Subject-Specific degree';

export type ServiceLog = {
  id: string;
  school_id?: string;
  student_id: string;
  tutor_id: string; // This fixes the "Property 'tutor_id' does not exist" error
  service_date: string;
  service_description: string;
  hours: number;
  esa_category: string;
  
  // The question marks (?) make these optional, fixing the "missing properties" error
  invoice_line_item_id?: string | null; 
  invoice_id?: string | null;
  student_display_name?: string; 
  student_grade_level?: string; 
}

// Ensure Invoice includes the tutor_id for the link
export type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  issue_date: string;
  bill_to_name: string | null;
  student_display_name: string | null;
  student_id: string | null;
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
};

export type ClaimPacket = {
  id: string;
  invoice_id: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  school_id: string;
  created_at: string;
};

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  description: string;
  amount: number;
  esa_category: string | null;
  service_date_start: string | null;
  service_date_end: string | null;
};

export type PacketView = {
  packet: ClaimPacket;
  lineItems: InvoiceLineItem[];
  linkedLogs: ServiceLog[];
};

export type Tutor = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  credential_type: TutorCredentialType | null;
  field_of_study: string | null;
  degree_title: string | null; // New field
  issue_date: string | null;   // New field
  expiration_date: string | null; // New field
  credential_url: string | null;
  is_active: boolean;
  school_id: string;
  updated_at: string;
};

export type Student = {
  id: string; // The database primary key for the student record
  first_name: string;
  last_name: string;
  grade_level: string | null;
  school_id: string;
  status: 'active' | 'inactive' | 'graduated';
  guardian_name: string | null;
  guardian_email: string | null;
  created_at: string;
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
  email: string;
  phone?: string;
};

