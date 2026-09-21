document.querySelectorAll(".app-nav").forEach((navigation) => {
  navigation.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    navigation.querySelectorAll("button").forEach((item) => item.removeAttribute("aria-current"));
    button.setAttribute("aria-current", "page");
    document.getElementById("review-feedback").textContent = `Amostra de seleção: ${button.textContent}.`;
  });
});
document.querySelectorAll("[data-feedback]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("review-feedback").textContent = button.dataset.feedback;
  });
});
