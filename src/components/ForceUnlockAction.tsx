import { Clock, LockOpen } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { serverScripts } from '@/lib/server';

function ForceUnlockAction({
  flowId,
  onUnlock,
}: {
  flowId: string;
  onUnlock: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);
    try {
      const res = await serverScripts.forceUnlock(flowId);
      if (res.success) {
        toast.success('Unlocked successfully');
        onUnlock();
      } else {
        toast.error('Failed to unlock');
      }
    } catch {
      toast.error('Error unlocking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      className="ml-auto"
      onClick={handleUnlock}
      disabled={loading}
    >
      {loading ? (
        <Clock className="w-3 h-3 animate-spin mr-1" />
      ) : (
        <LockOpen className="w-3 h-3 mr-1" />
      )}
      Force Unlock
    </Button>
  );
}

export { ForceUnlockAction };
