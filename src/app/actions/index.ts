'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function saveJobConfig(formData: FormData) {
  const equipmentType = formData.get('equipmentType') as string;
  const severity = formData.get('severity') as string;

  // Store job config for Phase 2
  const config = { equipmentType, severity };
  (await cookies()).set('jobConfig', JSON.stringify(config));
  (await cookies()).set('configComplete', 'true');

  redirect('/prep');
}
