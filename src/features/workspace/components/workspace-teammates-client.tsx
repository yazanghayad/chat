'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Users, Plus, MoreHorizontal, Mail, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const mockTeammates = [
  {
    name: 'Yazan Ghayad',
    email: 'yazan@sweo.ai',
    role: 'Owner',
    status: 'Active',
    initials: 'YG'
  },
  {
    name: 'Support Agent',
    email: 'agent@sweo.ai',
    role: 'Agent',
    status: 'Active',
    initials: 'SA'
  },
  {
    name: 'New Member',
    email: 'new@sweo.ai',
    role: 'Agent',
    status: 'Pending',
    initials: 'NM'
  }
];

export default function WorkspaceTeammatesClient() {
  const { tenant, loading } = useTenant();
  const [inviteEmail, setInviteEmail] = useState('');

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Teammates</h2>
          <p className='text-muted-foreground'>
            Manage team members, roles, and permissions
          </p>
        </div>
        <Badge variant='outline' className='text-sm'>
          {mockTeammates.length} / 5 seats
        </Badge>
      </div>

      {/* Invite */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Mail className='h-4 w-4' />
            Invite Teammate
          </CardTitle>
          <CardDescription>
            Send an invitation to join your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex gap-2'>
            <Input
              placeholder='email@example.com'
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className='max-w-sm'
            />
            <Select defaultValue='agent'>
              <SelectTrigger className='w-32'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='admin'>Admin</SelectItem>
                <SelectItem value='agent'>Agent</SelectItem>
                <SelectItem value='viewer'>Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                if (inviteEmail) {
                  toast.success(`Invitation sent to ${inviteEmail}`);
                  setInviteEmail('');
                }
              }}
            >
              <Plus className='mr-1 h-4 w-4' />
              Invite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team List */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Users className='h-4 w-4' />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-1'>
          {mockTeammates.map((member, i) => (
            <div key={member.email}>
              <div className='flex items-center justify-between py-3'>
                <div className='flex items-center gap-3'>
                  <Avatar className='h-9 w-9'>
                    <AvatarFallback className='bg-primary/10 text-primary text-xs'>
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
                <div className='flex items-center gap-2'>
                  <Badge
                    variant={
                      member.status === 'Active' ? 'default' : 'secondary'
                    }
                  >
                    {member.status}
                  </Badge>
                  <Badge variant='outline'>
                    <Shield className='mr-1 h-3 w-3' />
                    {member.role}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost' size='sm'>
                        <MoreHorizontal className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        onClick={() =>
                          toast.info(`Edit role for ${member.name}`)
                        }
                      >
                        Change role
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='text-destructive'
                        onClick={() => toast.info(`Remove ${member.name}`)}
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {i < mockTeammates.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
