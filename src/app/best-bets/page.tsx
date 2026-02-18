import { getConsensusData } from '@/lib/data/server-fetch';
import { BestBetsContent } from './BestBetsContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BestBetsPage() {
  const data = await getConsensusData();
  return <BestBetsContent initialData={data} />;
}
