import { useEffect } from 'react';
import { toast } from 'sonner';

export function DismissToastsOnInteraction() {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-sonner-toast]')) return;
      toast.dismiss();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  return null;
}
