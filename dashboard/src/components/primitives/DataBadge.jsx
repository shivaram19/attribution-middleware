// Why: doc 06 demo-mode honesty — green=live, amber=simulated
import { Badge } from '@/components/ui/badge';

/** Live/simulated/offline data-source badge (doc 06 demo-mode labels). */
export default function DataBadge({ source, testId }) {
  if (source === 'live') return <Badge variant="success" data-testid={testId || 'badge-live'}>Live API</Badge>;
  if (source === 'simulated') return <Badge variant="warning" data-testid={testId || 'badge-simulated'}>Simulated</Badge>;
  return <Badge variant="secondary" data-testid={testId}>Organic</Badge>;
}
