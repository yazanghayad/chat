import PageContainer from '@/components/layout/page-container';
import BillingClient from '@/features/billing/components/billing-client';

export const metadata = { title: 'Billing' };

export default function BillingPage() {
  return (
    <PageContainer scrollable>
      <BillingClient />
    </PageContainer>
  );
}
