import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Flame, Loader2, Trash2 } from "lucide-react";

const UserDataDeletion = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserEmail(user.email || null);
      setCheckingAuth(false);
    };
    checkAuth();
  }, [navigate]);

  const handleDelete = async () => {
    if (!userEmail) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await supabase.functions.invoke('delete-account', {
        body: { user_id: user?.id, email: userEmail }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to process request');
      }

      // Sign out and redirect to account deleted page
      await supabase.auth.signOut();
      navigate("/account-deleted");
    } catch (error: any) {
      console.error('Error processing deletion request:', error);
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la procesarea cererii",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Flame className="w-12 h-12 text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-2">Pași de Pelerin</h1>
          <p className="text-muted-foreground">Ștergerea datelor utilizatorului</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Cerere de ștergere a datelor
            </CardTitle>
            <CardDescription>
              Ești autentificat cu: <span className="font-medium">{userEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Ce date vor fi șterse?</h3>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Informațiile profilului (nume, email, oraș, parohie)</li>
                  <li>Pelerinajele la care te-ai înscris</li>
                  <li>Postările și comentariile tale</li>
                  <li>Istoricul lumânărilor aprinse</li>
                  <li>Toate celelalte date asociate contului</li>
                </ul>
              </div>

              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Atenție: Această acțiune este permanentă și ireversibilă.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Șterge datele mele
                    </Button>
                  </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Ești sigur că vrei să ștergi contul?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Această acțiune este permanentă și ireversibilă. Toate datele tale vor fi șterse definitiv, inclusiv profilul, postările, comentariile și istoricul lumânărilor.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Anulează</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      disabled={loading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Se procesează...
                        </>
                      ) : (
                        "Da, șterge contul"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate("/settings")}
                  disabled={loading}
                >
                  Anulează și revino la setări
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Dacă ai întrebări despre ștergerea datelor, ne poți contacta la{" "}
                <a href="mailto:support@pasidepelerin.ro" className="text-primary hover:underline">
                  support@pasidepelerin.ro
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserDataDeletion;
