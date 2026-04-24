// ─── Configuration ────────────────────────────────────────────────────────────
// Modifier ces deux lignes selon votre projet :
const INDEX_URL   = "https://raw.githubusercontent.com/oria-organization/oria-wiki/main/dossiers/nexara/contenu/index.json";
const CONTENU_URL = "https://raw.githubusercontent.com/oria-organization/oria-wiki/main/dossiers/nexara/contenu/";
// ──────────────────────────────────────────────────────────────────────────────

marked.setOptions({ breaks: true });

let tousLesDocuments = [];
let derniereRecherche = "";

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  await chargerDocuments();

  document.getElementById("search-input").addEventListener("input", filtrerDocuments);
  document.getElementById("btn-retour").addEventListener("click", retourListe);
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
  let corps = texte;

  const match = texte.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (match) {
    const fm = match[1];
    corps    = match[2];

    const titleMatch = fm.match(/^title:\s*(.+)$/m);
    if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, "");
  }

  const apercu = nettoyerMarkdown(corps).slice(0, 280);
  return { nom, title, corps, apercu };
}

// ─── Nettoyage Markdown pour les aperçus ─────────────────────────────────────

function nettoyerMarkdown(texte) {
  return texte
    .replace(/^---[\s\S]*?---\r?\n?/, "")
    .replace(/^#{1,6}\s+.+$/mg, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/^>\s+/mg, "")
    .replace(/^[-*+]\s+/mg, "")
    .replace(/^\d+\.\s+/mg, "")
    .replace(/\r?\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
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

    carte.innerHTML = `
      <div class="carte-titre">${escapeHtml(doc.title)}</div>
      <div class="carte-apercu">${escapeHtml(doc.apercu)}${doc.apercu.length >= 280 ? "…" : ""}</div>
    `;

    carte.addEventListener("click", () => ouvrirDocument(doc));
    conteneur.appendChild(carte);
  });
}

// ─── Recherche ────────────────────────────────────────────────────────────────

function filtrerDocuments() {
  const q = document.getElementById("search-input").value.trim().toLowerCase();
  derniereRecherche = q;

  if (!q) {
    afficherListe(tousLesDocuments);
    return;
  }

  const mots = q.split(/\s+/).filter(Boolean);

  const filtres = tousLesDocuments.filter(doc => {
    const haystack = [
      doc.title,
      nettoyerMarkdown(doc.corps)
    ].join(" ").toLowerCase();

    return mots.every(mot => haystack.includes(mot));
  });

  afficherListe(filtres);
}

// ─── Vue lecture ──────────────────────────────────────────────────────────────

function ouvrirDocument(doc) {
  document.getElementById("vue-liste").style.display  = "none";
  document.getElementById("vue-lecture").style.display = "block";

  const corpsHtml = marked.parse(doc.corps);

  const corpsAvecLiens = corpsHtml.replace(/\[\[([^\]]+)\]\]/g, (match, titre) => {
    const cible = tousLesDocuments.find(
      d => d.title.toLowerCase() === titre.toLowerCase()
    );
    if (cible) {
      return `<a href="#" class="lien-wiki" data-titre="${escapeHtml(cible.title)}">${escapeHtml(cible.title)}</a>`;
    }
    return `<span class="lien-wiki-mort" title="Document introuvable">${escapeHtml(titre)}</span>`;
  });

  document.getElementById("contenu-lecture").innerHTML =
    `<h1>${escapeHtml(doc.title)}</h1>` +
    `<hr>` +
    corpsAvecLiens;

  document.querySelectorAll(".lien-wiki").forEach(lien => {
    lien.addEventListener("click", e => {
      e.preventDefault();
      const cible = tousLesDocuments.find(d => d.title === lien.dataset.titre);
      if (cible) ouvrirDocument(cible);
    });
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function retourListe() {
  document.getElementById("vue-lecture").style.display = "none";
  document.getElementById("vue-liste").style.display   = "block";

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