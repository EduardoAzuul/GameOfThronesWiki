// --- LÓGICA DE BÚSQUEDA ---
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector(".search-input");

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const characterName = searchInput.value.trim();
    if (characterName) {
        // Redirige a la ruta de renderizado, no a la API
        window.location.href = `/search/${encodeURIComponent(characterName)}`;
    }
});

// --- LÓGICA DE NAVEGACIÓN ---
// Se ejecuta solo si los botones de navegación existen en la página.
const prevButton = document.querySelector("#prev-btn");
const nextButton = document.querySelector("#next-btn");

// Si los botones existen (es decir, si se cargó un personaje)...
if (prevButton && nextButton) {
    const currentId = parseInt(document.querySelector('.navigation').dataset.characterId);

    const navigate = (direction) => {
        fetch(`/api/character/navigate/${direction}/${currentId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Redirige a la página del nuevo personaje usando su ID
                    window.location.href = `/character/${data.data.id}`;
                } else {
                    console.error("Error de navegación:", data.error);
                }
            })
            .catch(error => console.error("Error en el fetch:", error));
    };

    prevButton.addEventListener("click", () => navigate("prev"));
    nextButton.addEventListener("click", () => navigate("next"));
}
