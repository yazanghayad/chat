import PageContainer from '@/components/layout/page-container';
import TeamSettingsClient from '@/features/settings/components/team-settings-client';

export const metadata = { title: 'Settings: Team' };

export default function TeamSettingsPage() {
  return (
    <PageContainer scrollable>
      <TeamSettingsClient />
    </PageContainer>
  );
}
