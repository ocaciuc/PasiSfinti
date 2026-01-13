import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer 
      className="bg-secondary/50 border-t border-border py-6"
      style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="max-w-lg mx-auto px-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Pași de Pelerin
            </p>
          </div>
          
          <nav className="flex items-center gap-6">
            <Link 
              to="/privacy" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Confidențialitate
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link 
              to="/terms" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Termeni și Condiții
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
