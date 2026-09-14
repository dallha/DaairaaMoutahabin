import { TRANSLATIONS, CONTROLLED_TRANSLATIONS } from '../translations';

function verifyTranslationsParity() {
  console.log('--- Checking i18n Static UI Keys Parity (FR <-> AR) ---');
  const frKeys = Object.keys(TRANSLATIONS.fr) as (keyof typeof TRANSLATIONS.fr)[];
  const arKeys = new Set(Object.keys(TRANSLATIONS.ar));

  const missingInAr: string[] = [];
  for (const key of frKeys) {
    if (!arKeys.has(key)) {
      missingInAr.push(key);
    }
  }

  const missingInFr: string[] = [];
  for (const key of arKeys) {
    if (!(key in TRANSLATIONS.fr)) {
      missingInFr.push(key);
    }
  }

  if (missingInAr.length > 0) {
    console.error('FAIL: The following keys are present in FR but missing in AR:', missingInAr);
  }
  if (missingInFr.length > 0) {
    console.error('FAIL: The following keys are present in AR but missing in FR:', missingInFr);
  }

  if (missingInAr.length === 0 && missingInFr.length === 0) {
    console.log(`✓ 100% Parity on ${frKeys.length} static UI translation keys!`);
  }

  console.log('--- Checking Controlled Referentials Parity (FR <-> AR) ---');
  let controlledErrorCount = 0;
  let totalControlledCodes = 0;

  const frDomains = Object.keys(CONTROLLED_TRANSLATIONS.fr) as (keyof typeof CONTROLLED_TRANSLATIONS.fr)[];
  const arDomains = new Set(Object.keys(CONTROLLED_TRANSLATIONS.ar));

  for (const domain of frDomains) {
    if (!arDomains.has(domain)) {
      console.error(`FAIL: Domain "${domain}" is in FR but missing in AR!`);
      controlledErrorCount++;
      continue;
    }

    const frCodes = Object.keys(CONTROLLED_TRANSLATIONS.fr[domain]);
    const arCodes = new Set(Object.keys((CONTROLLED_TRANSLATIONS.ar as any)[domain] || {}));

    for (const code of frCodes) {
      totalControlledCodes++;
      if (!arCodes.has(code)) {
        console.error(`FAIL in domain "${domain}": code "${code}" is in FR but missing in AR!`);
        controlledErrorCount++;
      }
    }

    for (const code of arCodes) {
      if (!frCodes.includes(code)) {
        console.error(`FAIL in domain "${domain}": code "${code}" is in AR but missing in FR!`);
        controlledErrorCount++;
      }
    }
  }

  if (controlledErrorCount === 0) {
    console.log(`✓ 100% Parity on ${totalControlledCodes} controlled referential entries across ${frDomains.length} domains!`);
  }

  if (missingInAr.length > 0 || missingInFr.length > 0 || controlledErrorCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL I18N PARITY CHECKS PASSED SUCCESSFULLY!');
  }
}

verifyTranslationsParity();
