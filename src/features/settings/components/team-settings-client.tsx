'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Mail,
  MoreHorizontal,
  Plus,
  Shield,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'viewer';
  status: 'active' | 'pending';
  initials: string;
}

const mockTeam: TeamMember[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@company.com',
    role: 'admin',
    status: 'active',
    initials: 'AU'
  },
  {
    id: '2',
    name: 'Support Agent',
    email: 'agent@company.com',
    role: 'agent',
    status: 'active',
    initials: 'SA'
  }
];

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  agent: 'Agent',
  viewer: 'Viewer'
};

const roleColors: Record<string, string> = {
  admin: 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950',
  agent: 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950',
  viewer: 'text-gray-600 border-gray-200 bg-gray-50 dark:bg-gray-950'
};

export default function TeamSettingsClient() {
  const [members, setMembers] = useState<TeamMember[]>(mockTeam);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleInvite() {
    if (!inviteEmail) return;
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole as TeamMember['role'],
      status: 'pending',
      initials: inviteEmail.slice(0, 2).toUpperCase()
    };
    setMembers((prev) => [...prev, newMember]);
    setInviteEmail('');
    setDialogOpen(false);
    toast.success(`Invitation sent to ${inviteEmail}`);
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    toast.success('Team member removed');
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <Link
          href='/dashboard/settings'
          className='text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='h-5 w-5' />
        </Link>
        <div>
          <h2 className='text-lg font-semibold'>Teammates</h2>
          <p className='text-muted-foreground text-sm'>
            Manage team members, roles, and permissions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='text-base'>Team Members</CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size='sm'>
                <UserPlus className='mr-2 h-4 w-4' />
                Invite Teammate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Teammate</DialogTitle>
                <DialogDescription>
                  Send an invitation email to add a new team member
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='invite-email'>Email address</Label>
                  <Input
                    id='invite-email'
                    type='email'
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder='teammate@company.com'
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='invite-role'>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger id='invite-role'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='admin'>Admin</SelectItem>
                      <SelectItem value='agent'>Agent</SelectItem>
                      <SelectItem value='viewer'>Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleInvite} disabled={!inviteEmail}>
                  <Mail className='mr-2 h-4 w-4' />
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className='flex items-center gap-3'>
                      <Avatar className='h-8 w-8'>
                        <AvatarFallback className='text-xs'>
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className='text-sm font-medium'>{member.name}</p>
                        <p className='text-muted-foreground text-xs'>
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant='outline'
                      className={roleColors[member.role]}
                    >
                      {member.role === 'admin' && (
                        <Shield className='mr-1 h-3 w-3' />
                      )}
                      {roleLabels[member.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.status === 'active' ? 'default' : 'secondary'
                      }
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => removeMember(member.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Roles & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Roles & Permissions</CardTitle>
          <CardDescription>
            Define what each role can do in the workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <div className='flex items-center justify-between rounded-lg border p-3'>
              <div>
                <p className='text-sm font-medium'>Admin</p>
                <p className='text-muted-foreground text-xs'>
                  Full access to all settings, billing, and team management
                </p>
              </div>
              <Badge variant='outline' className='text-red-600'>
                Full Access
              </Badge>
            </div>
            <div className='flex items-center justify-between rounded-lg border p-3'>
              <div>
                <p className='text-sm font-medium'>Agent</p>
                <p className='text-muted-foreground text-xs'>
                  Can view and respond to conversations, manage knowledge
                </p>
              </div>
              <Badge variant='outline' className='text-blue-600'>
                Limited Access
              </Badge>
            </div>
            <div className='flex items-center justify-between rounded-lg border p-3'>
              <div>
                <p className='text-sm font-medium'>Viewer</p>
                <p className='text-muted-foreground text-xs'>
                  Read-only access to conversations and reports
                </p>
              </div>
              <Badge variant='outline' className='text-gray-600'>
                Read Only
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
