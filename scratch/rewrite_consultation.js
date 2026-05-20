const fs = require('fs');
const file = fs.readFileSync('app/consultation/page.tsx', 'utf8');

let newFile = file.replace(
  `import { useState, useMemo } from "react";`,
  `import { useState, useMemo, useEffect } from "react";\nimport { getServices } from "@/lib/services";\nimport { Service } from "@/lib/types";`
);

newFile = newFile.replace(
  `export default function ConsultationPage() {`,
  `export default function ConsultationPage() {\n  const [service, setService] = useState<Service | null>(null);\n  const [loading, setLoading] = useState(true);\n\n  useEffect(() => {\n    getServices().then(services => {\n      const published = services.find(s => s.status === 'published' || s.active);\n      setService(published || null);\n      setLoading(false);\n    }).catch(console.error);\n  }, []);\n`
);

// Replace SLOTS_KST usage
const slotsGenCode = `
  const DAYS_MAP = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  
  const generatedKstSlots = useMemo(() => {
    if (!service || !service.availability) return [];
    
    // Parse the selected date to find the day of the week
    const dateObj = formData.date ? new Date(formData.date) : new Date();
    const dayName = DAYS_MAP[dateObj.getDay()];
    
    const dayAvail = service.availability[dayName];
    if (!dayAvail || !dayAvail.enabled) return [];
    
    const slots = [];
    let [sh, sm] = dayAvail.startTime.split(':').map(Number);
    let [eh, em] = dayAvail.endTime.split(':').map(Number);
    
    let currentH = sh;
    let currentM = sm;
    while (currentH < eh || (currentH === eh && currentM < em)) {
      slots.push({ h: currentH, m: currentM });
      currentH += 1; // 1 hour slots
    }
    return slots;
  }, [service, formData.date]);

  const localSlots = useMemo(() =>
    generatedKstSlots.map((s) => {
`;

newFile = newFile.replace(
  `  const localSlots = useMemo(() =>\n    SLOTS_KST.map((s) => {`,
  slotsGenCode
);

newFile = newFile.replace(
  `const waNum = "821012345678";`,
  `const waNum = service?.whatsappNumber || "821012345678";`
);

newFile = newFile.replace(
  `const paymentMethodName = method === "moncash" ? "MonCash (20,000 HTG)" : "Carte bancaire / PayPal ($150 USD)";`,
  `const paymentMethodName = method === "moncash" ? \`MonCash (\${service?.priceHTG || 20000} HTG)\` : \`Carte bancaire / PayPal ($\${service?.price} USD)\`;`
);

newFile = newFile.replace(
  `Montant: 150 USD`,
  `Montant: \${service?.price} USD`
);

// Add loading / empty state check just before returning the main UI
const returnCode = `
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="text-white opacity-50">Chargement...</div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-5" style={{ background: "#0a0a0a" }}>
        <span className="material-symbols-outlined text-6xl text-white/20 mb-4 block">event_busy</span>
        <h1 className="text-white text-2xl font-semibold mb-2">Aucune consultation disponible</h1>
        <p className="text-white/50">Les réservations sont temporairement fermées. Veuillez revenir plus tard.</p>
      </div>
    );
  }

  return (
`;
newFile = newFile.replace(`  return (\n    <div className="min-h-screen"`, returnCode + `    <div className="min-h-screen"`);

// Dynamic text replacements
newFile = newFile.replace(
  `Transformez votre vie avec une <span style={{ color: "#C9A84C" }}>consultation privée</span>`,
  `{service.title}`
);

newFile = newFile.replace(
  `Un accompagnement personnalisé, depuis la Corée du Sud — pour les francophones du monde entier.`,
  `{service.description}`
);

newFile = newFile.replace(
  `              <sup className="text-2xl align-super" style={{ color: "#E8D5A3" }}>$</sup>150`,
  `              <sup className="text-2xl align-super" style={{ color: "#E8D5A3" }}>$</sup>{service.price}`
);

newFile = newFile.replace(
  `{["Session individuelle et confidentielle", "Accompagnement 100 % personnalisé", "Suivi par message WhatsApp", "Connexion depuis n'importe quel pays", "Paiement sécurisé avant la session"].map((f) => (`,
  `{(service.includedItems || []).map((f) => (`
);

newFile = newFile.replace(
  `<strong>150 USD · 1 heure</strong>`,
  `<strong>{service.price} USD · 1 heure</strong>`
);

newFile = newFile.replace(
  `<span className="font-bold text-sm">150 USD</span>`,
  `<span className="font-bold text-sm">{service.price} USD</span>`
);

newFile = newFile.replace(
  `$150 USD`,
  `\${service.price} USD`
);

newFile = newFile.replace(
  `MonCash (20,000 HTG)`,
  `MonCash ({service.priceHTG || 20000} HTG)`
);

// Empty slots logic replacement
newFile = newFile.replace(
  `<div className="p-6 rounded-md text-center text-xs" style={{ background: "#FAF7F2", border: "1px dashed #DDD8CF", color: "#9E9082" }}>
                      Veuillez sélectionner votre pays ci-dessus pour voir les créneaux dans votre fuseau horaire.
                    </div>`,
  `{generatedKstSlots.length === 0 ? (
                      <div className="p-6 rounded-md text-center text-xs" style={{ background: "#FAF7F2", border: "1px dashed #DDD8CF", color: "#9E9082" }}>
                        Aucun créneau disponible pour ce jour. Veuillez sélectionner une autre date.
                      </div>
                    ) : (
                      <div className="p-6 rounded-md text-center text-xs" style={{ background: "#FAF7F2", border: "1px dashed #DDD8CF", color: "#9E9082" }}>
                        Veuillez sélectionner votre pays ci-dessus pour voir les créneaux dans votre fuseau horaire.
                      </div>
                    )}`
);

// Fix TS error on 'f' mapped array key
newFile = newFile.replace(
  `key={f} className="flex items-center gap-2 text-sm"`,
  `key={f + Math.random()} className="flex items-center gap-2 text-sm"`
);

fs.writeFileSync('app/consultation/page.tsx', newFile);
console.log("Done");
