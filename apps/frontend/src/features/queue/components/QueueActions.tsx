import { ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function QueueActions() {
  return (
    <Button variant="ghost">
      <ScrollText className="w-3.5 h-3.5" /> 실행 로그
    </Button>
  );
}
