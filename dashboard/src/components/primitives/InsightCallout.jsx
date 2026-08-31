// Why: computed 'so what' under the view title — resolution.de data storytelling; Tufte signal-over-ink
import { Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/** Data-driven 1-2 sentence insight rendered under the view title. */
export default function InsightCallout({ children }) {
  if (!children) return null;
  return (
    <Card data-testid="insight-callout" className="border-primary/20 bg-accent/50 shadow-none">
      <CardContent className="flex items-start gap-2.5 p-3.5">
        <Lightbulb size={16} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-sm leading-snug text-accent-foreground">{children}</p>
      </CardContent>
    </Card>
  );
}
