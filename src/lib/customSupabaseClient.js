import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ymbhiwtnupbctxzbuvxq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltYmhpd3RudXBiY3R4emJ1dnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NzEzODQsImV4cCI6MjA4NDA0NzM4NH0.5fYbJqIefaSetbwKidAnW54XzoIy3Ej76lSRnLCE6No';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
