import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PrepClient } from './PrepClient';

export default async function PrepPage() {
  const cookieStore = await cookies();
  const jobConfigRaw = cookieStore.get('jobConfig')?.value;

  if (!jobConfigRaw) {
    redirect('/');
  }

  let jobConfig: { equipmentType: string; severity: string };
  try {
    jobConfig = JSON.parse(jobConfigRaw);
  } catch {
    redirect('/');
  }

  if (!jobConfig.equipmentType || !jobConfig.severity) {
    redirect('/');
  }

  return <PrepClient jobConfig={jobConfig} />;
}
