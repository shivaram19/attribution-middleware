// Why: single channel lens for every view — maps to real API params (platform/source)
import { Filter } from 'lucide-react';
import { Select } from '@/components/ui/select';

export default function PlatformFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-2" data-testid="platform-filter">
      <Filter size={14} className="text-muted-foreground" />
      <Select value={value} onChange={(e) => onChange(e.target.value)} data-testid="platform-select">
        <option value="all">All Platforms</option>
        <option value="meta">Meta</option>
        <option value="google">Google</option>
        <option value="organic">Organic</option>
      </Select>
    </div>
  );
}
