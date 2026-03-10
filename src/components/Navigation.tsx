import { Link, useLocation } from "react-router-dom";
import { Home, Map, Flame, User } from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Acasă", path: "/dashboard" },
    { icon: Map, label: "Pelerinaje", path: "/pilgrimages" },
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
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive 
                  ? "text-accent" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? "animate-gentle-float" : ""}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
