import { getConsensusData } from '@/lib/data/server-fetch';
import { PicksContent } from './PicksContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PicksPage() {
  const data = await getConsensusData();
  return <PicksContent initialData={data} />;
}
