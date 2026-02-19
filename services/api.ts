
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

// Função para normalizar textos para MAIÚSCULAS
const toUpper = (str: string): string => {
  return (str || '').trim().toUpperCase();
};

// Função para corrigir nomes de peritos específicos e padronizar
const normalizePeritoName = (name: string): string => {
  if (!name) return '';
  let cleanName = toUpper(name);
  
  // Correção específica mantendo o padrão maiúsculo
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

// Helper to normalize date from DB to YYYY-MM-DD
const normalizeDate = (raw: any): string => {
  if (!raw) return '';
  let str = String(raw).trim();
  
  if (str.includes(' ')) {
    str = str.split(' ')[0];
  }

  if (str.includes('T')) {
    str = str.split('T')[0];
  }

  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      if (parts[0].length === 4) return `${parts[0]}-${parts[1]}-${parts[2]}`;
    }
  }

  return str;
};

const today = new Date();
const MOCK_DATA: Appointment[] = [
  { rowId: 2, data: formatDate(today), perito: 'AGNALDO LIMA PEREIRA JÚNIOR', especialidade: 'CARDIOLOGIA', periciado: 'JOÃO SOUZA', observacao: '' },
  { rowId: 3, data: formatDate(today), perito: 'ANA MARIA', especialidade: 'ORTOPEDIA', periciado: 'MARIA OLIVEIRA', observacao: 'COMPARECEU' },
  { rowId: 4, data: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)), perito: 'AGNALDO LIMA PEREIRA JÚNIOR', especialidade: 'CARDIOLOGIA', periciado: 'CARLOS LIMA', observacao: 'NAO COMPARECEU' },
];

const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: 101, data_pericia: formatDate(today), perito: 'AGNALDO LIMA PEREIRA JÚNIOR', vara: '1ª VARA CÍVEL', sala: 'SALA 05', hora_chegada: '08:00', hora_saida: '' },
  { id: 102, data_pericia: formatDate(today), perito: 'ANA MARIA', vara: '2ª VARA FAMÍLIA', sala: 'SALA 02', hora_chegada: '08:15', hora_saida: '12:30' }
];

// --- APPOINTMENTS (PERICIAS) ---

export const fetchAppointments = async (): Promise<Appointment[]> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return [...MOCK_DATA];
  }

  if (!supabase) {
    console.warn('Supabase não configurado. Usando Mock Data temporário.');
    return [...MOCK_DATA];
  }

  try {
    const { data, error } = await supabase
      .from('pericias')
      .select('*')
      .order('data_pericia', { ascending: true })
      .limit(5000);

    if (error) throw new Error(error.message);

    return (data || []).map((item: any) => ({
      rowId: item.id,
      data: normalizeDate(item.data_pericia || item.data || item.DATA || item.Data),
      perito: normalizePeritoName(item.perito || item.PERITO || item.Perito),
      especialidade: toUpper(item.especialidade || item.ESPECIALIDADE || item.Especialidade),
      periciado: toUpper(item.periciado || item.PERICIADO || item.Periciado),
      observacao: toUpper(item.observacao || item.OBSERVACAO || item.Observacao || '')
    }));
  } catch (error) {
    console.error("Fetch Error:", error);
    throw error;
  }
};

export const createAppointment = async (appointment: { data: string; periciado: string; perito: string; especialidade: string }): Promise<boolean> => {
  if (USE_MOCK_DATA) {
    MOCK_DATA.push({
      rowId: Date.now(),
      data: appointment.data,
      periciado: toUpper(appointment.periciado),
      perito: normalizePeritoName(appointment.perito),
      especialidade: toUpper(appointment.especialidade),
      observacao: ''
    });
    return true;
  }

  if (!supabase) return false;

  const dbPayload = {
    data_pericia: appointment.data,
    periciado: toUpper(appointment.periciado),
    perito: normalizePeritoName(appointment.perito),
    especialidade: toUpper(appointment.especialidade),
    observacao: ''
  };

  const { error } = await supabase.from('pericias').insert([dbPayload]);
  return !error;
};

export const updateAppointment = async (rowId: number | string, updates: { observacao?: string; periciado?: string }): Promise<boolean> => {
  if (USE_MOCK_DATA) {
    const index = MOCK_DATA.findIndex(a => a.rowId === rowId);
    if (index !== -1) {
      if (updates.observacao !== undefined) MOCK_DATA[index].observacao = toUpper(updates.observacao);
      if (updates.periciado !== undefined) MOCK_DATA[index].periciado = toUpper(updates.periciado);
    }
    return true;
  }
  
  if (!supabase) return false;
  
  const dbUpdates: any = {};
  if (updates.observacao !== undefined) dbUpdates.observacao = toUpper(updates.observacao);
  if (updates.periciado !== undefined) dbUpdates.periciado = toUpper(updates.periciado);

  const { error } = await supabase.from('pericias').update(dbUpdates).eq('id', rowId);
  return !error;
};

export const deleteAppointment = async (rowId: number | string): Promise<boolean> => {
  if (USE_MOCK_DATA) {
    const index = MOCK_DATA.findIndex(a => a.rowId === rowId);
    if (index !== -1) {
      MOCK_DATA.splice(index, 1);
    }
    return true;
  }

  if (!supabase) return false;

  const { error } = await supabase.from('pericias').delete().eq('id', rowId);
  return !error;
};

// --- ATTENDANCE ---

