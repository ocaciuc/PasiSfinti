

# Pop-up pentru descrierea insignelor

## Ce se schimbă

In `BadgesSection.tsx`, fiecare card de insignă devine clickable. La click, se deschide un Dialog (modal) care afișează:
- Iconița insignei (mare, colorată dacă e câștigată)
- Numele insignei
- Descrierea completă (fără `line-clamp`)
- Data obținerii (dacă e câștigată)

## Plan tehnic

### Fișier: `src/components/BadgesSection.tsx`

1. Adaug state pentru insigna selectată: `selectedBadge`
2. Fac fiecare card clickable cu `onClick={() => setSelectedBadge(badge)}`
3. Adaug un `Dialog` care se deschide când `selectedBadge` nu e null, afișând descrierea completă și detaliile insignei
4. Import `Dialog, DialogContent, DialogHeader, DialogTitle` din `@/components/ui/dialog`

