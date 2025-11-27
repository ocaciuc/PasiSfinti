import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { MapPin, Calendar, Users, ChevronRight, Search, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface Pilgrimage {
  id: string;
  title: string;
  location: string;
  city: string | null;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

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

  // Extract unique cities for filter
  const cities = useMemo(() => {
    const citySet = new Set(pilgrimages.map(p => p.city || p.location).filter(Boolean));
    return Array.from(citySet).sort();
  }, [pilgrimages]);

  // Apply all filters
  const filteredPilgrimages = useMemo(() => {
    return pilgrimages.filter((p) => {
      // Type filter (from tabs)
      if (activeTab !== "all" && p.type !== activeTab) return false;

      // Search filter (title or location)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(search);
        const matchesLocation = p.location.toLowerCase().includes(search);
        if (!matchesTitle && !matchesLocation) return false;
      }

      // City filter
      if (selectedCity !== "all") {
        const pilgrimageCity = p.city || p.location;
        if (pilgrimageCity !== selectedCity) return false;
      }

      // Date range filter
      if (startDate) {
        const pilgrimageDate = new Date(p.start_date);
        if (pilgrimageDate < startDate) return false;
      }
      if (endDate) {
        const pilgrimageDate = new Date(p.start_date);
        if (pilgrimageDate > endDate) return false;
      }

      return true;
    });
  }, [pilgrimages, activeTab, searchTerm, selectedCity, startDate, endDate]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCity("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = searchTerm || selectedCity !== "all" || startDate || endDate;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <h1 className="text-2xl font-bold text-center">Pelerinaje</h1>
        <p className="text-center text-sm opacity-90 mt-1">Alege-ți drumul spiritual</p>
      </header>

      <div className="max-w-lg mx-auto p-4">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Caută pelerinaj sau locație..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toggle Button */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full mb-4 justify-between"
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtre {hasActiveFilters && `(${[searchTerm, selectedCity !== "all", startDate, endDate].filter(Boolean).length})`}
          </span>
          <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? "rotate-90" : ""}`} />
        </Button>

        {/* Filters Section */}
        {showFilters && (
          <Card className="mb-4 glow-soft">
            <CardContent className="pt-6 space-y-4">
              {/* City Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Oraș</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toate orașele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate orașele</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">De la data</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <Calendar className="w-4 h-4 mr-2" />
                        {startDate ? format(startDate, "dd MMM yyyy", { locale: ro }) : "Selectează"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={ro}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Până la data</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <Calendar className="w-4 h-4 mr-2" />
                        {endDate ? format(endDate, "dd MMM yyyy", { locale: ro }) : "Selectează"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={ro}
                        disabled={(date) => startDate ? date < startDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  Șterge toate filtrele
                </Button>
              )}
            </CardContent>
          </Card>
        )}

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
