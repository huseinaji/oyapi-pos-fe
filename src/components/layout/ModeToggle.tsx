import { MoonStarIcon, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';

const ModeToggle = () => {
  const { theme, setTheme } = useUIStore();
  const handleModeChange = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={handleModeChange}
    >
      {isDark ? (
        <SunIcon />
      ) : (
        <MoonStarIcon />
      )}

      <span className="sr-only">
        Toggle theme
      </span>
    </Button>
  );
};

export default ModeToggle;
