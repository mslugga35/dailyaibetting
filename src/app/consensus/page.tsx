import { getConsensusData, getYesterdayConsensusData } from '@/lib/data/server-fetch';
import { ConsensusContent } from './ConsensusContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ConsensusPage() {
  const [todayData, yesterdayData] = await Promise.all([
    getConsensusData(),
    getYesterdayConsensusData(),
  ]);
  return <ConsensusContent initialData={todayData} initialYesterdayData={yesterdayData} />;
}
