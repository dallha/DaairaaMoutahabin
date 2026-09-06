import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Member, ActivityLogItem } from "./src/types.ts";
import {
  initialMembers,
  initialProfessions,
  initialCategories,
  initialFormations,
  initialFonctions,
  initialActivityLogs
} from "./src/data/mockData.ts";

let members: Member[] = [...initialMembers];
let professions = [...initialProfessions];
let categories = [...initialCategories];
let formations = [...initialFormations];
let fonctions = [...initialFonctions];
let activityLogs: ActivityLogItem[] = [...initialActivityLogs];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // REST API: Members
  app.get("/api/v1/members/", (_req, res) => {
    res.json(members);
  });

  app.get("/api/v1/members/:id/", (req, res) => {
    const member = members.find((m) => m.id === req.params.id);
    if (!member) {
      return res.status(404).json({ detail: "Membre non trouvé" });
    }
    res.json(member);
  });

  app.post("/api/v1/members/", (req, res) => {
    const payload = req.body;
    const newId = `m-${Date.now()}`;
    const newMatricule = `MUT-2026-${String(members.length + 1).padStart(4, "0")}`;

    const newMember: Member = {
      id: newId,
      matricule: newMatricule,
      prenom: payload.prenom || "Nouveau",
      nom: payload.nom || "Membre",
      sexe: payload.sexe || "M",
      dateNaissance: payload.dateNaissance,
      lieuNaissance: payload.lieuNaissance,
      telephone: payload.telephone,
      email: payload.email,
      adresse: payload.adresse,
      ville: payload.ville || "Dakar",
      pays: payload.pays || "Sénégal",
      situation: payload.situation || "SALARIE",
      professions: payload.professions || [],
      formations: payload.formations || [],
      activites: payload.activites || [],
      fonctionsDahirah: payload.fonctionsDahirah || [],
      privacy: payload.privacy || {
        showPhone: "MEMBRES",
        showEmail: "MEMBRES",
        showAddress: "ADMIN_ONLY",
        showProfessions: "PUBLIC",
        showFormations: "MEMBRES",
      },
      dataQualityIssues: payload.dataQualityIssues,
      dateInscription: new Date().toISOString().split("T")[0],
      statutCompte: "ACTIF" as const,
    };

    members.unshift(newMember);

    // Audit log
    activityLogs.unshift({
      id: `log-${Date.now()}`,
      action: "Création membre (API)",
      details: `${newMember.prenom} ${newMember.nom} (${newMatricule})`,
      userId: "API",
      userName: "Système Central Dahirah",
      timestamp: "À l’instant",
    });

    res.status(201).json(newMember);
  });

  app.put("/api/v1/members/:id/", (req, res) => {
    const index = members.findIndex((m) => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ detail: "Membre non trouvé" });
    }
    const updated = { ...members[index], ...req.body };
    members[index] = updated;

    activityLogs.unshift({
      id: `log-${Date.now()}`,
      action: "Modification membre (API)",
      details: `Mise à jour fiche ${updated.matricule}`,
      userId: "API",
      userName: "Système Central Dahirah",
      timestamp: "À l’instant",
    });

    res.json(updated);
  });

  app.delete("/api/v1/members/:id/", (req, res) => {
    members = members.filter((m) => m.id !== req.params.id);
    res.status(204).send();
  });

  // REST API: Taxonomies
  app.get("/api/v1/taxonomies/professions/", (_req, res) => {
    res.json(professions);
  });

  app.get("/api/v1/taxonomies/categories/", (_req, res) => {
    res.json(categories);
  });

  app.get("/api/v1/taxonomies/formations/", (_req, res) => {
    res.json(formations);
  });

  app.get("/api/v1/taxonomies/fonctions/", (_req, res) => {
    res.json(fonctions);
  });

  // REST API: Logs
  app.get("/api/v1/logs/", (_req, res) => {
    res.json(activityLogs);
  });

  app.post("/api/v1/logs/", (req, res) => {
    const newLog = {
      id: `log-${Date.now()}`,
      action: req.body.action || "Action inconnue",
      details: req.body.details || "",
      userId: req.body.userId || "GUEST",
      userName: req.body.userName || "Utilisateur Dahirah",
      timestamp: "À l’instant",
    };
    activityLogs.unshift(newLog);
    res.status(201).json(newLog);
  });

  // REST API: Authentication
  app.post("/api/v1/auth/login/", (req, res) => {
    const { matriculeOrEmail, role } = req.body;
    const targetMember = members.find(
      (m) =>
        m.matricule.toLowerCase() === (matriculeOrEmail || "").toLowerCase() ||
        (m.email && m.email.toLowerCase() === (matriculeOrEmail || "").toLowerCase())
    );

    const resolvedRole = role || (targetMember ? "MEMBER" : "PUBLIC");
    res.json({
      role: resolvedRole,
      member: targetMember,
      token: `dahirah_jwt_${Date.now()}`,
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
