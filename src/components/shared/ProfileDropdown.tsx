// Third-party Imports
import { LogOutIcon, SettingsIcon, UserIcon } from 'lucide-react';

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from 'react-router';
import { type AuthUser } from '@/lib/auth/auth-store';

const STATIC_USER = {
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  imageUrl: '/images/avatars/avatar-1.webp',
  initials: 'JD',
};
type Props = {
  currentUser: AuthUser;
};

const ProfileDropdown = ({ currentUser }: Props) => {
  const initials = currentUser.username
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full hover:bg-transparent"
          />
        }
      >
        <Avatar>
          <AvatarImage src={STATIC_USER.imageUrl} alt={currentUser.username} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-4 px-2 py-2.5 font-normal">
            <div className="relative">
              <Avatar className="size-10">
                <AvatarImage
                  src={STATIC_USER.imageUrl}
                  alt={currentUser.username}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2" />
            </div>
            <div className="flex flex-1 flex-col items-start">
              <span className="text-foreground text-base font-semibold">
                {currentUser.username}
              </span>
              <span className="text-muted-foreground text-sm">
                {currentUser.email}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<Link to="/pages/user-profile?view=profile" />}
          >
            <UserIcon />
            <span>My Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link to="/pages/user-settings?setting=general" />}
          >
            <SettingsIcon />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            render={<Link to="/pages/auth/login" />}
          >
            <LogOutIcon />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
