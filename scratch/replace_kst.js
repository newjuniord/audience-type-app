const fs = require('fs');
let content = fs.readFileSync('app/consultation/page.tsx', 'utf8');

// 1. Remove global KST_OFFSET
content = content.replace('const KST_OFFSET = 9;\n', '');

// 2. Update convertKST to convertTime
content = content.replace(
  'function convertKST(kstH: number, kstM: number, targetOffset: number) {',
  'function convertTime(baseH: number, baseM: number, baseOffset: number, targetOffset: number) {'
);
content = content.replace(
  '  let localH = kstH - KST_OFFSET + targetOffset;',
  '  let localH = baseH - baseOffset + targetOffset;'
);
content = content.replace(
  '  return { h: localH, m: kstM };',
  '  return { h: localH, m: baseM };'
);

// 3. Update kstToLocal to baseToLocal
content = content.replace(
  'function kstToLocal(kstH: number, kstM: number) {',
  'function baseToLocal(baseH: number, baseM: number, baseOffset: number) {'
);
content = content.replace(
  '  d.setUTCHours(kstH - KST_OFFSET, kstM, 0, 0);',
  '  d.setUTCHours(baseH - baseOffset, baseM, 0, 0);'
);

// 4. In ConsultationPage, compute baseOffset
content = content.replace(
  'const [loading, setLoading] = useState(true);',
  'const [loading, setLoading] = useState(true);\n  const baseOffset = service?.availabilityTimezoneOffset ?? 9;'
);

// 5. Update generatedKstSlots to generatedBaseSlots
content = content.replace(/generatedKstSlots/g, 'generatedBaseSlots');

// 6. Update mapping logic to use baseOffset
content = content.replace(
  '        const local = convertKST(s.h, s.m, selectedCountry.offset);',
  '        const local = convertTime(s.h, s.m, baseOffset, selectedCountry.offset);'
);
content = content.replace(
  '        return { base: s, kst: fmtUX(s), local };',
  '        return { base: s, baseStr: fmtUX(s), local };'
);

// 7. Update the UI rendering of the slots
content = content.replace(
  '🇰🇷 {s.kst}',
  '📍 {s.baseStr}'
);

content = content.replace(
  'Créneau: ${slot.kst} (KST)',
  'Créneau: ${slot.baseStr} (Heure admin)'
);

content = content.replace(
  '<span className="opacity-0"> · 🇰🇷 {localSlots[selectedSlot].kst} (KST)</span>',
  '<span className="opacity-0"> · 📍 {localSlots[selectedSlot].baseStr} (Heure admin)</span>'
);

// 8. Update static texts
content = content.replace(
  'Les consultations démarrent à <strong>10:00 AM heure de Corée (KST)</strong>. Voici les plages horaires correspondantes chez vous :',
  'Les horaires ci-dessous sont traduits dans votre heure locale pour simplifier la réservation :'
);

content = content.replace(
  'Basé en Corée du Sud · Consultations en ligne · 10:00 AM → 12:00 AM KST',
  'Consultations en ligne privées et personnalisées'
);

// 9. Update the reference timezone conversion table (lines 260-261)
content = content.replace(
  '      const start = convertKST(10, 0, c.offset);',
  '      const start = convertTime(10, 0, 9, c.offset); // Legacy mapping display'
);
content = content.replace(
  '      const end = convertKST(0, 30, c.offset);',
  '      const end = convertTime(0, 30, 9, c.offset); // Legacy mapping display'
);


fs.writeFileSync('app/consultation/page.tsx', content);
console.log("Done");
