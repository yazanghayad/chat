import PageContainer from '@/components/layout/page-container';
import SettingsPageClient from '@/features/settings/components/settings-page-client';

export const metadata = { title: 'Settings: API & Tokens' };

export default function ApiTokensPage() {
  return (
    <PageContainer scrollable>
      <SettingsPageClient />
    </PageContainer>
  );
}
