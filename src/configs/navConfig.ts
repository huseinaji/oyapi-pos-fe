
import type { ApiUserRole } from '@/types/api';
import {
  ClipboardCheck,
  ClipboardList,
  LayoutGrid,
  Package2,
  ReceiptText,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Users,
} from 'lucide-react';

export const navIcons = {
  ClipboardCheck,
  ClipboardList,
  LayoutGrid,
  Package2,
  ReceiptText,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Users,
};

type IconName = keyof typeof navIcons;

export type MenuLeafSubItem = {
  label: string;
  href: string;
  activePath?: string;
  badge?: string;
  badgeClassName?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
};

export type MenuGroupSubItem = {
  label: string;
  childItems: MenuLeafSubItem[];
};

export type MenuSubItem = MenuLeafSubItem | MenuGroupSubItem;

export type MenuItem = {
  icon: IconName;
  label: string;
  roles?: ApiUserRole[];
} & (
  | {
      href: string;
      badge?: string;
      badgeClassName?: string;
      childItems?: never;
      target?: '_blank' | '_self' | '_parent' | '_top';
    }
  | {
      href?: never;
      badge?: string;
      badgeClassName?: string;
      childItems: MenuSubItem[];
    }
);

export type NavItem = {
  groupLabel?: string;
  items: MenuItem[];
};



export const navItems: NavItem[] = [
  {
    groupLabel: 'Overview',
    items: [
      {
        href: '/',
        label: 'Dashboard',
        icon: 'LayoutGrid',
      },
    ],
  },
  {
    groupLabel: 'Inventory',
    items: [
      {
        href: '/products',
        label: 'Items',
        icon: 'Package2',
      },
      {
        href: '/item-categories',
        label: 'Item Categories',
        icon: 'Tags',
      },
      {
        href: '/stock-ledger',
        label: 'Stock Ledger',
        icon: 'ClipboardList',
        roles: ['ADMIN'],
      },
      {
        href: '/stock-adjustment',
        label: 'Stock Adjustment',
        icon: 'SlidersHorizontal',
        roles: ['ADMIN'],
      },
    ],
  },
  {
    groupLabel: 'Sales',
    items: [
      {
        href: '/cashier-sessions',
        label: 'Cashier Sessions',
        icon: 'ClipboardCheck',
      },
      { href: '/pos', label: 'POS', icon: 'ShoppingCart' },
      {
        href: '/transactions',
        label: 'Transactions',
        icon: 'ReceiptText',
      },
    ],
  },
  {
    groupLabel: 'Administration',
    items: [
      {
        href: '/users',
        label: 'Users',
        icon: 'Users',
        roles: ['ADMIN'],
      },
      {
        href: '/setting',
        label: 'Settings',
        icon: 'Settings',
        roles: ['ADMIN'],
      },
    ],
  },
];