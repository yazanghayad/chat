import PageContainer from '@/components/layout/page-container';
import SmsChannelClient from '@/features/settings/components/channels/sms-channel-client';

export const metadata = { title: 'Settings: SMS' };

export default function SmsChannelPage() {
  return (
    <PageContainer scrollable>
      <SmsChannelClient />
    </PageContainer>
  );
}
