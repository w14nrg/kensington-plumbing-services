document.addEventListener("DOMContentLoaded", () => {
  const menu = document.querySelector("[data-menu]");
  const links = document.querySelector(".nav-links");
  if (menu && links) {
    menu.addEventListener("click", () => links.classList.toggle("open"));
  }

  document.querySelectorAll("[data-open-ken]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      window.KenWidget?.open();
    });
  });

  document.querySelectorAll("[data-year]").forEach(el => {
    el.textContent = new Date().getFullYear();
  });
});
