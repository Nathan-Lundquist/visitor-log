export interface Worker {
  id: number;
  name: string;
  title: string | null;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  welcome_message: string | null;
  primary_color: string;
  require_license: boolean;
  require_agreement: boolean;
}

export interface Agreement {
  id: number;
  file_url: string;
  filename: string;
}

export interface CheckInData {
  first_name: string;
  last_name: string;
  phone: string;
  worker_id: number | null;
  worker_name: string | null;
  reason: string;
  license_photo: File | null;
  signature_data: string | null;
}

export interface StepProps {
  company: Company;
  data: CheckInData;
  onUpdate: (updates: Partial<CheckInData>) => void;
  onNext: () => void;
  onBack: () => void;
}
