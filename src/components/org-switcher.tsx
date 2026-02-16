'use client';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';

export function OrgSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='sm'
          className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground overflow-visible group-data-[collapsible=icon]:!size-auto group-data-[collapsible=icon]:!p-1'
        >
          <div className='flex shrink-0 items-center justify-center'>
            {/* Full text logo — visible when expanded */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src='/logo_sweo.svg?v=2'
              alt='SWEO'
              className='h-8 w-auto group-data-[collapsible=icon]:hidden dark:invert'
            />
            {/* Small molecule icon — visible when collapsed */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src='/logo-icon-light.svg'
              alt='SWEO'
              className='hidden h-7 w-7 group-data-[collapsible=icon]:block dark:!hidden'
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src='/logo-icon-dark.svg'
              alt='SWEO'
              className='!hidden h-7 w-7 dark:group-data-[collapsible=icon]:!block'
            />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
