import PageContainer from '@/components/layout/page-container';
import MessengerChannelClient from '@/features/settings/components/channels/messenger-channel-client';

export const metadata = { title: 'Settings: Messenger' };

export default function MessengerChannelPage() {
  return (
    <PageContainer scrollable>
      <MessengerChannelClient />
    </PageContainer>
  );
}
