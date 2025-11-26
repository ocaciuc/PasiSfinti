import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Users, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Pilgrimage {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string | null;
  participant_count: number | null;
  type: string;
  description: string | null;
}

const Pilgrimages = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [pilgrimages, setPilgrimages] = useState<Pilgrimage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPilgrimages = async () => {
      try {
        const { data, error } = await supabase
          .from("pilgrimages")
          .select("*")
          .order("start_date", { ascending: true });

        if (error) throw error;
        setPilgrimages(data || []);
      } catch (error) {
        console.error("Error fetching pilgrimages:", error);
        toast.error("Eroare la încărcarea pelerinajelor");
      } finally {
        setLoading(false);
      }
    };

    fetchPilgrimages();
  }, []);

  const filteredPilgrimages = pilgrimages.filter((p) => {
    if (activeTab === "all") return true;
    return p.type === activeTab;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <h1 className="text-2xl font-bold text-center">Pelerinaje</h1>
        <p className="text-center text-sm opacity-90 mt-1">Alege-ți drumul spiritual</p>
      </header>

      <div className="max-w-lg mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Toate</TabsTrigger>
            <TabsTrigger value="national">Naționale</TabsTrigger>
            <TabsTrigger value="local">Locale</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="glow-soft">
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-4" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-2/3 mb-2" />
                      <Skeleton className="h-4 w-1/3" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-4" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : filteredPilgrimages.length === 0 ? (
              <Card className="glow-soft">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nu există pelerinaje disponibile
                </CardContent>
              </Card>
            ) : (
              filteredPilgrimages.map((pilgrimage) => (
              <Card
                key={pilgrimage.id}
                className="glow-soft cursor-pointer hover:border-accent transition-all"
                onClick={() => navigate(`/pilgrimage/${pilgrimage.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-primary mb-2">
                        {pilgrimage.title}
                      </CardTitle>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{pilgrimage.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(pilgrimage.start_date).toLocaleDateString("ro-RO", { 
                            day: "numeric", 
                            month: "long", 
                            year: "numeric" 
                          })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-accent font-medium">
                          <Users className="w-4 h-4" />
                          <span>{(pilgrimage.participant_count || 0).toLocaleString()} pelerini</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {pilgrimage.description}
                  </p>
                  <Button className="w-full mt-4">
                    Vezi detalii și înscrie-te
                  </Button>
                </CardContent>
              </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Navigation />
    </div>
  );
};

export default Pilgrimages;
