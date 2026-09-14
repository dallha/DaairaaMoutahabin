import fs from 'fs';
import path from 'path';
import { TRANSLATIONS, CONTROLLED_TRANSLATIONS } from '../src/i18n/translations';

/**
 * Audit Automatique Zéro Jargon Technique
 * Règle de produit immuable:
 * « Le vocabulaire technique appartient au code et à l'administration interne.
 * Le vocabulaire visible par les membres doit être institutionnel, humain, fraternel et immédiatement compréhensible. »
 */

const JARGON_BLACKLIST = [
  'PostgreSQL',
  'Postgres',
  'Neon',
  'CRUD',
  'UUID',
  'ID technique',
  'database',
  'backend',
  'serverless',
  'cluster',
  'is_founder',
  'is_president',
  'institutional_priority',
];

function auditZeroJargon() {
  console.log('--- 🛡️ AUDIT AUTOMATIQUE ZÉRO JARGON TECHNIQUE ---');
  let violations = 0;

  // 1. Audit des dictionnaires de traduction i18n (FR & AR)
  console.log('1. Vérification des traductions i18n (valeurs utilisateur)...');
  
  for (const [lang, dict] of Object.entries(TRANSLATIONS)) {
    for (const [key, value] of Object.entries(dict)) {
      if (typeof value !== 'string') continue;
      
      for (const term of JARGON_BLACKLIST) {
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        if (regex.test(value)) {
          console.error(`❌ [Jargon détecté dans i18n.${lang}.${key}]: "${value}" contient le terme interdit "${term}"`);
          violations++;
        }
      }
    }
  }

  // Vérification de CONTROLLED_TRANSLATIONS
  for (const [lang, cats] of Object.entries(CONTROLLED_TRANSLATIONS)) {
    for (const [catName, catMap] of Object.entries(cats as Record<string, Record<string, string>>)) {
      for (const [code, label] of Object.entries(catMap)) {
        for (const term of JARGON_BLACKLIST) {
          const regex = new RegExp(`\\b${term}\\b`, 'i');
          if (regex.test(label)) {
            console.error(`❌ [Jargon détecté dans CONTROLLED.${lang}.${catName}.${code}]: "${label}" contient le terme interdit "${term}"`);
            violations++;
          }
        }
      }
    }
  }

  // 2. Audit des pages visibles par les membres ordinaires
  console.log('2. Vérification des templates JSX des pages membres...');
  const memberFiles = [
    'src/pages/DashboardOverviewPage.tsx',
    'src/pages/MembersDirectoryPage.tsx',
    'src/pages/MemberDetailPage.tsx',
    'src/pages/MemberEditPage.tsx',
    'src/pages/MemberCreatePage.tsx',
    'src/layouts/AppLayout.tsx',
  ];

  const projectRoot = process.cwd();

  for (const relPath of memberFiles) {
    const fullPath = path.join(projectRoot, relPath);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Ignorer les imports, les types, les commentaires et les attributs d'icônes
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
      if (trimmed.startsWith('import ') || trimmed.startsWith('export type') || trimmed.startsWith('interface ')) return;

      for (const term of JARGON_BLACKLIST) {
        // Détecte les occurrences visibles dans le JSX (entre > et < ou dans des strings "...")
        const jsxTextMatch = new RegExp(`>[^<]*?\\b${term}\\b[^<]*?<`, 'i');
        const quotedMatch = new RegExp(`['"\`][^'"\`]*?\\b${term}\\b[^'"\`]*?['"\`]`, 'i');

        if (jsxTextMatch.test(line) || (quotedMatch.test(line) && !line.includes('console.') && !line.includes('className='))) {
          // Ignorer les clés i18n qui contiennent le mot comme identifiant historique si le texte affiché est propre
          if (line.includes(`t('`) || line.includes(`t("`)) return;

          console.error(`❌ [Jargon détecté dans ${relPath}:${idx + 1}]:`);
          console.error(`   ${trimmed}`);
          console.error(`   Terme interdit : "${term}"`);
          violations++;
        }
      }
    });
  }

  if (violations > 0) {
    console.error(`\n🚨 AUDIT ÉCHOUÉ : ${violations} violation(s) de vocabulaire technique détectée(s).`);
    process.exit(1);
  } else {
    console.log(`\n✅ SUCCÈS COMPLET : 0 terme technique interdit détecté dans l'expérience utilisateur.`);
    console.log(`   Vocabulaire 100% fraternel, institutionnel et épuré.`);
  }
}

auditZeroJargon();
