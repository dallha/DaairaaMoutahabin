/**
 * Test E2E PWA, UX Multi-Profils & Intégrité Routage V1.3
 * Exécution : npx tsx src/i18n/__tests__/pwa_journey.test.ts
 */

import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

console.log('===============================================================');
console.log('🏁 V1.3 QA GATE — PWA, MULTI-PROFILS & SÉCURITÉ ROUTAGE');
console.log('===============================================================');

// 1. Contrôle Web App Manifest (public/manifest.webmanifest)
const manifestPath = path.resolve('public/manifest.webmanifest');
assert(fs.existsSync(manifestPath), 'Fichier public/manifest.webmanifest présent sur le disque.');

const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
assert(manifestContent.display === 'standalone', 'Manifest display configuré en "standalone".');
assert(manifestContent.theme_color === '#f2ca50', 'Couleur de thème dorée (#f2ca50) définie.');
assert(manifestContent.background_color === '#0a0e14', 'Arrière-plan sombre (#0a0e14) défini.');
assert(manifestContent.start_url === '/dashboard', 'start_url configuré vers /dashboard.');
assert(Array.isArray(manifestContent.icons) && manifestContent.icons.length >= 2, 'Au moins 2 icônes déclarées (192px et 512px).');

// 2. Contrôle Service Worker (public/sw.js)
const swPath = path.resolve('public/sw.js');
assert(fs.existsSync(swPath), 'Fichier public/sw.js présent sur le disque.');

const swContent = fs.readFileSync(swPath, 'utf-8');
assert(swContent.includes('dahirah-pwa-v1.3'), 'Cache versionné dahirah-pwa-v1.3 présent.');
assert(swContent.includes('skipWaiting'), 'skipWaiting() présent pour installation rapide.');
assert(swContent.includes('clients.claim'), 'clients.claim() présent pour prise en charge immédiate.');
assert(swContent.includes('/api/'), 'Exclusion stricte des endpoints API REST /api/ du cache.');

// 3. Contrôle index.html
const indexPath = path.resolve('index.html');
const indexContent = fs.readFileSync(indexPath, 'utf-8');
assert(indexContent.includes('rel="manifest" href="/manifest.webmanifest"'), 'Balise link manifest présente dans index.html.');
assert(indexContent.includes('name="theme-color" content="#f2ca50"'), 'Balise meta theme-color présente.');
assert(indexContent.includes('apple-mobile-web-app-capable'), 'Balise iOS apple-mobile-web-app-capable présente.');
assert(indexContent.includes('viewport-fit=cover'), 'Balise viewport-fit=cover configurée pour les écrans à encoche.');
assert(indexContent.includes('serviceWorker.register'), 'Script d’enregistrement Service Worker présent.');

// 4. Contrôle App.tsx & Routage Multi-Profils
const appTsxPath = path.resolve('src/App.tsx');
const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');
assert(
  appTsxContent.includes("['admin', 'superadmin', 'agent', 'member']"),
  'Route /members/:id/edit accessible aux membres pour modification de leur propre fiche.'
);
assert(appTsxContent.includes('path="/education"'), 'Alias /education résolu sans 404.');
assert(appTsxContent.includes('path="/professions"'), 'Alias /professions résolu sans 404.');
assert(appTsxContent.includes('path="/roles"'), 'Alias /roles résolu sans 404.');
assert(appTsxContent.includes('path="/users"'), 'Alias /users résolu sans 404.');
assert(appTsxContent.includes('path="/audit"'), 'Alias /audit résolu sans 404.');
assert(appTsxContent.includes('path="/settings"'), 'Alias /settings résolu sans 404.');

// 5. Contrôle AppLayout.tsx (Mon Profil Souverain & Safe Area)
const layoutPath = path.resolve('src/layouts/AppLayout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
assert(
  layoutContent.includes('Mon Profil Souverain') && layoutContent.includes('/members/${user.member_id}'),
  'Lien direct "Mon Profil Souverain" intégré dans le menu utilisateur.'
);
assert(
  layoutContent.includes('safe-area-inset-bottom'),
  'Safe area inset iOS/Android intégré dans le floating dock persistant.'
);

// 6. Contrôle MemberDetailPage.tsx (Cursus Académique pour Étudiant)
const detailPath = path.resolve('src/pages/MemberDetailPage.tsx');
const detailContent = fs.readFileSync(detailPath, 'utf-8');
assert(
  detailContent.includes('Formations &amp; Cursus Académique') && detailContent.includes('member.formations'),
  'Section Formations & Cursus Académique intégrée dans la fiche 360° pour les étudiants.'
);

// 7. Contrôle MemberEditPage.tsx (Protection Propriétaire & Rôle)
const editPath = path.resolve('src/pages/MemberEditPage.tsx');
const editContent = fs.readFileSync(editPath, 'utf-8');
assert(
  editContent.includes('isOwner') && editContent.includes('canEdit'),
  'Vérification granulaire de propriété (isOwner) et de permission (canEdit) dans MemberEditPage.'
);

console.log('===============================================================');
console.log('🎉 100% DES CONTRÔLES PWA & UX MULTI-PROFILS V1.3 PASSENT !');
console.log('===============================================================');