export const fetchAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  if (USE_MOCK_DATA) return MOCK_ATTENDANCE;
  
  if (!supabase) {
    return MOCK_ATTENDANCE; 
  }

  try {
    const { data, error } = await supabase.from('controle_presenca').select('*').order('data_pericia', { ascending: false });
    if (error) throw error;
    return (data || []).map(rec => ({ 
      ...rec, 
      perito: normalizePeritoName(rec.perito),
      vara: toUpper(rec.vara),
      sala: toUpper(rec.sala)
    }));
  } catch (e) {
    console.error("Erro ao buscar presença:", e);
    return MOCK_ATTENDANCE; 
  }
};

export const createAttendanceRecord = async (record: Omit<AttendanceRecord, 'id'>): Promise<boolean> => {
  const normalizedRecord = {
    ...record,
    perito: normalizePeritoName(record.perito),
    vara: toUpper(record.vara),
    sala: toUpper(record.sala)
  };

  if (USE_MOCK_DATA) {
    MOCK_ATTENDANCE.push({ ...normalizedRecord, id: Date.now() });
    return true;
  }
  if (!supabase) return false;
  const { error } = await supabase.from('controle_presenca').insert([normalizedRecord]);
  return !error;
};

export const updateAttendanceRecord = async (id: number, updates: Partial<AttendanceRecord>): Promise<boolean> => {
  const normalizedUpdates: any = { ...updates };
  if (updates.perito) normalizedUpdates.perito = normalizePeritoName(updates.perito);
  if (updates.vara) normalizedUpdates.vara = toUpper(updates.vara);
  if (updates.sala) normalizedUpdates.sala = toUpper(updates.sala);

  if (USE_MOCK_DATA) {
    const idx = MOCK_ATTENDANCE.findIndex(r => r.id === id);
    if (idx !== -1) {
       MOCK_ATTENDANCE[idx] = { ...MOCK_ATTENDANCE[idx], ...normalizedUpdates };
    }
    return true;
  }
  if (!supabase) return false;
  const { error } = await supabase.from('controle_presenca').update(normalizedUpdates).eq('id', id);
  return !error;
};

export const deleteAttendanceRecord = async (id: number): Promise<boolean> => {
  if (USE_MOCK_DATA) {
    const idx = MOCK_ATTENDANCE.findIndex(r => r.id === id);
    if (idx !== -1) {
      MOCK_ATTENDANCE.splice(idx, 1);
    }
    return true;
  }
  if (!supabase) return false;
  
  const { error } = await supabase.from('controle_presenca').delete().eq('id', id);
  return !error;
};

// --- GLOBAL MESSAGES ---

export const sendGlobalMessage = async (message: string, createdBy: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('global_messages').insert([{ message: message, created_by: createdBy }]);
  return !error;
};

export const fetchGlobalMessages = async (): Promise<GlobalMessage[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('global_messages').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data as GlobalMessage[];
  } catch (e) {
    return [];
  }
};

// --- FILE UPLOAD ---

export const uploadPautaFile = async (
  file: File, 
  batchId: string,
  onProgress: (percent: number) => void
): Promise<{ success: boolean; message: string; isWarning?: boolean }> => {
  
  if (N8N_WEBHOOK_URL.includes('SEU_N8N_URL_AQUI')) {
    return { success: false, message: 'URL do Webhook N8N não configurada no constants.ts' };
  }

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    formData.append('file', file);
    formData.append('batchId', batchId);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true, message: 'Arquivo enviado e processado com sucesso!' });
      } else {
        let errorMsg = `Erro no servidor: ${xhr.statusText || 'Falha no processamento'}`;
        try {
           const responseText = xhr.responseText;
           if (responseText.includes("duplicate key value") || responseText.includes("unique constraint")) {
              const match = responseText.match(/Key \(periciado, data_pericia\)=\(([^,]+), ([^)]+)\)/);
              if (match) {
                 errorMsg = `REGRA DE NEGÓCIO: O periciado "${match[1]}" já está cadastrado para o dia ${match[2]}. Importação interrompida por duplicidade.`;
              } else {
                 errorMsg = "REGRA DE NEGÓCIO: Um ou mais periciados no PDF já possuem agendamento para a mesma data. Importação interrompida.";
              }
           } else {
             const responseJson = JSON.parse(responseText);
             if (responseJson && responseJson.message) {
               errorMsg = responseJson.message;
             }
           }
        } catch (e) {}
        resolve({ success: false, message: errorMsg });
      }
    });

    xhr.addEventListener('error', () => {
      resolve({ success: false, message: 'Falha na conexão de rede.' });
    });

    xhr.open('POST', N8N_WEBHOOK_URL);
    xhr.send(formData);
  });
};

export const deleteImportedBatch = async (batchId: string): Promise<{ success: boolean; count?: number }> => {
  if (!supabase) return { success: false };
  try {
    const { data, error, count } = await supabase
      .from('pericias')
      .delete({ count: 'exact' })
      .eq('import_batch_id', batchId);

    if (error) return { success: false };
    return { success: true, count: count || 0 };
  } catch (e) {
    return { success: false };
  }
};

// --- LOGGING SYSTEM ---

let cachedIP: string | null = null;

const getClientIP = async (): Promise<string> => {
  if (cachedIP) return cachedIP;
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    cachedIP = data.ip;
    return data.ip;
  } catch (error) {
    return 'Não identificado';
  }
};

export const logSystemAction = async (userEmail: string, action: string, details: string) => {
  if (!supabase) return;
  try {
    const ip = await getClientIP();
    await supabase.from('system_logs').insert([{
      user_email: userEmail,
      action: action,
      details: details,
      ip_address: ip
    }]);
  } catch (e) {}
};

export const fetchSystemLogs = async (): Promise<LogEntry[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data as LogEntry[];
  } catch (e) {
    return [];
  }
};
