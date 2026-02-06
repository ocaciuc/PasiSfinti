import { memo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarThumbnailUrl, getInitials } from "@/lib/avatar-utils";
import { cn } from "@/lib/utils";

interface CommentAvatarProps {
  src: string | null;
  name: string;
  /** Size variant: "sm" for replies (20px), "md" for comments (24px) */
  size?: "sm" | "md";
}

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
};

/**
 * Optimized avatar for comment lists.
 * - Uses 64x64 WebP thumbnails instead of full-size images
 * - Lazy-loads images (native browser lazy loading)
 * - Shows initials placeholder while loading
 * - Fades in smoothly when loaded
 */
const CommentAvatar = memo(({ src, name, size = "md" }: CommentAvatarProps) => {
  const [loaded, setLoaded] = useState(false);
  const thumbnailUrl = getAvatarThumbnailUrl(src, 64);
  const initials = getInitials(name);

  return (
    <Avatar className={cn(sizeClasses[size])}>
      {thumbnailUrl && (
        <AvatarImage
          src={thumbnailUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          className={cn(
            "transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
        />
      )}
      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
});

CommentAvatar.displayName = "CommentAvatar";

export default CommentAvatar;
