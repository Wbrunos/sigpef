
import { Appointment, AttendanceRecord, LogEntry, GlobalMessage } from '../types';
import { USE_MOCK_DATA, N8N_WEBHOOK_URL } from '../constants';
import { supabase } from './supabase';

// Helper to format date as YYYY-MM-DD using Local Time
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toUpper = (str: string): string => {
  return (str || '').trim().toUpperCase();
};

const normalizePeritoName = (name: string): string => {
  if (!name) return '';
  let cleanName = toUpper(name);
  if (
    cleanName.includes('STA AGNAL DO LIMA PEREIRA JUNIOR') || 
    cleanName.includes('AGNAL DO LIMA') || 
    cleanName.includes('STA AGNALDO') ||
    cleanName === 'AGNALDO LIMA'
  ) {
    return 'AGNALDO LIMA PEREIRA JÚNIOR';
  }
  return cleanName;
};

/**
 * Normaliza qualquer formato de data vindo do Supabase para YYYY-MM-DD.
 * Lida com: ISO Strings (2026-02-27T00:00:00), Formato BR (27/02/2026) e objetos Date.
 */
const normalizeDate = (raw: any): string => {
  if (!raw) return '';
  
  // Se for objeto Date
  if (raw instanceof Date) {
    return formatDate(raw);
  }

  let str = String(raw).trim().replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Caso 1: Formato com hífen (pode ser YYYY-MM-DD ou ISO)
  if (str.includes('-')) {
    const isoPart = str.split(' ')[0].split('T')[0];
    const parts = isoPart.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) return isoPart; // Já está em YYYY-MM-DD
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; // DD-MM-YYYY para YYYY-MM-DD
    }
  }

  // Caso 2: Formato Brasileiro com barra (27/02/2026)
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  return str;
};

export const fetchAppointments = async (): Promise<Appointment[]> => {
  if (USE_MOCK_DATA) return [];
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('pericias')
      .select('*')
      .order('data_pericia', { ascending: true })
      .limit(5000);

    if (error) throw error;

    return (data || []).map((item: any) => ({
      // Fallbacks para nomes de colunas em maiúsculas ou minúsculas
      rowId: item.id || item.ID,
      data: normalizeDate(item.data_pericia || item.data || item.DATA_PERICIA || item.DATA),
      perito: normalizePeritoName(item.perito || item.PERITO),
      especialidade: toUpper(item.especialidade || item.ESPECIALIDADE),
      periciado: toUpper(item.periciado || item.PERICIADO),
      observacao: toUpper(item.observacao || item.OBSERVACAO || '')
    }));
  } catch (error) {
    console.error("Erro crítico na API fetchAppointments:", error);
    return [];
  }
};

export const createAppointment = async (appointment: { data: string; periciado: string; perito: string; especialidade: string }): Promise<boolean> => {
  if (!supabase) return false;
  const dbPayload = {
    data_pericia: appointment.data,
    periciado: toUpper(appointment.periciado),
    perito: normalizePeritoName(appointment.perito),
    especialidade: toUpper(appointment.especialidade)
  };
  const { error } = await supabase.from('pericias').insert([dbPayload]);
  return !error;
};

export const updateAppointment = async (rowId: number | string, updates: { observacao?: string; periciado?: string }): Promise<boolean> => {
  if (!supabase) return false;
  const dbUpdates: any = {};
  if (updates.observacao !== undefined) dbUpdates.observacao = toUpper(updates.observacao);
  if (updates.periciado !== undefined) dbUpdates.periciado = toUpper(updates.periciado);
  const { error } = await supabase.from('pericias').update(dbUpdates).eq('id', rowId);
  return !error;
};

export const deleteAppointment = async (rowId: number | string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('pericias').delete().eq('id', rowId);
  return !error;
};

export const fetchAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('controle_presenca').select('*').order('data_pericia', { ascending: false });
  if (error) return [];
  return (data || []).map(rec => ({ ...rec, perito: normalizePeritoName(rec.perito), vara: toUpper(rec.vara), sala: toUpper(rec.sala) }));
};

export const createAttendanceRecord = async (record: Omit<AttendanceRecord, 'id'>): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('controle_presenca').insert([{ ...record, perito: normalizePeritoName(record.perito), vara: toUpper(record.vara), sala: toUpper(record.sala) }]);
  return !error;
};

export const updateAttendanceRecord = async (id: number, updates: Partial<AttendanceRecord>): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('controle_presenca').update(updates).eq('id', id);
  return !error;
};

export const deleteAttendanceRecord = async (id: number): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('controle_presenca').delete().eq('id', id);
  return !error;
};

export const sendGlobalMessage = async (message: string, createdBy: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('global_messages').insert([{ message, created_by: createdBy }]);
  return !error;
};

export const fetchGlobalMessages = async (): Promise<GlobalMessage[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('global_messages').select('*').order('created_at', { ascending: false }).limit(50);
  return error ? [] : (data as GlobalMessage[]);
};

export const uploadPautaFile = async (file: File, batchId: string, onProgress: (percent: number) => void): Promise<{ success: boolean; message: string; isWarning?: boolean }> => {
  if (N8N_WEBHOOK_URL.includes('SEU_N8N_URL_AQUI')) return { success: false, message: 'Webhook não configurado' };
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('batchId', batchId);
    xhr.upload.addEventListener('progress', (e) => onProgress(Math.round((e.loaded / e.total) * 100)));
    xhr.addEventListener('load', () => resolve({ success: xhr.status >= 200 && xhr.status < 300, message: 'Processado' }));
    xhr.open('POST', N8N_WEBHOOK_URL);
    xhr.send(formData);
  });
};

export const deleteImportedBatch = async (batchId: string): Promise<{ success: boolean; count?: number }> => {
  if (!supabase) return { success: false };
  const { error, count } = await supabase.from('pericias').delete({ count: 'exact' }).eq('import_batch_id', batchId);
  return { success: !error, count: count || 0 };
};

export const logSystemAction = async (userEmail: string, action: string, details: string) => {
  if (!supabase) return;
  await supabase.from('system_logs').insert([{ user_email: userEmail, action, details }]);
};

export const fetchSystemLogs = async (): Promise<LogEntry[]> => {
  if (!supabase) return [];
  const { data } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(100);
  return (data as LogEntry[]) || [];
};
