// Why: one-click retry and honest empty states — Nielsen error recovery / visibility of status
import { AlertTriangle, RefreshCw, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ErrorState({ message, onRetry }) {
  return (
    <Card data-testid="error-state" className="border-red-200">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <AlertTriangle size={28} className="text-red-500" />
        <p className="text-sm text-muted-foreground">Failed to load data{message ? `: ${message}` : ''}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} data-testid="retry-button">
            <RefreshCw size={14} /> Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ message = 'No data for the selected filters' }) {
  return (
    <Card data-testid="empty-state">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <Inbox size={28} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
