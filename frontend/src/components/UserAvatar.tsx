import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name: string;
  src?: string | null;
  className?: string;
  fallbackClassName?: string;
  size?: "default" | "sm" | "lg";
};

export function UserAvatar({
  name,
  src,
  className,
  fallbackClassName,
  size,
}: UserAvatarProps) {
  return (
    <Avatar className={className} size={size}>
      {src && <AvatarImage src={src} alt={`${name}'s profile picture`} />}
      <AvatarFallback className={cn(fallbackClassName)}>
        {name.trim().charAt(0).toUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
