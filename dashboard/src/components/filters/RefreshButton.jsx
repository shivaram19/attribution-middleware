// Why: explicit re-fetch affordance — Nielsen visibility of system status
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RefreshButton({ onRefresh }) {
  return (
    <Button variant="outline" size="sm" onClick={onRefresh} data-testid="refresh-button">
      <RefreshCw size={14} /> Refresh
    </Button>
  );
}
