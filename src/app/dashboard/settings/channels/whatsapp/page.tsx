import PageContainer from '@/components/layout/page-container';
import WhatsAppChannelClient from '@/features/settings/components/channels/whatsapp-channel-client';

export const metadata = { title: 'Settings: WhatsApp' };

export default function WhatsAppChannelPage() {
  return (
    <PageContainer scrollable>
      <WhatsAppChannelClient />
    </PageContainer>
  );
}
