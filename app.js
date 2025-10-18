// --- Importación de Módulos ---
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

// --- Constantes de la API ---
const URL_THRONES = "https://thronesapi.com/api/v2/Characters";
const URL_ICE_FIRE = "https://www.anapioficeandfire.com/api/characters";

const app = express();

// --- Configuración de Express (Middleware) ---
app.use(cors());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "views");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- Caché para los Personajes ---
let cachedCharacters = null;

// =================================================================
// RUTAS DE RENDERIZADO
// =================================================================

// RUTA PRINCIPAL (/): Muestra la galería completa o el detalle de un personaje.
app.get("/", async (req, res) => {
    try {
        const characters = await getMergedCharacters();
        res.render("index", {
            character: null,
            allCharacters: characters,
            error: null,
            totalCharacters: characters.length
        });
    } catch (error) {
        res.render("index", {
            character: null,
            allCharacters: [],
            error: "No se pudieron cargar los datos de los personajes.",
            totalCharacters: 0
        });
    }
});

// RUTA DE BÚSQUEDA (/search/:name): Ahora con búsqueda flexible.
app.get("/search/:name", async (req, res) => {
    try {
        // 1. Preparamos el término de búsqueda: lo pasamos a minúsculas y quitamos espacios.
        const searchTerm = decodeURIComponent(req.params.name).toLowerCase().trim();
        const allCharacters = await getMergedCharacters();

        // 2. Usamos .filter() en lugar de .find().
        //    .filter() devuelve un ARRAY con TODAS las coincidencias, no solo la primera.
        //    La condición ahora es .includes(), que busca el texto en cualquier parte del nombre.
        const foundCharacters = allCharacters.filter(
            (char) => char.fullName.toLowerCase().includes(searchTerm)
        );

        // 3. Evaluamos los resultados para dar la mejor respuesta al usuario.
        if (foundCharacters.length > 1) {
            // -- MÚLTIPLES RESULTADOS: Mostramos una galería solo con los personajes encontrados.
            res.render("index", {
                character: null,
                allCharacters: foundCharacters, // ¡Le pasamos solo los resultados del filtro!
                totalCharacters: allCharacters.length,
                error: `Se encontraron ${foundCharacters.length} personajes para "${req.params.name}"`, // Mensaje informativo
            });
        } else if (foundCharacters.length === 1) {
            // -- UN SOLO RESULTADO: Llevamos al usuario directamente a la tarjeta de detalle.
            res.render("index", {
                character: foundCharacters[0],
                allCharacters: null,
                totalCharacters: allCharacters.length,
                error: null,
            });
        } else {
            // -- CERO RESULTADOS: Mostramos la galería completa de nuevo con un error claro.
            res.render("index", {
                character: null,
                allCharacters: allCharacters, // Le pasamos todos para que no se quede vacía la página.
                totalCharacters: allCharacters.length,
                error: `No se encontró ningún personaje que coincida con "${req.params.name}".`,
            });
        }
    } catch (error) {
        // -- ERROR DE SERVIDOR: Manejamos cualquier otro posible fallo.
        console.error("Error en la ruta de búsqueda flexible:", error);
        res.render("index", {
            character: null,
            allCharacters: [],
            totalCharacters: 0,
            error: "Ocurrió un error en el servidor durante la búsqueda.",
        });
    }
});

// RUTA DE PERSONAJE POR ID (/character/:id):
app.get("/character/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const characters = await getMergedCharacters();
        const foundCharacter = characters.find((char) => char.id === id);

        if (foundCharacter) {
            res.render("index", {
                character: foundCharacter,
                allCharacters: null,
                totalCharacters: characters.length,
                error: null,
            });
        } else {
            res.render("index", {
                character: null,
                allCharacters: characters,
                totalCharacters: characters.length,
                error: `Personaje con ID "${id}" no encontrado.`,
            });
        }
    } catch (error) {
        res.render("index", {
            character: null,
            allCharacters: [],
            totalCharacters: 0,
            error: "Error del servidor al buscar el personaje.",
        });
    }
});


// =================================================================
// RUTA DE API (Solo para navegación)
// =================================================================

app.get("/api/character/navigate/:direction/:currentId", async (req, res) => {
    try {
        const currentId = parseInt(req.params.currentId);
        const direction = req.params.direction;
        const characters = await getMergedCharacters();
        const currentIndex = characters.findIndex(char => char.id === currentId);

        if (currentIndex === -1) {
            return res.status(404).json({ success: false, error: "Personaje actual no encontrado" });
        }

        let newIndex = (direction === 'next')
            ? (currentIndex + 1) % characters.length
            : (currentIndex - 1 + characters.length) % characters.length;

        res.json({ success: true, data: characters[newIndex] });
    } catch (error) {
        res.status(500).json({ success: false, error: "Error del servidor en la navegación" });
    }
});


// =================================================================
// LÓGICA DE OBTENCIÓN Y FUSIÓN DE DATOS
// =================================================================

// Función para normalizar los datos de la API de Thrones
const mapThronesCharacter = (char) => ({
    fullName: char.fullName || `${char.firstName} ${char.lastName}`,
    image: char.imageUrl || null,
    titles: char.title || "Sin títulos",
    family: char.family || "Casa desconocida",
    born: char.born || "Desconocido",
    died: char.died || "N/A",
    aliases: "N/A"
});

// Función para normalizar los datos de la API de Ice & Fire
const mapIceFireCharacter = (char) => ({
    fullName: char.name,
    image: null, // Esta API no provee imágenes.
    titles: char.titles.filter(t => t).join(', ') || "Sin títulos",
    family: "N/A", // Esta API no provee este dato de forma directa.
    born: char.born || "Desconocido",
    died: char.died || "N/A",
    aliases: char.aliases.filter(a => a).join(', ') || "Sin alias"
});

async function getMergedCharacters() {
    if (cachedCharacters) {
        return cachedCharacters;
    }

    console.log("Obteniendo y fusionando datos de ambas APIs...");
    try {
        // Obtenemos los datos de ambas fuentes en paralelo para más eficiencia
        const [thronesResponse, iceFireResponse] = await Promise.all([
            axios.get(URL_THRONES),
            axios.get(`${URL_ICE_FIRE}?pageSize=50&page=1`) // Obtenemos un buen lote inicial
        ]);
        
        const thronesChars = thronesResponse.data.map(mapThronesCharacter);
        const iceFireChars = iceFireResponse.data.filter(c => c.name).map(mapIceFireCharacter);

        // Usamos un Map para dar prioridad a los datos de ThronesAPI y evitar duplicados
        const characterMap = new Map();

        // 1. Añadimos todos los de ThronesAPI primero, ya que son más completos
        thronesChars.forEach(char => characterMap.set(char.fullName.toLowerCase(), char));

        // 2. Añadimos los de Ice&Fire SOLO si no existen ya en el mapa
        iceFireChars.forEach(char => {
            if (!characterMap.has(char.fullName.toLowerCase())) {
                characterMap.set(char.fullName.toLowerCase(), char);
            }
        });
        
        // Convertimos el mapa de nuevo a un array y le asignamos un ID secuencial
        cachedCharacters = Array.from(characterMap.values()).map((char, index) => ({
            ...char,
            id: index + 1
        }));

        console.log(`Proceso completado. Total de personajes únicos: ${cachedCharacters.length}`);
        return cachedCharacters;

    } catch (error) {
        console.error(`Error crítico al obtener y fusionar datos: ${error.message}`);
        return []; // Devolvemos un array vacío en caso de error.
    }
}

// --- Iniciar el Servidor ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
    getMergedCharacters(); // Precargamos los datos.
});

