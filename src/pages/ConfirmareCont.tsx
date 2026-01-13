import { CheckCircle, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ConfirmareCont = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Flame className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Pași de Pelerin</h1>
        </div>

        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl text-foreground">
              Cont creat cu succes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Adresa ta de email a fost confirmată.
            </p>
            <p className="text-muted-foreground">
              Te poți întoarce acum în aplicație și te poți autentifica.
            </p>
            <Button 
              onClick={() => navigate("/auth")} 
              className="mt-4 w-full"
            >
              Mergi la autentificare
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmareCont;
