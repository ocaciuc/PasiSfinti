import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          asChild
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Înapoi acasă
          </Link>
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">Termeni și Condiții</h1>
        
        <div className="prose prose-lg max-w-none space-y-6 text-foreground/90">
          <p className="text-muted-foreground">
            Ultima actualizare: 12 Decembrie 2025
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptarea termenilor</h2>
            <p>
              Prin utilizarea aplicației Pași de Pelerin, acceptați să respectați acești termeni 
              și condiții. Dacă nu sunteți de acord cu oricare dintre termeni, vă rugăm să nu 
              utilizați aplicația.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Descrierea serviciului</h2>
            <p>
              Pași de Pelerin este o platformă comunitară pentru pelerini ortodocși români, 
              oferind funcționalități precum:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Descoperirea și înscrierea la pelerinaje</li>
              <li>Participarea la discuții în cadrul comunității</li>
              <li>Urmărirea calendarului ortodox</li>
              <li>Aprinderea de lumânări virtuale</li>
              <li>Crearea de jurnale spirituale personale</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Contul de utilizator</h2>
            <p>
              Pentru a utiliza serviciile noastre, trebuie să vă creați un cont. Sunteți responsabil 
              pentru menținerea confidențialității datelor de autentificare și pentru toate activitățile 
              desfășurate prin intermediul contului dumneavoastră.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Conduita utilizatorilor</h2>
            <p>Vă angajați să:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Folosiți serviciul într-un mod respectuos și în spiritul creștin</li>
              <li>Nu publicați conținut ofensator, defăimător sau ilegal</li>
              <li>Respectați ceilalți membri ai comunității</li>
              <li>Nu utilizați aplicația în scopuri comerciale neautorizate</li>
              <li>Nu încercați să perturbați funcționarea serviciului</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Conținutul utilizatorilor</h2>
            <p>
              Sunteți responsabil pentru conținutul pe care îl publicați. Ne rezervăm dreptul de a 
              elimina orice conținut care încalcă acești termeni sau pe care îl considerăm 
              necorespunzător pentru comunitatea noastră.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Donații și lumânări virtuale</h2>
            <p>
              Lumânările virtuale reprezintă donații simbolice. Toate donațiile sunt voluntare și 
              nu sunt returnabile. Lumânările ard virtual timp de 24 de ore de la aprindere.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Proprietatea intelectuală</h2>
            <p>
              Aplicația Pași de Pelerin, inclusiv designul, logo-urile și conținutul original, 
              sunt protejate de drepturile de autor. Nu aveți dreptul să copiați sau să distribuiți 
              aceste materiale fără acordul nostru scris.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Limitarea răspunderii</h2>
            <p>
              Serviciul este oferit „așa cum este". Nu garantăm disponibilitatea neîntreruptă a 
              serviciului și nu suntem răspunzători pentru eventualele daune rezultate din 
              utilizarea aplicației.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Modificări ale termenilor</h2>
            <p>
              Ne rezervăm dreptul de a modifica acești termeni în orice moment. Modificările vor 
              fi comunicate prin aplicație. Continuarea utilizării serviciului după modificări 
              constituie acceptarea noilor termeni.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Contact</h2>
            <p>
              Pentru orice întrebări privind acești termeni și condiții, ne puteți contacta 
              prin intermediul aplicației.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
