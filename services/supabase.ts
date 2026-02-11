import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// Verifica se as chaves ainda são os placeholders (textos de instrução)
const isUrlPlaceholder = SUPABASE_URL.includes('COLE_SUA_URL');
const isKeyPlaceholder = SUPABASE_ANON_KEY.includes('COLE_SUA_CHAVE');

// Só inicializa se tiver URL e Key válidas (não vazias e não placeholders)
const isConfigured = SUPABASE_URL && !isUrlPlaceholder && 
                     SUPABASE_ANON_KEY && !isKeyPlaceholder;

export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;