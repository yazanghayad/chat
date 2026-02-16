import PageContainer from '@/components/layout/page-container';
import PhoneChannelClient from '@/features/settings/components/channels/phone-channel-client';

export const metadata = { title: 'Settings: Phone' };

export default function PhoneChannelPage() {
  return (
    <PageContainer scrollable>
      <PhoneChannelClient />
    </PageContainer>
  );
}
