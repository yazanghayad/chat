import { DocsHeader } from '@/features/docs';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dokumentation – SWEO AI',
  description:
    'Lär dig allt om SWEO AI-plattformen – kunskapsbas, AI-automation, kanaler, integrationer och mer.'
};

export default function DocsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='bg-background min-h-screen'>
      <DocsHeader />
      {children}
    </div>
  );
}
