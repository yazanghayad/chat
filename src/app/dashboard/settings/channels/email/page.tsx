import PageContainer from '@/components/layout/page-container';
import EmailChannelClient from '@/features/settings/components/channels/email-channel-client';

export const metadata = { title: 'Settings: Email' };

export default function EmailChannelPage() {
  return (
    <PageContainer scrollable>
      <EmailChannelClient />
    </PageContainer>
  );
}
