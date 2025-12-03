import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const AccountDeleted = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle>Contul a fost șters</CardTitle>
          <CardDescription>
            Toate datele tale au fost șterse permanent din sistemul nostru.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Îți mulțumim că ai fost parte din comunitatea Pași de Pelerin. 
            Te așteptăm oricând vei dori să te alături din nou.
          </p>
          <p className="text-sm text-muted-foreground italic">
            "Drum bun pe calea ta spirituală."
          </p>
          <Button onClick={() => navigate("/auth")} className="w-full mt-4">
            Înapoi la pagina de autentificare
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountDeleted;
