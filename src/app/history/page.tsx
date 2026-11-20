// Server wrapper: the record disclosure is fetched here so it is in the server HTML
// (visible with no JS and no delayed client request). DAI-04.
import HistoryClient from './HistoryClient';
import { getRecordDisclosure } from '@/lib/data/record-disclosure';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const disclosure = await getRecordDisclosure().catch(() => null);
  return <HistoryClient disclosure={disclosure} />;
}
