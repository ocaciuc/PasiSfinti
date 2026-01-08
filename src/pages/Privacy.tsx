import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
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

        <h1 className="text-3xl font-bold text-foreground mb-8">Politica de Confidențialitate</h1>
        
        <div className="prose prose-lg max-w-none space-y-6 text-foreground/90">
          <p className="text-muted-foreground">
            Ultima actualizare: 8 Ianuarie 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Introducere</h2>
            <p>
              Bine ați venit la Pași de Pelerin. Respectăm confidențialitatea dumneavoastră și ne angajăm 
              să protejăm datele personale. Această politică de confidențialitate explică modul în care 
              colectăm, utilizăm și protejăm informațiile dumneavoastră.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Datele pe care le colectăm</h2>
            <p>Colectăm următoarele tipuri de informații:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Date de profil:</strong> Nume, prenume, vârstă, oraș, parohie, religie, fotografie de profil</li>
              <li><strong>Date de autentificare:</strong> Adresă de email, informații de conectare</li>
              <li><strong>Date despre pelerinaje:</strong> Pelerinajele la care v-ați înscris, istoricul participărilor</li>
              <li><strong>Conținut generat:</strong> Postări, comentarii, jurnale spirituale</li>
              <li><strong>Date despre donații:</strong> Informații despre lumânările virtuale aprinse</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Cum utilizăm datele</h2>
            <p>Utilizăm informațiile dumneavoastră pentru:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Crearea și gestionarea contului dumneavoastră</li>
              <li>Facilitarea înscrierii la pelerinaje</li>
              <li>Permiterea participării la discuțiile comunității</li>
              <li>Îmbunătățirea serviciilor noastre</li>
              <li>Trimiterea de notificări relevante (cu acordul dumneavoastră)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Partajarea datelor</h2>
            <p>
              Nu vindem și nu partajăm datele dumneavoastră personale cu terți în scopuri comerciale. 
              Partajăm informații limitate (numele și fotografia de profil) cu alți participanți la 
              pelerinaje în cadrul discuțiilor comunității.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Securitatea datelor</h2>
            <p>
              Implementăm măsuri de securitate tehnice și organizatorice pentru a proteja datele 
              dumneavoastră împotriva accesului neautorizat, modificării, divulgării sau distrugerii.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Drepturile dumneavoastră</h2>
            <p>Aveți dreptul să:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Accesați datele personale pe care le deținem despre dumneavoastră</li>
              <li>Solicitați corectarea datelor inexacte</li>
              <li>Solicitați ștergerea datelor dumneavoastră</li>
              <li>Vă retrageți consimțământul în orice moment</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Ștergerea contului</h2>
            <p>
              Puteți solicita ștergerea completă a contului și a tuturor datelor asociate din 
              pagina de <Link to="/user-data-deletion" className="text-primary hover:underline">ștergere a datelor</Link> sau 
              din setările aplicației.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
            <p>
              Pentru orice întrebări privind această politică de confidențialitate, ne puteți 
              contacta prin intermediul aplicației sau la adresa de email de suport.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
