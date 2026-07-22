'use server';

import { cookies } from 'next/headers';

export async function saveJobConfig(
  equipmentType: string,
  severity: string,
): Promise<{ success: true }> {
  const config = { equipmentType, severity };
  const cookieStore = await cookies();
  cookieStore.set('jobConfig', JSON.stringify(config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  cookieStore.set('configComplete', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return { success: true };
}
