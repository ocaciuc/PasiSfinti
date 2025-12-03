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
import { ArrowLeft, Trash2, Loader2, LogOut, User, Shield } from "lucide-react";
import Navigation from "@/components/Navigation";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleting(true);
    try {
      const response = await supabase.functions.invoke('delete-account', {
        body: { user_id: user.id }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete account');
      }

      toast({
        title: "Cont șters",
        description: "Contul tău și toate datele asociate au fost șterse permanent.",
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      navigate("/account-deleted");
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la ștergerea contului",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Setări</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Cont
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/profile")}
            >
              <User className="w-4 h-4 mr-2" />
              Vezi profilul
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Deconectează-te
            </Button>
          </CardContent>
        </Card>

        {/* Privacy & Data Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5" />
              Confidențialitate și Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Datele tale personale sunt stocate în siguranță și sunt folosite doar pentru funcționalitatea aplicației.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <Trash2 className="w-5 h-5" />
              Zonă Periculoasă
            </CardTitle>
            <CardDescription>
              Acțiunile din această secțiune sunt permanente și nu pot fi anulate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                <h3 className="font-medium text-destructive mb-2">Șterge contul</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ștergerea contului va elimina permanent toate datele tale, inclusiv:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside mb-4 space-y-1">
                  <li>Profilul și informațiile personale</li>
                  <li>Pelerinajele la care te-ai înscris</li>
                  <li>Postările și comentariile tale</li>
                  <li>Istoricul lumânărilor aprinse</li>
                </ul>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={deleting}>
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Se șterge...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Șterge contul meu
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Această acțiune va șterge permanent contul tău și toate datele asociate. 
                        Nu vei mai putea recupera aceste informații.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anulează</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Da, șterge contul
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default Settings;
