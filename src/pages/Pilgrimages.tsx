import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, Users, ChevronRight } from "lucide-react";

interface Pilgrimage {
  id: string;
  title: string;
  location: string;
  date: string;
  participants: number;
  type: "local" | "national";
  description: string;
}

const pilgrimagesData: Pilgrimage[] = [
  {
    id: "1",
    title: "Bobotează 2025",
    location: "Mănăstirea Putna",
    date: "6 Ianuarie 2025",
    participants: 2400,
    type: "national",
    description: "Pelerinaj național la Mănăstirea Putna pentru sărbătoarea Bobotezei",
  },
  {
    id: "2",
    title: "Sf. Ioan Rusul",
    location: "Mănăstirea Măgureni",
    date: "27 Mai 2025",
    participants: 850,
    type: "national",
    description: "Pelerinaj la moaștele Sfântului Ioan Rusul",
  },
  {
    id: "3",
    title: "Duminica Ortodoxiei",
    location: "Catedrala Patriarhală",
    date: "16 Martie 2025",
    participants: 320,
    type: "local",
    description: "Procesiune religioasă în București",
  },
  {
    id: "4",
    title: "Sf. Parascheva",
    location: "Iași - Catedrala Mitropolitană",
    date: "14 Octombrie 2025",
    participants: 5200,
    type: "national",
    description: "Cel mai mare pelerinaj ortodox din România",
  },
];

const Pilgrimages = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  const filteredPilgrimages = pilgrimagesData.filter((p) => {
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
            {filteredPilgrimages.map((pilgrimage) => (
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
                          <span>{pilgrimage.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-accent font-medium">
                          <Users className="w-4 h-4" />
                          <span>{pilgrimage.participants.toLocaleString()} pelerini</span>
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
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Navigation />
    </div>
  );
};

export default Pilgrimages;
