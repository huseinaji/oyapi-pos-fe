import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronDown, ShoppingCart } from 'lucide-react';
import { navIcons, navItems } from '@/configs/navConfig';
import type {
  MenuItem,
  MenuLeafSubItem,
  MenuSubItem,
  NavItem,
} from '@/configs/navConfig';
import type { AuthUser } from '@/lib/auth/auth-store';
import { useCashierSessionsQuery } from '@/lib/cashier-sessions/cashier-sessions-store';
import { useGetCurrentStoreQuery } from '@/lib/stores/store-store';
import { useSettingsStore } from '@/stores/settings-store';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';

type SidebarProps = {
  currentUser: AuthUser | null;
};

type NavigationContext = {
  pathname: string;
  cashierSessionAvailable: boolean;
  isMobile: boolean;
  setOpenMobile: (open: boolean) => void;
};

function isNavActive(itemHref: string, pathname: string): boolean {
  if (itemHref === '/') return pathname === '/';
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

function isSubGroup(item: MenuSubItem): item is Extract<MenuSubItem, { childItems: unknown }> {
  return 'childItems' in item;
}

function isItemActive(item: MenuLeafSubItem, pathname: string): boolean {
  return isNavActive(item.activePath ?? item.href, pathname);
}

function isMenuItemActive(item: MenuItem, pathname: string): boolean {
  if (item.href) return isNavActive(item.href, pathname);
  return item.childItems.some((child) =>
    isSubGroup(child)
      ? child.childItems.some((leaf) => isItemActive(leaf, pathname))
      : isItemActive(child, pathname),
  );
}

function NavSubItems({
  items,
  context,
}: {
  items: MenuSubItem[];
  context: NavigationContext;
}) {
  return (
    <SidebarMenuSub>
      {items.map((item) => (
        <SidebarSubItem key={item.label} item={item} context={context} />
      ))}
    </SidebarMenuSub>
  );
}

function SidebarSubItem({
  item,
  context,
}: {
  item: MenuSubItem;
  context: NavigationContext;
}) {
  const [expanded, setExpanded] = useState(
    () =>
      isSubGroup(item) &&
      item.childItems.some((child) => isItemActive(child, context.pathname)),
  );

  if (isSubGroup(item)) {
    const active = item.childItems.some((child) =>
      isItemActive(child, context.pathname),
    );
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          render={
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="w-full justify-between"
            />
          }
          isActive={active}
        >
          <span>{item.label}</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </SidebarMenuSubButton>
        {expanded && <NavSubItems items={item.childItems} context={context} />}
      </SidebarMenuSubItem>
    );
  }

  const active = isItemActive(item, context.pathname);
  const disabled = item.href === '/pos' && !context.cashierSessionAvailable;
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        render={
          <Link
            to={item.href}
            target={item.target}
            aria-disabled={disabled}
            aria-current={active ? 'page' : undefined}
            onClick={(event) => {
              if (disabled) {
                event.preventDefault();
                return;
              }
              if (context.isMobile) context.setOpenMobile(false);
            }}
            title={
              disabled
                ? 'Open or join a cashier session to enable POS'
                : undefined
            }
          />
        }
        isActive={active}
        className={disabled ? 'cursor-not-allowed opacity-50' : undefined}
      >
        <span>{item.label}</span>
        {item.badge && (
          <span
            className={`ml-auto rounded px-1.5 text-xs ${item.badgeClassName ?? ''}`}
          >
            {item.badge}
          </span>
        )}
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function SidebarNavItem({
  item,
  context,
}: {
  item: MenuItem;
  context: NavigationContext;
}) {
  const [expanded, setExpanded] = useState(() =>
    item.childItems?.some((child) =>
      isSubGroup(child)
        ? child.childItems.some((leaf) => isItemActive(leaf, context.pathname))
        : isItemActive(child, context.pathname),
    ),
  );
  const Icon = navIcons[item.icon];
  const active = isMenuItemActive(item, context.pathname);

  if (item.href) {
    const disabled = item.href === '/pos' && !context.cashierSessionAvailable;
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={
            <Link
              to={item.href}
              target={item.target}
              aria-disabled={disabled}
              aria-current={active ? 'page' : undefined}
              onClick={(event) => {
                if (disabled) {
                  event.preventDefault();
                  return;
                }
                if (context.isMobile) context.setOpenMobile(false);
              }}
              title={
                disabled
                  ? 'Open or join a cashier session to enable POS'
                  : undefined
              }
              rel={item.target === '_blank' ? 'noreferrer' : undefined}
            />
          }
          isActive={active}
          tooltip={item.label}
          size="lg"
          className={`gap-3 rounded-2xl px-3 py-3 text-sm [&_svg]:size-[18px] data-[active=true]:bg-[var(--accent)]/15 data-[active=true]:text-[var(--accent)] ${
            disabled ? 'cursor-not-allowed opacity-50' : ''
          } group-data-[collapsible=icon]:justify-center`}
        >
          <Icon />
          <span className="group-data-[collapsible=icon]:hidden">
            {item.label}
          </span>
        </SidebarMenuButton>
        {item.badge && (
          <SidebarMenuBadge className={item.badgeClassName}>
            {item.badge}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          />
        }
        isActive={active}
        tooltip={item.label}
        size="lg"
        className="gap-3 rounded-2xl px-3 py-3 text-sm [&_svg]:size-[18px] data-[active=true]:bg-[var(--accent)]/15 data-[active=true]:text-[var(--accent)] group-data-[collapsible=icon]:justify-center"
      >
        <Icon />
        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
        <ChevronDown
          size={14}
          className={`ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </SidebarMenuButton>
      {expanded && <NavSubItems items={item.childItems} context={context} />}
    </SidebarMenuItem>
  );
}

function visibleNavGroups(groups: NavItem[], currentUser: AuthUser | null) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.roles ||
          Boolean(currentUser && item.roles.includes(currentUser.role)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export default function Sidebar({ currentUser }: SidebarProps) {
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { settings } = useSettingsStore();
  const storeQuery = useGetCurrentStoreQuery();
  const cashierSessionsQuery = useCashierSessionsQuery(
    currentUser?.store?.storeId,
  );
  const cashierSessionAvailable = Boolean(
    cashierSessionsQuery.data?.some((session) => session.status === 'OPEN'),
  );
  const [collapsedNavGroups, setCollapsedNavGroups] = useState<string[]>([]);
  const groups = visibleNavGroups(navItems, currentUser);
  const context = {
    pathname,
    cashierSessionAvailable,
    isMobile,
    setOpenMobile,
  };

  const toggleNavGroup = (group: string) => {
    setCollapsedNavGroups((current) =>
      current.includes(group)
        ? current.filter((collapsedGroup) => collapsedGroup !== group)
        : [...current, group],
    );
  };

  return (
    <ShadcnSidebar
      collapsible="icon"
      className="border-r-[0.5px] border-r-[var(--border)] text-[var(--foreground)] [&_[data-sidebar=sidebar]]:bg-[var(--card)]"
    >
      <SidebarHeader className="flex-row items-center gap-2 p-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent)]/15 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={storeQuery.data?.name ?? 'Store logo'}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <ShoppingCart size={18} className="text-[var(--accent)]" />
            )}
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">
              {storeQuery.data?.name ?? 'POS Studio'}
            </p>
            <p className="truncate text-xs text-[var(--muted)]">
              POS
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {groups.map((group, index) => {
          const groupLabel = group.groupLabel ?? `Navigation ${index + 1}`;
          const groupCollapsed = collapsedNavGroups.includes(groupLabel);

          return (
            <SidebarGroup key={groupLabel} className="py-1">
              <SidebarGroupLabel
                render={
                  <button
                    type="button"
                    onClick={() => toggleNavGroup(groupLabel)}
                    aria-label={`Toggle ${groupLabel} navigation`}
                    aria-expanded={!groupCollapsed}
                    className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]"
                  />
                }
              >
                <span>{groupLabel}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    groupCollapsed ? '-rotate-90' : ''
                  }`}
                />
              </SidebarGroupLabel>
              {!groupCollapsed && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarNavItem
                        key={item.href ?? item.label}
                        item={item}
                        context={context}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </ShadcnSidebar>
  );
}
