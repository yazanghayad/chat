'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import {
  listConnectorsAction,
  createConnectorAction,
  deleteConnectorAction,
  testConnectorAction
} from '@/features/connectors/actions/connector-crud';
import type { DataConnector, DataConnectorProvider } from '@/types/appwrite';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const providerLabels: Record<DataConnectorProvider, string> = {
  shopify: 'Shopify',
  stripe: 'Stripe',
  zendesk: 'Zendesk',
  salesforce: 'Salesforce',
  custom: 'Custom'
};

export default function ConnectorsPageClient() {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const [connectors, setConnectors] = useState<DataConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newProvider, setNewProvider] =
    useState<DataConnectorProvider>('custom');
  const [newAuthType, setNewAuthType] = useState<'api_key' | 'oauth' | 'basic'>(
    'api_key'
  );
  const [newApiKey, setNewApiKey] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const res = await listConnectorsAction(tenant.$id);
    if (res.success) setConnectors(res.connectors ?? []);
    setLoading(false);
  }, [tenant]);

  useEffect(() => {
    if (tenant) load();
  }, [tenant, load]);

  async function handleDelete(id: string) {
    const res = await deleteConnectorAction(id, tenant!.$id);
    if (res.success) {
      setConnectors((prev) => prev.filter((c) => c.$id !== id));
      toast.success('Connector deleted');
    } else {
      toast.error(res.error ?? 'Failed to delete');
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    const res = await testConnectorAction(id, tenant!.$id);
    setTestingId(null);
    if (res.success) {
      toast.success(`Connection OK (status ${res.status})`);
    } else {
      toast.error(res.error ?? 'Connection test failed');
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createConnectorAction(tenant!.$id, {
      name: newName.trim(),
      provider: newProvider,
      auth: {
        type: newAuthType,
        credentials: newAuthType === 'api_key' ? { apiKey: newApiKey } : {},
        baseUrl: newBaseUrl || undefined
      }
    });
    setCreating(false);
    if (res.success) {
      toast.success('Connector created');
      setShowCreate(false);
      setNewName('');
      setNewApiKey('');
      setNewBaseUrl('');
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
          {connectors.length} connector{connectors.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => setShowCreate(true)}>
          <Icons.add className='mr-2 h-4 w-4' />
          Add Connector
        </Button>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <Icons.spinner className='text-muted-foreground h-6 w-6 animate-spin' />
        </div>
      ) : connectors.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center'>
            <p className='text-muted-foreground'>
              No connectors yet. Add one to integrate third-party services.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-3'>
          {connectors.map((conn) => (
            <Card key={conn.$id}>
              <CardContent className='flex items-center justify-between p-4'>
                <div className='flex items-center gap-4'>
                  <div
                    className={`h-3 w-3 rounded-full ${conn.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  />
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>{conn.name}</span>
                      <Badge variant='secondary'>
                        {providerLabels[conn.provider]}
                      </Badge>
                      <Badge variant='outline'>{conn.auth?.type}</Badge>
                    </div>
                    <p className='text-muted-foreground mt-0.5 text-xs'>
                      {conn.endpoints?.length ?? 0} endpoint
                      {(conn.endpoints?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className='flex gap-1'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleTest(conn.$id)}
                    disabled={testingId === conn.$id}
                  >
                    {testingId === conn.$id ? 'Testing…' : 'Test'}
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleDelete(conn.$id)}
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
            <DialogTitle>Add Connector</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='e.g. My Shopify Store'
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Provider</Label>
                <Select
                  value={newProvider}
                  onValueChange={(v) =>
                    setNewProvider(v as DataConnectorProvider)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='shopify'>Shopify</SelectItem>
                    <SelectItem value='stripe'>Stripe</SelectItem>
                    <SelectItem value='zendesk'>Zendesk</SelectItem>
                    <SelectItem value='salesforce'>Salesforce</SelectItem>
                    <SelectItem value='custom'>Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Auth Type</Label>
                <Select
                  value={newAuthType}
                  onValueChange={(v) =>
                    setNewAuthType(v as 'api_key' | 'oauth' | 'basic')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='api_key'>API Key</SelectItem>
                    <SelectItem value='oauth'>OAuth</SelectItem>
                    <SelectItem value='basic'>Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='space-y-2'>
              <Label>Base URL</Label>
              <Input
                value={newBaseUrl}
                onChange={(e) => setNewBaseUrl(e.target.value)}
                placeholder='https://api.example.com'
              />
            </div>
            {newAuthType === 'api_key' && (
              <div className='space-y-2'>
                <Label>API Key</Label>
                <Input
                  type='password'
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder='sk-...'
                />
              </div>
            )}
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
