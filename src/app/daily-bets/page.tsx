import { getDailyBetsData } from '@/lib/data/server-fetch';
import { DailyBetsContent } from './DailyBetsContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DailyBetsPage() {
  const data = await getDailyBetsData();
  return <DailyBetsContent initialData={data} />;
}
