import { TRANSLATIONS, CONTROLLED_TRANSLATIONS } from '../src/i18n/translations';

function checkI18nParity() {
  console.log('--- 🌐 I18N PARITY & INTEGRITY AUDIT ---');

  const frKeys = Object.keys(TRANSLATIONS.fr).sort();
  const arKeys = Object.keys(TRANSLATIONS.ar).sort();

  const missingInAr = frKeys.filter(k => !(k in TRANSLATIONS.ar));
  const missingInFr = arKeys.filter(k => !(k in TRANSLATIONS.fr));

  let errors = 0;

  if (missingInAr.length > 0) {
    console.error(`❌ [Missing in AR] (${missingInAr.length} keys):`, missingInAr);
    errors += missingInAr.length;
  }

  if (missingInFr.length > 0) {
    console.error(`❌ [Missing in FR] (${missingInFr.length} keys):`, missingInFr);
    errors += missingInFr.length;
  }

  // Check empty values and token interpolations
  for (const key of frKeys) {
    const frVal = (TRANSLATIONS.fr as any)[key];
    const arVal = (TRANSLATIONS.ar as any)[key];

    if (typeof frVal !== 'string' || frVal.trim() === '') {
      console.error(`❌ [Empty value in FR] Key '${key}' is empty or not string`);
      errors++;
    }

    if (typeof arVal !== 'string' || arVal.trim() === '') {
      console.error(`❌ [Empty value in AR] Key '${key}' is empty or not string`);
      errors++;
    }

    // Check placeholders like {count}, {name}, etc.
    const frTokens = (frVal.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();
    const arTokens = (arVal?.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();

    if (JSON.stringify(frTokens) !== JSON.stringify(arTokens)) {
      console.error(`❌ [Token mismatch] Key '${key}': FR has ${JSON.stringify(frTokens)}, AR has ${JSON.stringify(arTokens)}`);
      errors++;
    }
  }

  // Check CONTROLLED_TRANSLATIONS
  const ctrlFrCats = Object.keys(CONTROLLED_TRANSLATIONS.fr).sort();
  const ctrlArCats = Object.keys(CONTROLLED_TRANSLATIONS.ar).sort();

  for (const cat of ctrlFrCats) {
    if (!ctrlArCats.includes(cat)) {
      console.error(`❌ [CONTROLLED] Missing category in AR: ${cat}`);
      errors++;
      continue;
    }
    const frMap = (CONTROLLED_TRANSLATIONS.fr as any)[cat];
    const arMap = (CONTROLLED_TRANSLATIONS.ar as any)[cat];
    const fKeys = Object.keys(frMap).sort();
    const aKeys = Object.keys(arMap).sort();

    const diffAr = fKeys.filter(k => !(k in arMap));
    if (diffAr.length > 0) {
      console.error(`❌ [CONTROLLED] Category '${cat}' missing keys in AR:`, diffAr);
      errors += diffAr.length;
    }

    for (const k of fKeys) {
      if (!arMap[k] || arMap[k].trim() === '') {
        console.error(`❌ [CONTROLLED] Category '${cat}', key '${k}' has empty AR value`);
        errors++;
      }
    }
  }

  if (errors > 0) {
    console.error(`\n💥 FAILED with ${errors} i18n issue(s).`);
    process.exit(1);
  }

  console.log(`\n✅ 100% PARITY SUCCESS!`);
  console.log(`   - Direct UI Translation Keys: ${frKeys.length} keys in FR and AR`);
  console.log(`   - Controlled Categories: ${ctrlFrCats.length} categories audited`);
  console.log(`   - All interpolation tokens matched perfectly.`);
  console.log(`   - 0 empty strings.`);
}

checkI18nParity();
