/**
 * Appwrite Teams integration for multi-user tenant management.
 *
 * Each tenant gets an Appwrite Team. Team members can access the
 * tenant's dashboard based on their assigned role.
 *
 * Roles: owner, admin, agent, viewer
 */

import { createAdminClient, createSessionClient } from './server';
import { Teams, type Models } from 'node-appwrite';
import { ID } from 'node-appwrite';

// Appwrite SDK types roles as a narrow enum, but the API accepts any string.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppwriteRoles = any[];

/**
 * Get a Teams instance from the admin client.
 */
function getAdminTeams(): Teams {
  const { client } = createAdminClient();
  return new Teams(client);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TeamRole = 'owner' | 'admin' | 'agent' | 'viewer';

export interface TeamMember {
  userId: string;
  email: string;
  name: string;
  roles: TeamRole[];
  joinedAt: string;
  membershipId: string;
}

// ---------------------------------------------------------------------------
// Team CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new Appwrite Team linked to a tenant.
 * Called during tenant creation.
 */
export async function createTeam(
  tenantName: string,
  ownerUserId: string
): Promise<string> {
  const teams = getAdminTeams();

  const team = await teams.create(ID.unique(), tenantName, [
    'owner'
  ] as AppwriteRoles);

  // Add the creator as owner member
  try {
    await teams.createMembership(
      team.$id,
      ['owner'] as AppwriteRoles,
      undefined, // email
      ownerUserId, // userId
      undefined, // phone
      undefined, // url (callback)
      undefined // name
    );
  } catch (err) {
    // If the creator is already a member (auto-added), ignore
    console.warn('[teams] Owner auto-membership note:', err);
  }

  return team.$id;
}

/**
 * Invite a new member to the tenant's team via email.
 */
export async function inviteMember(
  teamId: string,
  email: string,
  roles: TeamRole[] = ['agent'],
  callbackUrl?: string
): Promise<Models.Membership> {
  const teams = getAdminTeams();

  const membership = await teams.createMembership(
    teamId,
    roles as AppwriteRoles,
    email,
    undefined, // userId
    undefined, // phone
    callbackUrl ??
      `${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}/dashboard`,
    undefined // name
  );

  return membership;
}

/**
 * List all members of a team.
 */
export async function listMembers(teamId: string): Promise<TeamMember[]> {
  const teams = getAdminTeams();

  const result = await teams.listMemberships(teamId);

  return result.memberships.map((m) => ({
    userId: m.userId,
    email: m.userEmail,
    name: m.userName,
    roles: m.roles as TeamRole[],
    joinedAt: m.joined,
    membershipId: m.$id
  }));
}

/**
 * Update a member's roles.
 */
export async function updateMemberRole(
  teamId: string,
  membershipId: string,
  roles: TeamRole[]
): Promise<Models.Membership> {
  const teams = getAdminTeams();
  return teams.updateMembership(teamId, membershipId, roles as AppwriteRoles);
}

/**
 * Remove a member from the team.
 */
export async function removeMember(
  teamId: string,
  membershipId: string
): Promise<void> {
  const teams = getAdminTeams();
  await teams.deleteMembership(teamId, membershipId);
}

/**
 * Get the team associated with a tenant (by teamId stored on tenant doc).
 * Returns team details.
 */
export async function getTeam(
  teamId: string
): Promise<Models.Team<Models.Preferences>> {
  const teams = getAdminTeams();
  return teams.get(teamId);
}

/**
 * Check if a user belongs to a team (session-based).
 */
export async function isUserInTeam(teamId: string): Promise<boolean> {
  try {
    const { client } = await createSessionClient();
    const teams = new Teams(client);
    const memberships = await teams.listMemberships(teamId);
    return memberships.memberships.length > 0;
  } catch {
    return false;
  }
}
