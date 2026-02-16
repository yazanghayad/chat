'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Phone, Mic, Clock, Volume2 } from 'lucide-react';
import Link from 'next/link';

export default function PhoneChannelClient() {
  const { tenant, loading } = useTenant();
  const [enabled, setEnabled] = useState(false);
  const [voicemail, setVoicemail] = useState(true);
  const [recording, setRecording] = useState(false);
  const [transcription, setTranscription] = useState(true);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-6 pb-8'>
      <div className='flex items-center gap-3'>
        <Link
          href='/dashboard/settings'
          className='text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='h-5 w-5' />
        </Link>
        <div className='flex items-center gap-2'>
          <Phone className='h-5 w-5' />
          <h2 className='text-lg font-semibold'>Phone</h2>
          <Badge variant={enabled ? 'default' : 'secondary'}>
            {enabled ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Channel Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Enable Phone</p>
              <p className='text-muted-foreground text-xs'>
                Allow customers to reach support via voice calls (Twilio)
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Phone className='h-4 w-4' />
            Phone Number
          </CardTitle>
          <CardDescription>
            Configure your Twilio phone number for inbound/outbound calls
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>Twilio Phone Number</Label>
            <Input placeholder='+1 (555) 000-0000' />
          </div>
          <div className='space-y-2'>
            <Label>Twilio Account SID</Label>
            <Input placeholder='AC...' type='password' />
          </div>
          <div className='space-y-2'>
            <Label>Twilio Auth Token</Label>
            <Input placeholder='••••••••' type='password' />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Mic className='h-4 w-4' />
            Voice Settings
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>AI Voice</Label>
            <Select defaultValue='nova'>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='nova'>Nova (Female)</SelectItem>
                <SelectItem value='alloy'>Alloy (Neutral)</SelectItem>
                <SelectItem value='echo'>Echo (Male)</SelectItem>
                <SelectItem value='onyx'>Onyx (Male)</SelectItem>
                <SelectItem value='shimmer'>Shimmer (Female)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Call recording</p>
              <p className='text-muted-foreground text-xs'>
                Record calls for quality assurance and training
              </p>
            </div>
            <Switch checked={recording} onCheckedChange={setRecording} />
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Auto-transcription</p>
              <p className='text-muted-foreground text-xs'>
                Automatically transcribe calls using Whisper STT
              </p>
            </div>
            <Switch
              checked={transcription}
              onCheckedChange={setTranscription}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Clock className='h-4 w-4' />
            Availability
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Voicemail</p>
              <p className='text-muted-foreground text-xs'>
                Enable voicemail when agents are unavailable
              </p>
            </div>
            <Switch checked={voicemail} onCheckedChange={setVoicemail} />
          </div>
          <Separator />
          <div className='space-y-2'>
            <Label>Greeting message</Label>
            <Input placeholder='Thank you for calling. How can we help you today?' />
          </div>
          <div className='space-y-2'>
            <Label>Max wait time (seconds)</Label>
            <Input type='number' defaultValue={60} />
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button onClick={() => toast.success('Phone settings saved')}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
