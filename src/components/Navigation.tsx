import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, Map, Flame, User, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";

const Navigation = () => {
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { unreadCount } = useNotifications(userId);

  const navItems = [
    { icon: Home, label: "Acasă", path: "/dashboard" },
    { icon: Map, label: "Pelerinaje", path: "/pilgrimages" },
    { icon: Bell, label: "Notificări", path: "/notifications", badge: unreadCount },
    { icon: Flame, label: "Lumânare", path: "/candle" },
    { icon: User, label: "Profil", path: "/profile" },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border glow-soft z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                isActive 
                  ? "text-accent" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-1 ${isActive ? "animate-gentle-float" : ""}`} />
                {'badge' in item && (item as any).badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {(item as any).badge > 9 ? "9+" : (item as any).badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
