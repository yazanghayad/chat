'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import {
  listScenariosAction,
  createScenarioAction,
  deleteScenarioAction,
  runScenarioAction,
  type RunScenarioResult
} from '@/features/testing/actions/scenario-crud';
import type { TestScenario } from '@/types/appwrite';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function TestingPageClient() {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RunScenarioResult | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newMessages, setNewMessages] = useState('');
  const [newExpectResolved, setNewExpectResolved] = useState(true);
  const [newMinConfidence, setNewMinConfidence] = useState('0.7');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const res = await listScenariosAction(tenant.$id);
    if (res.success) setScenarios(res.scenarios ?? []);
    setLoading(false);
  }, [tenant]);

  useEffect(() => {
    if (tenant) load();
  }, [tenant, load]);

  async function handleRun(id: string) {
    setRunningId(id);
    setLastResult(null);
    const res = await runScenarioAction(id, tenant!.$id);
    setRunningId(null);
    setLastResult(res);
    if (res.success) {
      toast[res.passed ? 'success' : 'warning'](
        res.passed ? 'Test passed!' : 'Test failed'
      );
      load(); // Refresh to update lastRun
    } else {
      toast.error(res.error ?? 'Simulation failed');
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteScenarioAction(id, tenant!.$id);
    if (res.success) {
      setScenarios((prev) => prev.filter((s) => s.$id !== id));
      toast.success('Scenario deleted');
    } else {
      toast.error(res.error ?? 'Failed to delete');
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newMessages.trim()) return;
    setCreating(true);
    const messages = newMessages
      .split('\n')
      .map((m) => m.trim())
      .filter(Boolean);
    const res = await createScenarioAction(tenant!.$id, {
      name: newName.trim(),
      messages,
      expectedOutcome: {
        resolved: newExpectResolved,
        minConfidence: parseFloat(newMinConfidence) || 0.7
      }
    });
    setCreating(false);
    if (res.success) {
      toast.success('Scenario created');
      setShowCreate(false);
      setNewName('');
      setNewMessages('');
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
          {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => setShowCreate(true)}>
          <Icons.add className='mr-2 h-4 w-4' />
          Add Scenario
        </Button>
      </div>

      {/* Last result banner */}
      {lastResult && lastResult.success && (
        <Card
          className={
            lastResult.passed
              ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
              : 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
          }
        >
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-medium'>
                  {lastResult.passed ? '✓ Test passed' : '✗ Test failed'}
                </p>
                <p className='text-muted-foreground text-sm'>
                  Resolution: {lastResult.actualResolution ? 'Yes' : 'No'}{' '}
                  (expected: {lastResult.expectedResolution ? 'Yes' : 'No'}) ·
                  Confidence:{' '}
                  {(lastResult.actualAvgConfidence * 100).toFixed(0)}% (min:{' '}
                  {(lastResult.expectedMinConfidence * 100).toFixed(0)}
                  %) · Turns: {lastResult.turns}
                </p>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setLastResult(null)}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <Icons.spinner className='text-muted-foreground h-6 w-6 animate-spin' />
        </div>
      ) : scenarios.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center'>
            <p className='text-muted-foreground'>
              No test scenarios yet. Create one to simulate AI conversations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-3'>
          {scenarios.map((scenario) => (
            <Card key={scenario.$id}>
              <CardContent className='flex items-center justify-between p-4'>
                <div>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{scenario.name}</span>
                    <Badge variant='outline'>
                      {scenario.messages?.length ?? 0} message
                      {(scenario.messages?.length ?? 0) !== 1 ? 's' : ''}
                    </Badge>
                    {scenario.expectedOutcome?.resolved && (
                      <Badge variant='secondary'>Expect resolved</Badge>
                    )}
                  </div>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    {scenario.lastRun
                      ? `Last run: ${new Date(scenario.lastRun).toLocaleString()}`
                      : 'Never run'}
                  </p>
                </div>
                <div className='flex gap-1'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleRun(scenario.$id)}
                    disabled={runningId === scenario.$id}
                  >
                    {runningId === scenario.$id ? (
                      <>
                        <Icons.spinner className='mr-1 h-3 w-3 animate-spin' />
                        Running…
                      </>
                    ) : (
                      'Run'
                    )}
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleDelete(scenario.$id)}
                  >
                    <Icons.trash className='h-4 w-4' />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Test Scenario</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Scenario Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='e.g. Refund request flow'
              />
            </div>
            <div className='space-y-2'>
              <Label>User Messages (one per line)</Label>
              <Textarea
                value={newMessages}
                onChange={(e) => setNewMessages(e.target.value)}
                placeholder={
                  'I want a refund\nMy order number is 12345\nYes please process it'
                }
                rows={4}
              />
            </div>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-2'>
                <Switch
                  checked={newExpectResolved}
                  onCheckedChange={setNewExpectResolved}
                />
                <Label>Expect resolved</Label>
              </div>
              <div className='flex items-center gap-2'>
                <Label>Min confidence</Label>
                <Input
                  type='number'
                  step='0.1'
                  min='0'
                  max='1'
                  className='w-20'
                  value={newMinConfidence}
                  onChange={(e) => setNewMinConfidence(e.target.value)}
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
              disabled={creating || !newName.trim() || !newMessages.trim()}
            >
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
