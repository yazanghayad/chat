'use client';

import { useState, useRef } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Clock,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  Upload,
  Users,
  Video
} from 'lucide-react';

// ── Team Member Data ───────────────────────────────────────

type TeamStatus = 'online' | 'away' | 'busy' | 'offline';
type TeamRole = 'admin' | 'agent' | 'manager' | 'developer';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: TeamRole;
  department: string;
  title: string;
  location: string;
  timezone: string;
  status: TeamStatus;
  avatar?: string;
  skills: string[];
  languages: string[];
  activeTickets: number;
  resolvedToday: number;
  avgResponseTime: string;
  meetLink?: string;
  teamsLink?: string;
}

const teamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Yazan Ghayad',
    email: 'yazan@sweo.ai',
    phone: '+46 70 123 4567',
    role: 'admin',
    department: 'Engineering',
    title: 'Founder & CEO',
    location: 'Stockholm, Sweden',
    timezone: 'CET (UTC+1)',
    status: 'online',
    skills: ['AI/ML', 'Architecture', 'Strategy'],
    languages: ['Swedish', 'English', 'Arabic'],
    activeTickets: 3,
    resolvedToday: 8,
    avgResponseTime: '2 min',
    meetLink: 'https://meet.google.com/abc-defg-hij',
    teamsLink: 'https://teams.microsoft.com/l/chat/0/0?users=yazan@sweo.ai'
  },
  {
    id: '2',
    name: 'Emma Lindström',
    email: 'emma@sweo.ai',
    phone: '+46 73 456 7890',
    role: 'manager',
    department: 'Customer Success',
    title: 'Head of Support',
    location: 'Gothenburg, Sweden',
    timezone: 'CET (UTC+1)',
    status: 'online',
    skills: ['Team Lead', 'Escalations', 'Training'],
    languages: ['Swedish', 'English', 'German'],
    activeTickets: 5,
    resolvedToday: 12,
    avgResponseTime: '4 min',
    meetLink: 'https://meet.google.com/klm-nopq-rst',
    teamsLink: 'https://teams.microsoft.com/l/chat/0/0?users=emma@sweo.ai'
  },
  {
    id: '3',
    name: 'Ahmed Hassan',
    email: 'ahmed@sweo.ai',
    phone: '+46 76 789 0123',
    role: 'agent',
    department: 'Customer Support',
    title: 'Senior Support Agent',
    location: 'Malmö, Sweden',
    timezone: 'CET (UTC+1)',
    status: 'busy',
    skills: ['Billing', 'Technical', 'Refunds'],
    languages: ['Swedish', 'English', 'Arabic', 'French'],
    activeTickets: 8,
    resolvedToday: 15,
    avgResponseTime: '3 min',
    meetLink: 'https://meet.google.com/uvw-xyz-abc'
  },
  {
    id: '4',
    name: 'Sofia Andersson',
    email: 'sofia@sweo.ai',
    phone: '+46 70 234 5678',
    role: 'agent',
    department: 'Customer Support',
    title: 'Support Agent',
    location: 'Stockholm, Sweden',
    timezone: 'CET (UTC+1)',
    status: 'away',
    skills: ['Onboarding', 'Product', 'Integrations'],
    languages: ['Swedish', 'English'],
    activeTickets: 4,
    resolvedToday: 9,
    avgResponseTime: '5 min',
    teamsLink: 'https://teams.microsoft.com/l/chat/0/0?users=sofia@sweo.ai'
  },
  {
    id: '5',
    name: 'Marcus Berg',
    email: 'marcus@sweo.ai',
    phone: '+46 73 345 6789',
    role: 'developer',
    department: 'Engineering',
    title: 'Backend Developer',
    location: 'Uppsala, Sweden',
    timezone: 'CET (UTC+1)',
    status: 'online',
    skills: ['API', 'Database', 'Debugging'],
    languages: ['Swedish', 'English'],
    activeTickets: 2,
    resolvedToday: 5,
    avgResponseTime: '8 min',
    meetLink: 'https://meet.google.com/def-ghi-jkl'
  },
  {
    id: '6',
    name: 'Lina Johansson',
    email: 'lina@sweo.ai',
    phone: '+46 76 456 7890',
    role: 'agent',
    department: 'Customer Support',
    title: 'Support Agent',
    location: 'Linköping, Sweden',
    timezone: 'CET (UTC+1)',
    status: 'offline',
    skills: ['Returns', 'Complaints', 'Social Media'],
    languages: ['Swedish', 'English', 'Spanish'],
    activeTickets: 0,
    resolvedToday: 0,
    avgResponseTime: '4 min'
  }
];

