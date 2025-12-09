import { 
  Footprints, 
  Church, 
  CalendarCheck, 
  HeartHandshake,
  Award,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgeIconProps {
  iconName: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const iconMap: Record<string, LucideIcon> = {
  footprints: Footprints,
  church: Church,
  "calendar-check": CalendarCheck,
  "heart-handshake": HeartHandshake,
};

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const BadgeIcon = ({ iconName, className, size = "md" }: BadgeIconProps) => {
  const Icon = iconMap[iconName] || Award;
  
  return (
    <Icon className={cn(sizeClasses[size], "text-accent", className)} />
  );
};

export default BadgeIcon;
