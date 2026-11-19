import { PolicyPage } from '@/components/legal/PolicyPage';
import { RESPONSIBLE } from '@/lib/legal/policies';

export const metadata = { title: `${RESPONSIBLE.title}`, description: RESPONSIBLE.summary };

export default function Page() {
  return <PolicyPage policy={RESPONSIBLE} />;
}
