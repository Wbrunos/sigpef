
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

// Função para corrigir nomes de peritos específicos e padronizar
const normalizePeritoName = (name: string): string => {
  if (!name) return '';
  let cleanName = name.trim();
  
  // Correção específica: STA AGNAL DO LIMA PEREIRA JUNIOR -> Agnaldo Lima Pereira Júnior
  const upper = cleanName.toUpperCase();
  if (
    upper.includes('STA AGNAL DO LIMA PEREIRA JUNIOR') || 
    upper.includes('AGNAL DO LIMA') || 
    upper.includes('STA AGNALDO') ||
    upper === 'AGNALDO LIMA'
  ) {
    return 'Agnaldo Lima Pereira Júnior';
  }
  
  // Formatação básica Capitalize
  return cleanName;
};

// Helper to normalize date from DB to YYYY-MM-DD
const normalizeDate = (raw: any): string => {
  if (!raw) return '';
  let str = String(raw).trim();
  
  // Se vier no formato "YYYY-MM-DD HH:mm:ss" (comum no Postgres/Supabase), remove o tempo
  if (str.includes(' ')) {
    str = str.split(' ')[0];
  }

  // Se vier no formato ISO "YYYY-MM-DDTHH:mm:ss", remove o tempo
  if (str.includes('T')) {
    str = str.split('T')[0];
  }

  // Se vier no formato brasileiro "DD/MM/YYYY"
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
  { rowId: 2, data: formatDate(today), perito: 'Agnaldo Lima Pereira Júnior', especialidade: 'Cardiologia', periciado: 'João Souza', observacao: '' },
  { rowId: 3, data: formatDate(today), perito: 'Dra. Ana Maria', especialidade: 'Ortopedia', periciado: 'Maria Oliveira', observacao: 'COMPARECEU' },
  { rowId: 4, data: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)), perito: 'Agnaldo Lima Pereira Júnior', especialidade: 'Cardiologia', periciado: 'Carlos Lima', observacao: 'NAO COMPARECEU' },
];

const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: 101, data_pericia: formatDate(today), perito: 'Agnaldo Lima Pereira Júnior', vara: '1ª Vara Cível', sala: 'Sala 05', hora_chegada: '08:00', hora_saida: '' },
  { id: 102, data_pericia: formatDate(today), perito: 'Dra. Ana Maria', vara: '2ª Vara Família', sala: 'Sala 02', hora_chegada: '08:15', hora_saida: '12:30' }
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
    // Aumentamos o limite para 5000 para não cortar os registros (seu banco já tem 1025)
    // E ordenamos pela data da perícia para ser funcional
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
      especialidade: item.especialidade || item.ESPECIALIDADE || item.Especialidade,
      periciado: item.periciado || item.PERICIADO || item.Periciado,
      observacao: item.observacao || item.OBSERVACAO || item.Observacao || ''
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
      ...appointment,
      observacao: ''
    });
    return true;
  }

  if (!supabase) return false;

  const dbPayload = {
    data_pericia: appointment.data,
    periciado: appointment.periciado,
    perito: appointment.perito,
    especialidade: appointment.especialidade,
    observacao: ''
  };

  const { error } = await supabase.from('pericias').insert([dbPayload]);
  return !error;
};

export const updateAppointment = async (rowId: number | string, updates: { observacao?: string; periciado?: string }): Promise<boolean> => {
  if (USE_MOCK_DATA) {
    const index = MOCK_DATA.findIndex(a => a.rowId === rowId);
    if (index !== -1) {
      if (updates.observacao !== undefined) MOCK_DATA[index].observacao = updates.observacao;
      if (updates.periciado !== undefined) MOCK_DATA[index].periciado = updates.periciado;
    }
    return true;
  }
  
  if (!supabase) return false;
  
  const dbUpdates: any = {};
  if (updates.observacao !== undefined) dbUpdates.observacao = updates.observacao;
  if (updates.periciado !== undefined) dbUpdates.periciado = updates.periciado;

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
    return (data || []).map(rec => ({ ...rec, perito: normalizePeritoName(rec.perito) }));
  } catch (e) {
    console.error("Erro ao buscar presença:", e);
    return MOCK_ATTENDANCE; 
  }
};

export const createAttendanceRecord = async (record: Omit<AttendanceRecord, 'id'>): Promise<boolean> => {
  if (USE_MOCK_DATA) {
    MOCK_ATTENDANCE.push({ ...record, id: Date.now() });
    return true;
  }
  if (!supabase) return false;
  const { error } = await supabase.from('controle_presenca').insert([record]);
  return !error;
};

export const updateAttendanceRecord = async (id: number, updates: Partial<AttendanceRecord>): Promise<boolean> => {
  if (USE_MOCK_DATA) {
    const idx = MOCK_ATTENDANCE.findIndex(r => r.id === id);
    if (idx !== -1) {
       MOCK_ATTENDANCE[idx] = { ...MOCK_ATTENDANCE[idx], ...updates };
    }
    return true;
  }
  if (!supabase) return false;
  const { error } = await supabase.from('controle_presenca').update(updates).eq('id', id);
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

// --- FILE UPLOAD (WEBHOOK N8N) COM PROGRESSO E TRATAMENTO DE DUPLICATAS ---

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

    // Evento de progresso
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    });

    // Evento de finalização (Load)
    xhr.addEventListener('load', () => {
      // Sucesso HTTP 200-299
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true, message: 'Arquivo enviado e processado com sucesso!' });
      } else {
        // Falha no N8N (Ex: 400, 500)
        let errorMsg = `Erro no servidor: ${xhr.statusText || 'Falha no processamento'}`;
        let isDuplicate = false;

        // Tenta ler a resposta para ver se é o erro de chave duplicada
        try {
           const responseText = xhr.responseText;
           
           // Detecção específica do erro Postgres de duplicidade (Unique Constraint)
           if (responseText.includes("duplicate key value") || responseText.includes("unique constraint")) {
              isDuplicate = true;
              
              // Tenta extrair o nome do periciado que causou o erro para o alerta ser mais claro
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
        } catch (e) {
           // Fallback se não for JSON
        }

        // Retornamos success: false mas com a mensagem tratada
        resolve({ 
          success: false, 
          message: errorMsg
        });
      }
    });

    // Evento de erro de rede
    xhr.addEventListener('error', () => {
      resolve({ success: false, message: 'Falha na conexão de rede.' });
    });

    // Evento de abortar
    xhr.addEventListener('abort', () => {
      resolve({ success: false, message: 'Envio cancelado.' });
    });

    xhr.open('POST', N8N_WEBHOOK_URL);
    xhr.send(formData);
  });
};

// --- DELETAR LOTE IMPORTADO (UNDO) ---
export const deleteImportedBatch = async (batchId: string): Promise<{ success: boolean; count?: number }> => {
  if (!supabase) return { success: false };

  try {
    // Requer que a tabela 'pericias' tenha uma coluna 'import_batch_id'
    const { data, error, count } = await supabase
      .from('pericias')
      .delete({ count: 'exact' })
      .eq('import_batch_id', batchId);

    if (error) {
      console.error('Erro ao deletar lote:', error);
      return { success: false };
    }

    return { success: true, count: count || 0 };
  } catch (e) {
    console.error('Exceção ao deletar lote:', e);
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
  } catch (e) {
    console.warn("Falha ao registrar log:", e);
  }
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
