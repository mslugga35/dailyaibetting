import { getConsensusData } from '@/lib/data/server-fetch';
import { FreeSportsPicksContent } from './FreeSportsPicksContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FreeSportsPicksPage() {
  const data = await getConsensusData();
  return <FreeSportsPicksContent initialData={data} />;
}
