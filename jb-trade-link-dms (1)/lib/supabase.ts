
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qlosefnvwvmqeebfqdcg.supabase.co';
const supabaseKey = 'sb_publishable_GmOKGTI8IFmv9q-KFJoICg_397GdY1g'.trim();

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
