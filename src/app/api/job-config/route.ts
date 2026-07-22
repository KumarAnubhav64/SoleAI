import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_CONFIG_COMPLETE } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { equipmentType, severity } = body;

    if (!equipmentType || !severity) {
      return NextResponse.json(
        { error: 'equipmentType and severity are required' },
        { status: 400 },
      );
    }

    const validEquipment = ['hvac', 'industrial-printer', 'server-rack'];
    const validSeverity = ['routine-maintenance', 'critical-fault'];

    if (!validEquipment.includes(equipmentType)) {
      return NextResponse.json(
        { error: `Invalid equipment type: ${equipmentType}` },
        { status: 400 },
      );
    }

    if (!validSeverity.includes(severity)) {
      return NextResponse.json(
        { error: `Invalid severity: ${severity}` },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set('jobConfig', JSON.stringify({ equipmentType, severity }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    cookieStore.set(COOKIE_CONFIG_COMPLETE, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save job config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 },
    );
  }
}
