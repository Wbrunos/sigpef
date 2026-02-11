
export enum ObservationStatus {
  PENDING = '',
  COMPARECEU = 'COMPARECEU',
  NAO_COMPARECEU = 'NAO COMPARECEU',
  FALECIMENTO = 'FALECIMENTO',
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string; // Novo campo para nome
  role: UserRole;
  approved: boolean;
}

export interface Appointment {
  rowId: number | string; // Supabase IDs can be int or uuid
  data: string;
  perito: string;
  especialidade: string;
  periciado: string;
  observacao: ObservationStatus | string;
}

export interface Stats {
  total: number;
  pending: number;
  completed: number;
}

export interface AttendanceRecord {
  id?: number;
  data_pericia: string;
  perito: string;
  vara: string;
  sala: string;
  hora_chegada: string;
  hora_saida: string;
}

export interface LogEntry {
  id: number;
  user_email: string;
  action: string;
  details: string;
  ip_address?: string; // Novo campo IP
  created_at: string;
}

export interface GlobalMessage {
  id: number;
  message: string;
  created_by: string;
  created_at: string;
}
