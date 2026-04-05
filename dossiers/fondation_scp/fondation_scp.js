// fondation_scp.js — Centre de Données — Fondation SCP
// Dépendance : marked.js (chargé via CDN dans fondation_scp.html)

const INDEX_URL = "https://raw.githubusercontent.com/oria-organization/oria-wiki/main/dossiers/fondation_scp/contenu/index.json";
const CONTENU_URL = "https://raw.githubusercontent.com/oria-organization/oria-wiki/main/dossiers/fondation_scp/contenu/";

let tousLesDocuments = [];
let derniereRecherche = "";

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  await chargerDocuments();
});

async function chargerDocuments() {
  try {
    const res = await fetch(INDEX_URL);
    if (!res.ok) throw new Error("index.json introuvable");
    const fichiers = await res.json();

    const promesses = fichiers.map(nom => chargerFichierMD(nom));
    tousLesDocuments = (await Promise.all(promesses)).filter(Boolean);

    afficherListe(tousLesDocuments);
  } catch (e) {
    document.getElementById("chargement").textContent =
      "Erreur de chargement : " + e.message;
  }
}

async function chargerFichierMD(nom) {
  try {
    const res = await fetch(CONTENU_URL + nom);
    if (!res.ok) return null;
    const texte = await res.text();
    return parseFrontmatter(nom, texte);
  } catch {
    return null;
  }
}

// ─── Parsing frontmatter ──────────────────────────────────────────────────────

function parseFrontmatter(nom, texte) {
  let title = nom.replace(".md", "");
  let tags = [];
  let corps = texte;

  const match = texte.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (match) {
    const fm = match[1];
    corps = match[2];

    const titleMatch = fm.match(/^title:\s*(.+)$/m);
    if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, "");

    const tagsInline = fm.match(/^tags:\s*\[(.+)\]$/m);
    const tagsBlock  = fm.match(/^tags:\s*\r?\n((?:\s*-\s*.+\r?\n?)+)/m);
    if (tagsInline) {
      tags = tagsInline[1].split(",").map(t => t.trim().replace(/^["']|["']$/g, ""));
    } else if (tagsBlock) {
      tags = tagsBlock[1]
        .split(/\r?\n/)
        .map(l => l.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean);
    }
  }

  const apercu = corps.replace(/^#{1,6}\s.+$/mg, "").trim().slice(0, 280);
  return { nom, title, tags, corps, apercu };
}

// ─── Affichage liste ──────────────────────────────────────────────────────────

function afficherListe(docs) {
  const conteneur = document.getElementById("liste-documents");
  conteneur.innerHTML = "";

  if (docs.length === 0) {
    conteneur.innerHTML = "<p>Aucun document trouvé.</p>";
    return;
  }

  docs.forEach(doc => {
    const carte = document.createElement("div");
    carte.className = "carte-document";

    const tagsHtml = doc.tags.map(t =>
      `<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`
    ).join("");

    carte.innerHTML = `
      <div class="carte-titre">${escapeHtml(doc.title)}</div>
      <div class="carte-tags">${tagsHtml}</div>
      <div class="carte-apercu">${escapeHtml(doc.apercu)}${doc.apercu.length >= 280 ? "…" : ""}</div>
    `;

    // Clic sur un tag → recherche par tag
    carte.querySelectorAll(".tag").forEach(tagEl => {
      tagEl.addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("search-input").value = tagEl.dataset.tag;
        filtrerDocuments();
      });
    });

    // Clic sur la carte → lecture
    carte.addEventListener("click", () => ouvrirDocument(doc));

    conteneur.appendChild(carte);
  });
}

// ─── Recherche ────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search-input").addEventListener("input", filtrerDocuments);
});

function filtrerDocuments() {
  const q = document.getElementById("search-input").value.trim().toLowerCase();
  derniereRecherche = q;

  if (!q) {
    afficherListe(tousLesDocuments);
    return;
  }

  const filtres = tousLesDocuments.filter(doc =>
    doc.title.toLowerCase().includes(q) ||
    doc.tags.some(t => t.toLowerCase().includes(q))
  );

  afficherListe(filtres);
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

function ouvrirDocument(doc) {
  document.getElementById("vue-liste").style.display = "none";
  document.getElementById("vue-lecture").style.display = "block";

  const tagsHtml = doc.tags.length
    ? `<div class="carte-tags lecture-tags">${doc.tags.map(t =>
        `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>`
    : "";

  document.getElementById("contenu-lecture").innerHTML =
    `<h1>${escapeHtml(doc.title)}</h1>` +
    tagsHtml +
    `<hr>` +
    marked.parse(doc.corps);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-retour").addEventListener("click", retourListe);
});

function retourListe() {
  document.getElementById("vue-lecture").style.display = "none";
  document.getElementById("vue-liste").style.display = "block";

  if (derniereRecherche) {
    document.getElementById("search-input").value = derniereRecherche;
    filtrerDocuments();
  } else {
    afficherListe(tousLesDocuments);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
