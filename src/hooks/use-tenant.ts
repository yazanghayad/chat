'use client';

import { useEffect, useState } from 'react';
import { getCurrentTenantAction } from '@/features/auth/actions/get-tenant';
import type { Tenant } from '@/types/appwrite';

interface TenantState {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
}

export function useTenant(): TenantState {
  const [state, setState] = useState<TenantState>({
    tenant: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getCurrentTenantAction();

        if (cancelled) return;

        setState({
          tenant: result.tenant,
          loading: false,
          error: result.error
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          tenant: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load tenant'
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
