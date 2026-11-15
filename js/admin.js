import { supabase } from "./config.js";
import { $ } from "./utils.js";
import { setupFilms, loadFilmsAdmin } from "./admin-films.js";
import { setupArticles, loadArticlesAdmin } from "./admin-articles.js";
import { loadMessagesAdmin } from "./admin-messages.js";

const loginView = $("#loginView");
const appView = $("#appView");
let ready = false;

function show(session) {
  const loggedIn = Boolean(session);
  loginView.hidden = loggedIn;
  appView.hidden = !loggedIn;
  if (loggedIn && !ready) {
    ready = true;
    setupFilms();
    setupArticles();
    loadFilmsAdmin();
    loadArticlesAdmin();
    loadMessagesAdmin();
  }
}

// Connexion
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, msg = $("#loginMsg"), btn = f.querySelector("button");
  btn.disabled = true;
  msg.className = "status";
  msg.textContent = "Connexion…";
  const { error } = await supabase.auth.signInWithPassword({
    email: f.email.value.trim(),
    password: f.password.value,
  });
  btn.disabled = false;
  if (error) {
    msg.className = "status error";
    msg.textContent = "Email ou mot de passe incorrect.";
    return;
  }
  f.reset();
  msg.textContent = "";
});

// Déconnexion
$("#logout").addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.reload();
});

// Onglets
document.querySelectorAll(".tab[data-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    document.querySelectorAll(".pane").forEach((p) => (p.hidden = p.id !== `tab-${tab.dataset.tab}`));
    if (tab.dataset.tab === "messages") loadMessagesAdmin();
  });
});

// Boutons "Nouveau"
document.querySelectorAll("[data-reset]").forEach((b) =>
  b.addEventListener("click", () => {
    const form = document.getElementById(b.dataset.reset);
    form.reset();
    form.id.value = "";
  })
);

// État initial et changements de session
supabase.auth.getSession().then(({ data }) => show(data.session));
supabase.auth.onAuthStateChange((_event, session) => show(session));
