'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import {
  listProceduresAction,
  createProcedureAction,
  toggleProcedureAction,
  deleteProcedureAction
} from '@/features/procedures/actions/procedure-crud';
import type { Procedure, ProcedureTriggerType } from '@/types/appwrite';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

const triggerLabels: Record<ProcedureTriggerType, string> = {
  keyword: 'Keyword',
  intent: 'Intent',
  manual: 'Manual'
};

export default function ProceduresPageClient() {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTriggerType, setNewTriggerType] =
    useState<ProcedureTriggerType>('intent');
  const [newTriggerCondition, setNewTriggerCondition] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const res = await listProceduresAction(tenant.$id);
    if (res.success) setProcedures(res.procedures ?? []);
    setLoading(false);
  }, [tenant]);

  useEffect(() => {
    if (tenant) load();
  }, [tenant, load]);

  async function handleToggle(id: string, enabled: boolean) {
    const res = await toggleProcedureAction(id, tenant!.$id, enabled);
    if (res.success) {
      setProcedures((prev) =>
        prev.map((p) => (p.$id === id ? { ...p, enabled } : p))
      );
    } else {
      toast.error(res.error ?? 'Failed to toggle');
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteProcedureAction(id, tenant!.$id);
    if (res.success) {
      setProcedures((prev) => prev.filter((p) => p.$id !== id));
      toast.success('Procedure deleted');
    } else {
      toast.error(res.error ?? 'Failed to delete');
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createProcedureAction(tenant!.$id, {
      name: newName.trim(),
      description: newDesc,
      trigger: { type: newTriggerType, condition: newTriggerCondition },
      steps: [
        {
          id: 'step_1',
          type: 'message',
          config: { template: 'Hello, how can I help?' }
        }
      ]
    });
    setCreating(false);
    if (res.success) {
      toast.success('Procedure created');
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNewTriggerCondition('');
      load();
    } else {
      toast.error(res.error ?? 'Failed to create');
    }
  }

  if (tenantLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className='text-destructive py-20 text-center'>
        {tenantError ?? 'Could not load tenant'}
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>
          {procedures.length} procedure{procedures.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => setShowCreate(true)}>
          <Icons.add className='mr-2 h-4 w-4' />
          Add Procedure
        </Button>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <Icons.spinner className='text-muted-foreground h-6 w-6 animate-spin' />
        </div>
      ) : procedures.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center'>
            <p className='text-muted-foreground'>
              No procedures yet. Create one to automate multi-step AI workflows.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-3'>
          {procedures.map((proc) => (
            <Card key={proc.$id}>
              <CardContent className='flex items-center justify-between p-4'>
                <div className='flex items-center gap-4'>
                  <Switch
                    checked={proc.enabled}
                    onCheckedChange={(val) => handleToggle(proc.$id, val)}
                  />
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>{proc.name}</span>
                      <Badge variant='secondary'>
                        {triggerLabels[proc.trigger?.type] ?? 'Unknown'}
                      </Badge>
                      <Badge variant='outline'>v{proc.version}</Badge>
                    </div>
                    {proc.description && (
                      <p className='text-muted-foreground mt-0.5 text-xs'>
                        {proc.description}
                      </p>
                    )}
                    <p className='text-muted-foreground mt-0.5 text-xs'>
                      {proc.steps?.length ?? 0} step
                      {(proc.steps?.length ?? 0) !== 1 ? 's' : ''} · Trigger:{' '}
                      {proc.trigger?.condition || 'none'}
                    </p>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => handleDelete(proc.$id)}
                >
                  <Icons.trash className='h-4 w-4' />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Procedure</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='e.g. Process Refund'
              />
            </div>
            <div className='space-y-2'>
              <Label>Description</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder='What does this procedure do?'
                rows={2}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Trigger Type</Label>
                <Select
                  value={newTriggerType}
                  onValueChange={(v) =>
                    setNewTriggerType(v as ProcedureTriggerType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='intent'>Intent</SelectItem>
                    <SelectItem value='keyword'>Keyword</SelectItem>
                    <SelectItem value='manual'>Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Condition</Label>
                <Input
                  value={newTriggerCondition}
                  onChange={(e) => setNewTriggerCondition(e.target.value)}
                  placeholder='e.g. refund_request'
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
