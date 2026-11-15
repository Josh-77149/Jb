import { supabase } from "./config.js";
import { $, esc, formatDate, typeLabel } from "./utils.js";

let articles = [];

const slugify = (text) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "texte";

export function setupArticles() {
  const form = $("#articleForm");
  const msg = $("#articleMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    msg.className = "status";
    msg.textContent = "Enregistrement…";

    try {
      const id = form.id.value;
      const row = {
        titre: form.titre.value.trim(),
        type: form.type.value,
        resume: form.resume.value.trim() || null,
        contenu: form.contenu.value,
        publie: form.publie.checked,
      };
      if (!id) row.slug = `${slugify(row.titre)}-${Math.random().toString(36).slice(2, 7)}`;

      const query = id
        ? supabase.from("articles").update(row).eq("id", id)
        : supabase.from("articles").insert(row);
      const { error } = await query;
      if (error) throw error;

      form.reset();
      form.id.value = "";
      msg.textContent = row.publie ? "Texte publié sur le site." : "Brouillon enregistré.";
      loadArticlesAdmin();
    } catch (err) {
      console.error(err);
      msg.className = "status error";
      msg.textContent = "Échec de l’enregistrement.";
    } finally {
      btn.disabled = false;
    }
  });

  $("#articlesAdmin").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const a = articles.find((x) => x.id === btn.dataset.id);
    if (!a) return;

    if (btn.dataset.act === "edit") {
      form.id.value = a.id;
      form.titre.value = a.titre;
      form.type.value = a.type || "scenario";
      form.resume.value = a.resume ?? "";
      form.contenu.value = a.contenu ?? "";
      form.publie.checked = a.publie;
      msg.className = "status";
      msg.textContent = "Modification en cours.";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (btn.dataset.act === "toggle") {
      await supabase.from("articles").update({ publie: !a.publie }).eq("id", a.id);
      loadArticlesAdmin();
    }
    if (btn.dataset.act === "delete" && confirm(`Supprimer « ${a.titre} » ? Cette action est définitive.`)) {
      const { error } = await supabase.from("articles").delete().eq("id", a.id);
      if (error) alert("Suppression impossible.");
      loadArticlesAdmin();
    }
  });
}

export async function loadArticlesAdmin() {
  const box = $("#articlesAdmin");
  const { data, error } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
  if (error) { box.innerHTML = '<p class="error">Chargement impossible.</p>'; console.error(error); return; }
  articles = data;
  if (!data.length) { box.innerHTML = '<p class="note">Aucun texte. Écrivez le premier ci-dessus.</p>'; return; }

  box.innerHTML = data.map((a) => `<article class="item">
      <h3>${esc(a.titre)}</h3>
      <span class="meta">${typeLabel(a.type)} · ${formatDate(a.created_at)}
        <span class="badge ${a.publie ? "on" : ""}">${a.publie ? "Publié" : "Brouillon"}</span></span>
      <div class="buttons">
        <button class="small-btn" data-act="edit" data-id="${a.id}">Modifier</button>
        <button class="small-btn" data-act="toggle" data-id="${a.id}">${a.publie ? "Repasser en brouillon" : "Publier"}</button>
        <button class="small-btn danger" data-act="delete" data-id="${a.id}">Supprimer</button>
      </div>
    </article>`).join("");
}
