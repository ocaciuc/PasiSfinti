import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Flame, Loader2, CheckCircle, Trash2 } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Adresa de email nu este validă" });

const UserDataDeletion = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Eroare validare",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('delete-account', {
        body: { email: email.trim() }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to process request');
      }

      setSuccess(true);
      toast({
        title: "Cerere procesată",
        description: "Dacă există un cont asociat cu acest email, acesta va fi șters.",
      });
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

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Cerere primită</CardTitle>
            <CardDescription>
              Cererea ta de ștergere a datelor a fost procesată.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Dacă există un cont asociat cu adresa de email furnizată, 
              toate datele asociate au fost șterse permanent din sistemul nostru.
            </p>
            <p className="text-sm text-muted-foreground">
              Această acțiune include ștergerea profilului, postărilor, comentariilor 
              și a oricăror alte date personale.
            </p>
          </CardContent>
        </Card>
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
              Această pagină îți permite să soliciți ștergerea contului și a tuturor datelor personale asociate cu aplicația Pași de Pelerin.
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Adresa de email asociată contului
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    maxLength={255}
                  />
                </div>

                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Atenție: Această acțiune este permanentă și ireversibilă.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  variant="destructive" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Se procesează...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Șterge datele mele
                    </>
                  )}
                </Button>
              </form>

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
