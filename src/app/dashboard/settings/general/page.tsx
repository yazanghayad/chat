import PageContainer from '@/components/layout/page-container';
import GeneralSettingsClient from '@/features/settings/components/general-settings-client';

export const metadata = { title: 'Settings: General' };

export default function GeneralSettingsPage() {
  return (
    <PageContainer scrollable>
      <GeneralSettingsClient />
    </PageContainer>
  );
}
