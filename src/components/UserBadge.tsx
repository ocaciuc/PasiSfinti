import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BadgeIcon from "./BadgeIcon";

interface Badge {
  id: string;
  name: string;
  name_ro: string;
  description: string;
  icon_name: string;
  priority: number;
}

interface UserBadgeProps {
  badge: Badge;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
}

const UserBadge = ({ badge, showTooltip = true, size = "sm" }: UserBadgeProps) => {
  if (!showTooltip) {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-accent/20 p-1">
        <BadgeIcon iconName={badge.icon_name} size={size} />
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center rounded-full bg-accent/20 p-1 cursor-help">
            <BadgeIcon iconName={badge.icon_name} size={size} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{badge.name_ro}</p>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default UserBadge;
