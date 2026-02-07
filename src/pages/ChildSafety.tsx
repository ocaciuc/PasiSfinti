import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ChildSafety = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Înapoi
        </Button>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Siguranța Copiilor și Protecție
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Ultima actualizare: 7 februarie 2026
        </p>

        <div className="space-y-8 text-foreground/90 leading-relaxed">
          {/* Zero tolerance */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Politica noastră: toleranță zero
            </h2>
            <p>
              Aplicația <strong>Pași de Pelerin</strong> adoptă o politică de <strong>toleranță zero</strong> față de orice formă de abuz sexual, exploatare sau comportament inadecvat care implică minori (CSAE — Child Sexual Abuse and Exploitation).
            </p>
            <p className="mt-2">
              Ne angajăm să menținem un mediu digital sigur pentru toți utilizatorii noștri, indiferent de vârstă, și să protejăm în mod activ minorii de orice conținut sau comportament dăunător.
            </p>
          </section>

          {/* Prohibited content */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Conținut și comportament interzis
            </h2>
            <p className="mb-3">
              În aplicația noastră sunt strict interzise următoarele:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Orice conținut cu caracter sexual care implică minori, inclusiv imagini, texte, desene sau materiale generate digital</li>
              <li>Grooming — orice încercare de a câștiga încrederea unui minor în scopuri de exploatare sau abuz</li>
              <li>Hărțuire, intimidare sau comportament abuziv îndreptat către minori</li>
              <li>Solicitarea de informații personale de la minori (adresă, număr de telefon, locație etc.)</li>
              <li>Distribuirea sau promovarea oricărui material care exploatează sau pune în pericol siguranța copiilor</li>
              <li>Orice comunicare cu caracter sexual sau nepotrivit inițiată către un minor</li>
            </ul>
          </section>

          {/* Moderation */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Măsuri de moderare și prevenire
            </h2>
            <p className="mb-3">
              Pentru a proteja comunitatea noastră, aplicăm următoarele măsuri:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Moderare activă a conținutului publicat de utilizatori (postări, comentarii)</li>
              <li>Sistem de raportare accesibil tuturor utilizatorilor pentru semnalarea conținutului inadecvat</li>
              <li>Eliminarea promptă a conținutului care încalcă regulile de siguranță</li>
              <li>Suspendarea sau ștergerea conturilor utilizatorilor care încalcă aceste reguli</li>
              <li>Revizuirea periodică a politicilor de siguranță în conformitate cu cele mai bune practici</li>
            </ul>
          </section>

          {/* Reporting */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Cum poți raporta conținut inadecvat
            </h2>
            <p>
              Dacă întâlnești conținut sau comportament care pune în pericol siguranța unui copil, te rugăm să raportezi imediat prin una dintre următoarele metode:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 mt-3">
              <li>Folosește funcția de raportare din aplicație (disponibilă pe fiecare postare sau comentariu)</li>
              <li>
                Trimite un email la{" "}
                <a
                  href="mailto:pelerinulapp@gmail.com"
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  pelerinulapp@gmail.com
                </a>
              </li>
            </ul>
            <p className="mt-3">
              Toate raportările sunt tratate cu maximă seriozitate și confidențialitate. Vom investiga fiecare sesizare și vom lua măsuri adecvate în cel mai scurt timp posibil.
            </p>
          </section>

          {/* Cooperation with authorities */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Cooperarea cu autoritățile
            </h2>
            <p>
              Pași de Pelerin cooperează pe deplin cu autoritățile competente în conformitate cu legislația în vigoare. În cazul în care identificăm sau primim raportări privind conținut care implică abuzul sau exploatarea minorilor, vom:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 mt-3">
              <li>Raporta imediat incidentul autorităților competente, inclusiv organelor de poliție</li>
              <li>Păstra și pune la dispoziție orice date relevante solicitate de autoritățile de drept</li>
              <li>Colabora activ cu orice investigație în curs</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Contact
            </h2>
            <p>
              Pentru orice întrebări sau sesizări legate de siguranța copiilor în aplicația noastră, ne poți contacta la:
            </p>
            <p className="mt-2">
              <strong>Email:</strong>{" "}
              <a
                href="mailto:pelerinulapp@gmail.com"
                className="text-primary underline hover:text-primary/80 transition-colors"
              >
                pelerinulapp@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ChildSafety;
