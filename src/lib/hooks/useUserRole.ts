
import { useEffect, useState } from 'react';
import { browserSupabase } from '@/lib/supabase/browser';

export function useUserRole() {
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUserRole() {
      const { data: { user } } = await browserSupabase.auth.getUser();
      
      if (user) {
        const { data } = await browserSupabase
          .from('tbl_users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setRole(data?.role || null);
      }
      setLoading(false);
    }

    getUserRole();
  }, []);

  return { role, loading, isAdmin: role === 'admin', isEmployee: role === 'employee' };
}