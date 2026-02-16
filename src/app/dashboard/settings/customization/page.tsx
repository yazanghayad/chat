import PageContainer from '@/components/layout/page-container';
import CustomizationSettingsClient from '@/features/settings/components/customization-settings-client';

export const metadata = { title: 'Settings: Customization' };

export default function CustomizationSettingsPage() {
  return (
    <PageContainer scrollable>
      <CustomizationSettingsClient />
    </PageContainer>
  );
}
