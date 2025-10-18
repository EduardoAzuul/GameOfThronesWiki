// --- LÓGICA DE BÚSQUEDA ---
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector(".search-input");

if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
        // Previene la acción por defecto del formulario (recargar la página).
        event.preventDefault();
        
        const characterName = searchInput.value.trim();
        
        if (characterName) {
            // --- DIAGNÓSTICO EN NAVEGADOR ---
            console.log(`Búsqueda iniciada para: "${characterName}"`);
            const targetUrl = `/search/${encodeURIComponent(characterName)}`;
            console.log(`Redirigiendo a: ${targetUrl}`);
            
            // Esta es la línea que cambia la URL en el navegador.
            window.location.href = targetUrl;
        } else {
            console.log("El campo de búsqueda está vacío.");
        }
    });
}

// --- LÓGICA DE NAVEGACIÓN ---
const prevButton = document.querySelector("#prev-btn");
const nextButton = document.querySelector("#next-btn");

if (prevButton && nextButton) {
    const navigationDiv = document.querySelector('.navigation');
    const currentId = parseInt(navigationDiv.dataset.characterId);

    const navigate = (direction) => {
        fetch(`/api/character/navigate/${direction}/${currentId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = `/character/${data.data.id}`;
                } else {
                    console.error("Error de navegación desde la API:", data.error);
                }
            })
            .catch(error => console.error("Error de conexión en fetch:", error));
    };

    prevButton.addEventListener("click", () => navigate("prev"));
    nextButton.addEventListener("click", () => navigate("next"));
}