// ── Shared files mock ──────────────────────────────────────

interface SharedFile {
  id: string;
  name: string;
  size: string;
  date: string;
  from: string;
}

const sharedFiles: SharedFile[] = [
  {
    id: '1',
    name: 'Q4-report-2025.pdf',
    size: '2.4 MB',
    date: '2h ago',
    from: 'Emma Lindström'
  },
  {
    id: '2',
    name: 'escalation-process.docx',
    size: '156 KB',
    date: '1d ago',
    from: 'Yazan Ghayad'
  },
  {
    id: '3',
    name: 'customer-feedback-jan.xlsx',
    size: '890 KB',
    date: '3d ago',
    from: 'Ahmed Hassan'
  }
];

// ── Helpers ────────────────────────────────────────────────

const statusColors: Record<TeamStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400'
};

const statusLabels: Record<TeamStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline'
};

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('');
}

// ── Team Row ───────────────────────────────────────────────

function TeamRow({
  member,
  selected,
  onSelect
}: {
  member: TeamMember;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'hover:bg-accent/50 flex cursor-pointer items-center gap-3 border-b px-4 py-3 transition-colors',
        selected && 'bg-accent'
      )}
    >
      <div className='relative'>
        <Avatar className='h-9 w-9'>
          {member.avatar ? <AvatarImage src={member.avatar} /> : null}
          <AvatarFallback className='text-xs'>
            {initials(member.name)}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900',
            statusColors[member.status]
          )}
        />
      </div>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium'>{member.name}</p>
        <p className='text-muted-foreground truncate text-xs'>{member.title}</p>
      </div>
      <div className='text-right'>
        <p className='text-muted-foreground text-[10px]'>
          {member.activeTickets} active
        </p>
        <p className='text-muted-foreground text-[10px]'>
          {statusLabels[member.status]}
        </p>
      </div>
    </div>
  );
}

// ── Team Detail Panel ──────────────────────────────────────

