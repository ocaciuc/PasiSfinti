import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { MapPin, Calendar, Users, ChevronRight, Search, X, Clock, Flame, Building2, CalendarDays, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isWithinInterval } from "date-fns";
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

type FilterDrawerType = "city" | "date" | "type" | null;

const Pilgrimages = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [pilgrimages, setPilgrimages] = useState<Pilgrimage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter states
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedType, setSelectedType] = useState<string>("all");
  
  // Quick filters
  const [upcomingThisWeek, setUpcomingThisWeek] = useState(false);
  const [popularThisMonth, setPopularThisMonth] = useState(false);
  
  // Drawer state
  const [activeDrawer, setActiveDrawer] = useState<FilterDrawerType>(null);
  
  // Temporary states for drawer editing
  const [tempCity, setTempCity] = useState<string>("all");
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>();
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>();
  const [tempType, setTempType] = useState<string>("all");
  const [citySearch, setCitySearch] = useState("");

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

  const filteredCities = useMemo(() => {
    if (!citySearch) return cities;
    return cities.filter(city => city.toLowerCase().includes(citySearch.toLowerCase()));
  }, [cities, citySearch]);

  // Date helpers for quick filters
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Apply all filters
  const filteredPilgrimages = useMemo(() => {
    return pilgrimages.filter((p) => {
      // Type filter (from tabs - this is the main tab)
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

      // Type filter from Smart Filter
      if (selectedType !== "all" && p.type !== selectedType) return false;

      // Quick filter: Upcoming this week
      if (upcomingThisWeek) {
        const pilgrimageDate = new Date(p.start_date);
        if (!isWithinInterval(pilgrimageDate, { start: weekStart, end: weekEnd })) return false;
      }

      // Quick filter: Popular this month
      if (popularThisMonth) {
        const pilgrimageDate = new Date(p.start_date);
        const isThisMonth = isWithinInterval(pilgrimageDate, { start: monthStart, end: monthEnd });
        const isPopular = (p.participant_count || 0) >= 100;
        if (!isThisMonth || !isPopular) return false;
      }

      return true;
    });
  }, [pilgrimages, activeTab, searchTerm, selectedCity, startDate, endDate, selectedType, upcomingThisWeek, popularThisMonth, weekStart, weekEnd, monthStart, monthEnd]);

  // Open drawer with current values
  const openDrawer = (type: FilterDrawerType) => {
    if (type === "city") {
      setTempCity(selectedCity);
      setCitySearch("");
    } else if (type === "date") {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
    } else if (type === "type") {
      setTempType(selectedType);
    }
    setActiveDrawer(type);
  };

  // Apply filter from drawer
  const applyFilter = () => {
    if (activeDrawer === "city") {
      setSelectedCity(tempCity);
    } else if (activeDrawer === "date") {
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
    } else if (activeDrawer === "type") {
      setSelectedType(tempType);
    }
    setActiveDrawer(null);
  };

  // Remove individual filter
  const removeFilter = (filter: string) => {
    switch (filter) {
      case "city":
        setSelectedCity("all");
        break;
      case "date":
        setStartDate(undefined);
        setEndDate(undefined);
        break;
      case "type":
        setSelectedType("all");
        break;
      case "upcomingWeek":
        setUpcomingThisWeek(false);
        break;
      case "popularMonth":
        setPopularThisMonth(false);
        break;
    }
  };

  // Format date range for chip
  const formatDateRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, "d MMM", { locale: ro })} – ${format(endDate, "d MMM", { locale: ro })}`;
    }
    if (startDate) {
      return `De la ${format(startDate, "d MMM", { locale: ro })}`;
    }
    if (endDate) {
      return `Până la ${format(endDate, "d MMM", { locale: ro })}`;
    }
    return "";
  };

  // Check if filters are active
  const hasActiveFilters = selectedCity !== "all" || startDate || endDate || selectedType !== "all" || upcomingThisWeek || popularThisMonth;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <h1 className="text-2xl font-bold text-center">Pelerinaje</h1>
        <p className="text-center text-sm opacity-90 mt-1">Alege-ți drumul spiritual</p>
      </header>

      <div className="max-w-lg mx-auto p-4">
        {/* Search Bar */}
        <div className="mb-3">
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

        {/* Smart Filter Bar */}
        <div className="flex gap-2 mb-3">
          <Button
            variant={selectedCity !== "all" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => openDrawer("city")}
          >
            <Building2 className="w-4 h-4 mr-1.5" />
            Oraș
          </Button>
          <Button
            variant={startDate || endDate ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => openDrawer("date")}
          >
            <CalendarDays className="w-4 h-4 mr-1.5" />
            Dată
          </Button>
          <Button
            variant={selectedType !== "all" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => openDrawer("type")}
          >
            <Tag className="w-4 h-4 mr-1.5" />
            Tip
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 mb-3">
          <Button
            variant={upcomingThisWeek ? "default" : "outline"}
            size="sm"
            onClick={() => setUpcomingThisWeek(!upcomingThisWeek)}
            className="text-xs"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Săptămâna asta
          </Button>
          <Button
            variant={popularThisMonth ? "default" : "outline"}
            size="sm"
            onClick={() => setPopularThisMonth(!popularThisMonth)}
            className="text-xs"
          >
            <Flame className="w-3.5 h-3.5 mr-1.5" />
            Populare luna asta
          </Button>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCity !== "all" && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                <span>Oraș: {selectedCity}</span>
                <button
                  onClick={() => removeFilter("city")}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {(startDate || endDate) && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                <span>Dată: {formatDateRange()}</span>
                <button
                  onClick={() => removeFilter("date")}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {selectedType !== "all" && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                <span>Tip: {selectedType === "national" ? "Naționale" : "Locale"}</span>
                <button
                  onClick={() => removeFilter("type")}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {upcomingThisWeek && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Săptămâna asta</span>
                <button
                  onClick={() => removeFilter("upcomingWeek")}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {popularThisMonth && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                <Flame className="w-3 h-3" />
                <span>Populare luna asta</span>
                <button
                  onClick={() => removeFilter("popularMonth")}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Tab Selector (unchanged) */}
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
                  <p>Nu există pelerinaje care să corespundă filtrelor.</p>
                  {hasActiveFilters && (
                    <Button
                      variant="link"
                      onClick={() => {
                        setSelectedCity("all");
                        setStartDate(undefined);
                        setEndDate(undefined);
                        setSelectedType("all");
                        setUpcomingThisWeek(false);
                        setPopularThisMonth(false);
                      }}
                      className="mt-2"
                    >
                      Șterge filtrele
                    </Button>
                  )}
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
                    <p className="text-sm text-muted-foreground line-clamp-2">
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

      {/* City Filter Drawer */}
      <Drawer open={activeDrawer === "city"} onOpenChange={(open) => !open && setActiveDrawer(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Selectează orașul</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {/* City search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Caută oraș..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* City list */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              <button
                onClick={() => setTempCity("all")}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  tempCity === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                Toate orașele
              </button>
              {filteredCities.map((city) => (
                <button
                  key={city}
                  onClick={() => setTempCity(city)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    tempCity === city ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={applyFilter}>Aplică filtrul</Button>
            <DrawerClose asChild>
              <Button variant="outline">Anulează</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Date Filter Drawer */}
      <Drawer open={activeDrawer === "date"} onOpenChange={(open) => !open && setActiveDrawer(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Selectează perioada</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium mb-2">De la</p>
                <p className="text-sm text-muted-foreground">
                  {tempStartDate ? format(tempStartDate, "d MMM yyyy", { locale: ro }) : "Neselectat"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Până la</p>
                <p className="text-sm text-muted-foreground">
                  {tempEndDate ? format(tempEndDate, "d MMM yyyy", { locale: ro }) : "Neselectat"}
                </p>
              </div>
            </div>
            <CalendarComponent
              mode="range"
              selected={{ from: tempStartDate, to: tempEndDate }}
              onSelect={(range) => {
                setTempStartDate(range?.from);
                setTempEndDate(range?.to);
              }}
              locale={ro}
              numberOfMonths={1}
              className="rounded-md border mx-auto pointer-events-auto"
            />
            {(tempStartDate || tempEndDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTempStartDate(undefined);
                  setTempEndDate(undefined);
                }}
                className="w-full mt-3"
              >
                <X className="w-4 h-4 mr-2" />
                Șterge datele
              </Button>
            )}
          </div>
          <DrawerFooter>
            <Button onClick={applyFilter}>Aplică filtrul</Button>
            <DrawerClose asChild>
              <Button variant="outline">Anulează</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Type Filter Drawer */}
      <Drawer open={activeDrawer === "type"} onOpenChange={(open) => !open && setActiveDrawer(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Selectează tipul</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-2">
            {[
              { value: "all", label: "Toate tipurile" },
              { value: "national", label: "Naționale" },
              { value: "local", label: "Locale" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTempType(option.value)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  tempType === option.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <DrawerFooter>
            <Button onClick={applyFilter}>Aplică filtrul</Button>
            <DrawerClose asChild>
              <Button variant="outline">Anulează</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Navigation />
    </div>
  );
};

export default Pilgrimages;
