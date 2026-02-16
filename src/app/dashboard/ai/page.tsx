import PageContainer from '@/components/layout/page-container';
import AIAutomationPageClient from '@/features/ai-automation/components/ai-automation-page-client';

export const metadata = { title: 'AI & Automation' };

export default function AIAutomationPage() {
  return (
    <PageContainer>
      <div className='space-y-2'>
        <h2 className='text-2xl font-bold tracking-tight'>AI & Automation</h2>
        <p className='text-muted-foreground text-sm'>
          Configure your AI agent, inbox AI tools, and automation rules.
        </p>
      </div>
      <AIAutomationPageClient />
    </PageContainer>
  );
}
