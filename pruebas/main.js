// --- LÓGICA DE BÚSQUEDA ---
// Selecciona el formulario y el campo de texto del DOM
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector(".search-input");

// Asegura que el formulario exista antes de agregarle un listener
if (searchForm) {
    // Escucha el evento 'submit' (cuando el usuario presiona Enter o el botón)
    searchForm.addEventListener("submit", (event) => {
        // Previene la acción por defecto del formulario (recargar la página)
        event.preventDefault();
        
        // Obtiene el valor del campo de texto y limpia espacios en blanco
        const characterName = searchInput.value.trim();
        
        // Si el usuario escribió algo...
        if (characterName) {
            // ...redirige el navegador a la ruta de renderizado correcta
            window.location.href = `/search/${encodeURIComponent(characterName)}`;
        }
    });
}

// --- LÓGICA DE NAVEGACIÓN ---
// Selecciona los botones de navegación
const prevButton = document.querySelector("#prev-btn");
const nextButton = document.querySelector("#next-btn");

// Si los botones existen (lo que significa que se ha cargado un personaje)...
if (prevButton && nextButton) {
    // Obtiene el ID del personaje actual desde el atributo 'data-character-id'
    const currentId = parseInt(document.querySelector('.navigation').dataset.characterId);

    // Función reutilizable para manejar la navegación
    const navigate = (direction) => {
        // Hace una petición a nuestra API de navegación en app.js
        fetch(`/api/character/navigate/${direction}/${currentId}`)
            .then(response => response.json()) // Convierte la respuesta a JSON
            .then(data => {
                // Si la API responde que todo fue exitoso...
                if (data.success) {
                    // ...redirige a la página del nuevo personaje usando el ID que nos dio la API
                    window.location.href = `/character/${data.data.id}`;
                } else {
                    // Si hubo un error en la API, lo muestra en la consola
                    console.error("Error de navegación:", data.error);
                }
            })
            .catch(error => console.error("Error en la conexión (fetch):", error)); // Atrapa errores de red
    };

    // Asigna la función 'navigate' a los eventos 'click' de cada botón
    prevButton.addEventListener("click", () => navigate("prev"));
    nextButton.addEventListener("click", () => navigate("next"));
}