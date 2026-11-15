import { supabase } from "./config.js";
import { $, esc, formatDate } from "./utils.js";

let bound = false;

export async function loadMessagesAdmin() {
  const box = $("#messagesAdmin");

  if (!bound) {
    bound = true;
    box.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-del]");
      if (!btn || !confirm("Supprimer ce message ? Cette action est définitive.")) return;
      const { error } = await supabase.from("messages").delete().eq("id", btn.dataset.del);
      if (error) alert("Suppression impossible. Vérifiez que la règle SQL de suppression est bien ajoutée.");
      loadMessagesAdmin();
    });
  }

  const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
  if (error) { box.innerHTML = '<p class="error">Chargement impossible.</p>'; console.error(error); return; }
  if (!data.length) { box.innerHTML = '<p class="note">Aucun message pour le moment.</p>'; return; }

  box.innerHTML = data.map((m) => `<article class="item">
      <h3>${esc(m.nom)}</h3>
      <span class="meta"><a href="mailto:${esc(m.email)}">${esc(m.email)}</a> · ${formatDate(m.created_at)}</span>
      <p class="msgtext">${esc(m.message)}</p>
      <div class="buttons">
        <a class="small-btn" href="mailto:${esc(m.email)}" style="text-decoration:none;display:inline-grid;align-items:center">Répondre</a>
        <button class="small-btn danger" data-del="${m.id}">Supprimer</button>
      </div>
    </article>`).join("");
}
