import { getTenantBySubdomain } from '@/lib/tenant/subdomain';
import { notFound } from 'next/navigation';

interface PortalPageProps {
  params: Promise<{ subdomain: string }>;
}

/**
 * Public portal page served when a user visits `acme.optitech.software`.
 * This is where the embedded chat widget / help center would render.
 */
export default async function PortalPage({ params }: PortalPageProps) {
  const { subdomain } = await params;
  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    notFound();
  }

  const config = (
    typeof tenant.config === 'string'
      ? JSON.parse(tenant.config)
      : tenant.config
  ) as Record<string, unknown>;

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900'>
      <div className='mx-auto max-w-md space-y-6 text-center'>
        <div className='bg-primary/10 text-primary mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold'>
          {tenant.name.charAt(0).toUpperCase()}
        </div>
        <h1 className='text-2xl font-bold'>{tenant.name}</h1>
        <p className='text-muted-foreground'>
          Welcome to our support portal. How can we help you today?
        </p>

        {/* Chat widget will auto-load here */}
        <div
          id='sweo-chat-container'
          data-tenant-id={tenant.$id}
          data-api-key={tenant.apiKey}
          data-subdomain={subdomain}
        />

        <script
          src='/widget/chat-widget.js'
          data-tenant-id={tenant.$id}
          defer
        />
      </div>
    </div>
  );
}