function TeamDetail({ member }: { member: TeamMember }) {
  const [msgOpen, setMsgOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [meetDialogOpen, setMeetDialogOpen] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <ScrollArea className='h-full'>
      <div className='space-y-6 p-6'>
        {/* Header */}
        <div className='flex items-start gap-4'>
          <div className='relative'>
            <Avatar className='h-16 w-16'>
              {member.avatar ? <AvatarImage src={member.avatar} /> : null}
              <AvatarFallback className='text-xl'>
                {initials(member.name)}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'absolute right-0.5 bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900',
                statusColors[member.status]
              )}
            />
          </div>
          <div className='flex-1'>
            <h3 className='text-lg font-semibold'>{member.name}</h3>
            <p className='text-muted-foreground text-sm'>{member.title}</p>
            <p className='text-muted-foreground text-xs'>{member.department}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className='grid grid-cols-4 gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='flex h-auto flex-col gap-1 py-3 text-[10px]'
            onClick={() => setMsgOpen(true)}
          >
            <MessageSquare className='h-4 w-4' />
            Message
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='flex h-auto flex-col gap-1 py-3 text-[10px]'
            onClick={() => setEmailOpen(true)}
          >
            <Mail className='h-4 w-4' />
            Email
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='flex h-auto flex-col gap-1 py-3 text-[10px]'
            onClick={() => {
              window.open(`tel:${member.phone}`, '_self');
              toast.success(`Calling ${member.name}...`);
            }}
          >
            <Phone className='h-4 w-4' />
            Call
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='flex h-auto flex-col gap-1 py-3 text-[10px]'
            onClick={() => setMeetDialogOpen(true)}
          >
            <Video className='h-4 w-4' />
            Meet
          </Button>
        </div>

        <Separator />

        {/* Contact Info */}
        <div className='space-y-3'>
          <h4 className='text-xs font-semibold tracking-wider text-gray-500 uppercase'>
            Contact Info
          </h4>
          <div className='space-y-2.5'>
            <button
              onClick={() => {
                navigator.clipboard.writeText(member.email);
                toast.success('Email copied');
              }}
              className='hover:bg-accent/50 flex w-full items-center gap-2.5 rounded-md px-1 py-1 text-sm transition-colors'
            >
              <Mail className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
              <span className='truncate'>{member.email}</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(member.phone);
                toast.success('Phone copied');
              }}
              className='hover:bg-accent/50 flex w-full items-center gap-2.5 rounded-md px-1 py-1 text-sm transition-colors'
            >
              <Phone className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
              <span>{member.phone}</span>
            </button>
            <div className='flex items-center gap-2.5 px-1 py-1 text-sm'>
              <MapPin className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
              <span>{member.location}</span>
            </div>
            <div className='flex items-center gap-2.5 px-1 py-1 text-sm'>
              <Clock className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
              <span>{member.timezone}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Skills & Languages */}
        <div className='space-y-3'>
          <h4 className='text-xs font-semibold tracking-wider text-gray-500 uppercase'>
            Skills
          </h4>
          <div className='flex flex-wrap gap-1.5'>
            {member.skills.map((skill) => (
              <Badge key={skill} variant='secondary' className='text-[10px]'>
                {skill}
              </Badge>
            ))}
          </div>
          <h4 className='pt-1 text-xs font-semibold tracking-wider text-gray-500 uppercase'>
            Languages
          </h4>
          <div className='flex flex-wrap gap-1.5'>
            {member.languages.map((lang) => (
              <Badge key={lang} variant='outline' className='text-[10px]'>
                {lang}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Stats */}
        <div className='space-y-3'>
          <h4 className='text-xs font-semibold tracking-wider text-gray-500 uppercase'>
            Performance
          </h4>
          <div className='grid grid-cols-3 gap-3'>
            <div className='bg-muted/50 rounded-lg p-3 text-center'>
              <p className='text-lg font-bold'>{member.activeTickets}</p>
              <p className='text-muted-foreground text-[10px]'>Active</p>
            </div>
            <div className='bg-muted/50 rounded-lg p-3 text-center'>
              <p className='text-lg font-bold'>{member.resolvedToday}</p>
              <p className='text-muted-foreground text-[10px]'>Resolved</p>
            </div>
            <div className='bg-muted/50 rounded-lg p-3 text-center'>
              <p className='text-lg font-bold'>{member.avgResponseTime}</p>
              <p className='text-muted-foreground text-[10px]'>Avg resp.</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Shared files */}
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <h4 className='text-xs font-semibold tracking-wider text-gray-500 uppercase'>
              Shared Files
            </h4>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 px-2 text-[10px]'
              onClick={() => setFileDialogOpen(true)}
            >
              <Upload className='mr-1 h-3 w-3' />
              Share
            </Button>
          </div>
          <div className='space-y-1.5'>
            {sharedFiles.map((file) => (
              <div
                key={file.id}
                className='hover:bg-accent/50 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 transition-colors'
              >
                <FileText className='text-muted-foreground h-4 w-4 shrink-0' />
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-xs font-medium'>{file.name}</p>
                  <p className='text-muted-foreground text-[10px]'>
                    {file.size} &bull; {file.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Meeting links */}
        <div className='space-y-3'>
          <h4 className='text-xs font-semibold tracking-wider text-gray-500 uppercase'>
            Schedule a Meeting
          </h4>
          <div className='flex gap-2'>
            {member.meetLink && (
              <Button
                variant='outline'
                size='sm'
                className='flex-1 text-xs'
                onClick={() => {
                  window.open(member.meetLink, '_blank');
                  toast.success('Opening Google Meet...');
                }}
              >
                <Video className='mr-1.5 h-3.5 w-3.5 text-green-600' />
                Google Meet
              </Button>
            )}
            {member.teamsLink && (
              <Button
                variant='outline'
                size='sm'
                className='flex-1 text-xs'
                onClick={() => {
                  window.open(member.teamsLink, '_blank');
                  toast.success('Opening Microsoft Teams...');
                }}
              >
                <Video className='mr-1.5 h-3.5 w-3.5 text-blue-600' />
                Teams
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Message Dialog ── */}
      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Message {member.name}</DialogTitle>
            <DialogDescription>
              Send a quick internal message about a case or question.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder='Write your message...'
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setMsgOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!msgText.trim()}
              onClick={() => {
                toast.success(`Message sent to ${member.name}`);
                setMsgOpen(false);
                setMsgText('');
              }}
            >
              <Send className='mr-2 h-4 w-4' />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Email Dialog ── */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Email {member.name}</DialogTitle>
            <DialogDescription>
              Send an email to {member.email}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <Input
              placeholder='Subject'
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
            <Textarea
              placeholder='Write your email...'
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!emailSubject.trim() || !emailBody.trim()}
              onClick={() => {
                toast.success(`Email sent to ${member.email}`);
                setEmailOpen(false);
                setEmailSubject('');
                setEmailBody('');
              }}
            >
              <Mail className='mr-2 h-4 w-4' />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Share File Dialog ── */}
      <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Share files with {member.name}</DialogTitle>
            <DialogDescription>
              Upload files to share with your teammate.
            </DialogDescription>
          </DialogHeader>
          <div
            className='hover:bg-accent/50 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors'
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className='text-muted-foreground mx-auto mb-2 h-8 w-8' />
            <p className='text-sm font-medium'>Click to upload</p>
            <p className='text-muted-foreground mt-1 text-xs'>
              PDF, DOCX, XLSX, images up to 25MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            className='hidden'
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) {
                toast.success(
                  `${files.length} file(s) shared with ${member.name}`
                );
                setFileDialogOpen(false);
              }
              e.target.value = '';
            }}
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setFileDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Meet Dialog ── */}
      <Dialog open={meetDialogOpen} onOpenChange={setMeetDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Schedule meeting with {member.name}</DialogTitle>
            <DialogDescription>
              Choose your preferred platform to start a meeting.
            </DialogDescription>
          </DialogHeader>
          <div className='grid grid-cols-2 gap-3 py-4'>
            <Button
              variant='outline'
              className='flex h-auto flex-col gap-2 py-6'
              onClick={() => {
                const link = member.meetLink ?? 'https://meet.google.com/new';
                window.open(link, '_blank');
                toast.success('Opening Google Meet...');
                setMeetDialogOpen(false);
              }}
            >
              <Video className='h-8 w-8 text-green-600' />
              <span className='text-sm font-medium'>Google Meet</span>
              <span className='text-muted-foreground text-[10px]'>
                Start instantly
              </span>
            </Button>
            <Button
              variant='outline'
              className='flex h-auto flex-col gap-2 py-6'
              onClick={() => {
                const link =
                  member.teamsLink ??
                  `https://teams.microsoft.com/l/chat/0/0?users=${member.email}`;
                window.open(link, '_blank');
                toast.success('Opening Microsoft Teams...');
                setMeetDialogOpen(false);
              }}
            >
              <Video className='h-8 w-8 text-blue-600' />
              <span className='text-sm font-medium'>Teams</span>
              <span className='text-muted-foreground text-[10px]'>
                Start instantly
              </span>
            </Button>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setMeetDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

// ── Main ───────────────────────────────────────────────────

export default function ContactsPageClient() {
  const { tenant, loading } = useTenant();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string>(
    teamMembers[0]?.id ?? ''
  );

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  const departments = teamMembers
    .map((m) => m.department)
    .filter((d, i, arr) => arr.indexOf(d) === i)
    .sort();

  const filtered = teamMembers.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.department.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || m.department === filterDept;
    const matchStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const selected = teamMembers.find((m) => m.id === selectedId);
  const onlineCount = teamMembers.filter((m) => m.status === 'online').length;

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Team</h2>
          <p className='text-muted-foreground text-sm'>
            {teamMembers.length} teammates &bull;{' '}
            <span className='text-green-600'>{onlineCount} online</span>
          </p>
        </div>
        <Button size='sm'>
          <Plus className='mr-1.5 h-3.5 w-3.5' />
          Invite teammate
        </Button>
      </div>

      {/* Filters */}
      <div className='flex items-center gap-2'>
        <div className='relative max-w-xs flex-1'>
          <Search className='text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2' />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search team...'
            className='h-8 pl-8 text-xs'
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className='h-8 w-44 text-xs'>
            <SelectValue placeholder='Department' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className='h-8 w-32 text-xs'>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All status</SelectItem>
            <SelectItem value='online'>Online</SelectItem>
            <SelectItem value='away'>Away</SelectItem>
            <SelectItem value='busy'>Busy</SelectItem>
            <SelectItem value='offline'>Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main content */}
      <div className='flex h-[calc(100vh-16rem)] overflow-hidden rounded-lg border'>
        {/* Team List */}
        <div className='flex w-80 flex-col border-r'>
          <div className='flex-1 overflow-y-auto'>
            {filtered.map((member) => (
              <TeamRow
                key={member.id}
                member={member}
                selected={member.id === selectedId}
                onSelect={() => setSelectedId(member.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className='text-muted-foreground flex flex-col items-center gap-2 p-8 text-center text-sm'>
                <Users className='h-8 w-8 opacity-30' />
                No teammates found
              </div>
            )}
          </div>
          <div className='text-muted-foreground border-t px-3 py-2 text-center text-[11px]'>
            {filtered.length} of {teamMembers.length} teammates
          </div>
        </div>

        {/* Detail Panel */}
        <div className='flex-1 overflow-hidden'>
          {selected ? (
            <TeamDetail member={selected} />
          ) : (
            <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm'>
              <Users className='h-12 w-12 opacity-20' />
              Select a teammate to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
