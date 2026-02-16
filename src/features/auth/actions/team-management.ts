'use server';

/**
 * Team management server actions.
 *
 * CRUD operations for tenant team members using Appwrite Teams.
 * Roles: owner, admin, agent, viewer
 */

import { createSessionClient, createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import {
  inviteMember,
  listMembers,
  updateMemberRole,
  removeMember,
  createTeam,
  type TeamRole,
  type TeamMember
} from '@/lib/appwrite/teams';
import { logAuditEventAsync } from '@/lib/audit/logger';
import type { Tenant } from '@/types/appwrite';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthenticatedTenant(): Promise<{
  tenant: Tenant;
  userId: string;
} | null> {
  try {
    const { account, databases } = await createSessionClient();
    const user = await account.get();

    const result = await databases.listDocuments<Tenant>(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      [Query.equal('userId', user.$id), Query.limit(1)]
    );

    if (result.documents.length === 0) return null;
    return { tenant: result.documents[0], userId: user.$id };
  } catch {
    return null;
  }
}

function getTeamId(tenant: Tenant): string | null {
  try {
    const config =
      typeof tenant.config === 'string'
        ? JSON.parse(tenant.config)
        : tenant.config;
    return config?.teamId ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Ensure team exists (create if needed)
// ---------------------------------------------------------------------------

export async function ensureTeamAction(
  tenantId: string
): Promise<{ success: boolean; teamId?: string; error?: string }> {
  const auth = await getAuthenticatedTenant();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const { tenant, userId } = auth;
  if (tenant.$id !== tenantId) {
    return { success: false, error: 'Access denied' };
  }

  const existingTeamId = getTeamId(tenant);
  if (existingTeamId) {
    return { success: true, teamId: existingTeamId };
  }

  try {
    const teamId = await createTeam(tenant.name, userId);

    // Store teamId in tenant config
    const config =
      typeof tenant.config === 'string'
        ? JSON.parse(tenant.config)
        : (tenant.config ?? {});

    config.teamId = teamId;

    const { databases } = createAdminClient();
    await databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      tenant.$id,
      { config: JSON.stringify(config) }
    );

    logAuditEventAsync(tenant.$id, 'team.created', { teamId });

    return { success: true, teamId };
  } catch (err) {
    console.error('ensureTeamAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create team'
    };
  }
}

// ---------------------------------------------------------------------------
// Invite member
// ---------------------------------------------------------------------------

export async function inviteTeamMemberAction(
  tenantId: string,
  email: string,
  roles: TeamRole[] = ['agent']
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuthenticatedTenant();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const { tenant } = auth;
  if (tenant.$id !== tenantId) {
    return { success: false, error: 'Access denied' };
  }

  const teamId = getTeamId(tenant);
  if (!teamId) {
    return {
      success: false,
      error: 'Team not initialized. Call ensureTeam first.'
    };
  }

  try {
    await inviteMember(teamId, email, roles);

    logAuditEventAsync(tenant.$id, 'team.member_invited', {
      email,
      roles
    });

    return { success: true };
  } catch (err) {
    console.error('inviteTeamMemberAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to invite member'
    };
  }
}

// ---------------------------------------------------------------------------
// List members
// ---------------------------------------------------------------------------

export async function listTeamMembersAction(tenantId: string): Promise<{
  success: boolean;
  members?: TeamMember[];
  error?: string;
}> {
  const auth = await getAuthenticatedTenant();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const { tenant } = auth;
  if (tenant.$id !== tenantId) {
    return { success: false, error: 'Access denied' };
  }

  const teamId = getTeamId(tenant);
  if (!teamId) {
    return { success: true, members: [] };
  }

  try {
    const members = await listMembers(teamId);
    return { success: true, members };
  } catch (err) {
    console.error('listTeamMembersAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to list members'
    };
  }
}

// ---------------------------------------------------------------------------
// Update member role
// ---------------------------------------------------------------------------

export async function updateMemberRoleAction(
  tenantId: string,
  membershipId: string,
  roles: TeamRole[]
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuthenticatedTenant();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const { tenant } = auth;
  if (tenant.$id !== tenantId) {
    return { success: false, error: 'Access denied' };
  }

  const teamId = getTeamId(tenant);
  if (!teamId) {
    return { success: false, error: 'Team not initialized' };
  }

  try {
    await updateMemberRole(teamId, membershipId, roles);

    logAuditEventAsync(tenant.$id, 'team.role_updated', {
      membershipId,
      roles
    });

    return { success: true };
  } catch (err) {
    console.error('updateMemberRoleAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update role'
    };
  }
}

// ---------------------------------------------------------------------------
// Remove member
// ---------------------------------------------------------------------------

export async function removeMemberAction(
  tenantId: string,
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuthenticatedTenant();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const { tenant } = auth;
  if (tenant.$id !== tenantId) {
    return { success: false, error: 'Access denied' };
  }

  const teamId = getTeamId(tenant);
  if (!teamId) {
    return { success: false, error: 'Team not initialized' };
  }

  try {
    await removeMember(teamId, membershipId);

    logAuditEventAsync(tenant.$id, 'team.member_removed', {
      membershipId
    });

    return { success: true };
  } catch (err) {
    console.error('removeMemberAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove member'
    };
  }
}
