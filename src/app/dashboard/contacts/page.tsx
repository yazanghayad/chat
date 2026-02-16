import PageContainer from '@/components/layout/page-container';
import ContactsPageClient from '@/features/contacts/components/contacts-page-client';

export const metadata = { title: 'Team' };

export default function ContactsPage() {
  return (
    <PageContainer>
      <ContactsPageClient />
    </PageContainer>
  );
}
