import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/db';
import type { Profile } from '@/types';

const EMPTY: Profile = { full_name: '', headline: '', skills: '', resume_link: '', followup_days: '7' };

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  useEffect(() => { api<Profile>('/api/settings').then(setProfile).catch(() => {}); }, []);
  const save = useCallback(async (p: Profile) => {
    setProfile(await api<Profile>('/api/settings', { method: 'PUT', body: JSON.stringify(p) }));
  }, []);
  return { profile, save };
}
