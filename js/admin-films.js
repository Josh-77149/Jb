import { supabase } from "./config.js";
import { $, esc, safeUrl } from "./utils.js";

const MAX_SIZE = 5 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
let films = [];

async function uploadPoster(file) {
  if (!TYPES[file.type]) throw new Error("Format non accepté. Utilisez JPG, PNG ou WebP.");
  if (file.size > MAX_SIZE) throw new Error("Image trop lourde (5 Mo maximum).");
  const path = `affiches/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${TYPES[file.type]}`;
  const { error } = await supabase.storage.from("images").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}

export function setupFilms() {
  const form = $("#filmForm");
  const msg = $("#filmMsg");

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
        annee: form.annee.value ? Number(form.annee.value) : null,
        statut: form.statut.value,
        description: form.description.value.trim() || null,
        lien: form.lien.value.trim() || null,
        publie: form.publie.checked,
      };
      const file = form.affiche.files[0];
      if (file) row.affiche_url = await uploadPoster(file);

      const query = id
        ? supabase.from("films").update(row).eq("id", id)
        : supabase.from("films").insert(row);
      const { error } = await query;
      if (error) throw error;

      form.reset();
      form.id.value = "";
      msg.textContent = "Film enregistré.";
      loadFilmsAdmin();
    } catch (err) {
      console.error(err);
      msg.className = "status error";
      msg.textContent = err.message || "Échec de l’enregistrement.";
    } finally {
      btn.disabled = false;
    }
  });

  $("#filmsAdmin").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const film = films.find((f) => f.id === btn.dataset.id);
    if (!film) return;

    if (btn.dataset.act === "edit") {
      form.id.value = film.id;
      form.titre.value = film.titre;
      form.annee.value = film.annee ?? "";
      form.statut.value = film.statut || "sorti";
      form.description.value = film.description ?? "";
      form.lien.value = film.lien ?? "";
      form.publie.checked = film.publie;
      form.affiche.value = "";
      msg.className = "status";
      msg.textContent = "Modification en cours. Laissez l’affiche vide pour garder l’actuelle.";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (btn.dataset.act === "toggle") {
      await supabase.from("films").update({ publie: !film.publie }).eq("id", film.id);
      loadFilmsAdmin();
    }
    if (btn.dataset.act === "delete" && confirm(`Supprimer « ${film.titre} » ? Cette action est définitive.`)) {
      const { error } = await supabase.from("films").delete().eq("id", film.id);
      if (error) alert("Suppression impossible.");
      loadFilmsAdmin();
    }
  });
}

export async function loadFilmsAdmin() {
  const box = $("#filmsAdmin");
  const { data, error } = await supabase.from("films").select("*").order("created_at", { ascending: false });
  if (error) { box.innerHTML = '<p class="error">Chargement impossible.</p>'; console.error(error); return; }
  films = data;
  if (!data.length) { box.innerHTML = '<p class="note">Aucun film. Ajoutez le premier ci-dessus.</p>'; return; }

  box.innerHTML = data.map((f) => {
    const img = safeUrl(f.affiche_url);
    return `<article class="item film">
      <div class="thumb"${img ? ` style="background-image:url('${esc(img)}')"` : ""}></div>
      <div class="info">
        <h3>${esc(f.titre)}</h3>
        <span class="meta">${esc(f.annee ?? "Année non précisée")} · ${esc(f.statut)}
          <span class="badge ${f.publie ? "on" : ""}">${f.publie ? "Visible" : "Masqué"}</span></span>
        <div class="buttons">
          <button class="small-btn" data-act="edit" data-id="${f.id}">Modifier</button>
          <button class="small-btn" data-act="toggle" data-id="${f.id}">${f.publie ? "Masquer" : "Afficher"}</button>
          <button class="small-btn danger" data-act="delete" data-id="${f.id}">Supprimer</button>
        </div>
      </div>
    </article>`;
  }).join("");
}
