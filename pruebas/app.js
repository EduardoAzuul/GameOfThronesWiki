// Importing required modules
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

// URLs for the APIs
const URLTHRONES = "https://thronesapi.com/api/v2/Characters";
const URLICE = "https://api.iceandfire.com/characters";

const app = express();

// --- Middleware Setup ---
// Configura Express para que sepa dónde encontrar tus archivos
app.use(cors());
app.use(express.static("public")); // Sirve archivos estáticos (CSS, JS de cliente) desde la carpeta 'public'
app.set("view engine", "ejs");     // Establece EJS como el motor de plantillas
app.set("views", "views");         // Le dice a Express que las vistas están en la carpeta 'views'

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Cache para los personajes (Patrón Singleton)
let mergedCharacters = null;

// --- Rutas de Renderizado (las que muestran páginas al usuario) ---

// RUTA PRINCIPAL: Muestra la galería de todos los personajes al inicio
app.get("/", async (req, res) => {
    try {
        const characters = await getMergedCharacters();
        // Renderiza la vista con la lista completa de personajes
        res.render("index", {
            character: null,
            allCharacters: characters, // Pasa la lista completa a la vista
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

// RUTA DE BÚSQUEDA: Muestra el resultado de una búsqueda por nombre
app.get("/search/:name", async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.name);
        const characters = await getMergedCharacters();
        const character = characters.find(
            (char) => char.fullName.toLowerCase().trim() === name.toLowerCase().trim()
        );

        if (character) {
            res.render("index", {
                character: character,
                allCharacters: null, // No se muestra la galería en la búsqueda
                totalCharacters: characters.length,
                error: null,
            });
        } else {
            res.render("index", {
                character: null,
                allCharacters: [],
                totalCharacters: characters.length,
                error: `Personaje "${name}" no encontrado. Intenta de nuevo.`,
            });
        }
    } catch (error) {
        res.render("index", {
            character: null,
            allCharacters: [],
            totalCharacters: 0,
            error: "Error del servidor durante la búsqueda.",
        });
    }
});

// RUTA DE PERSONAJE: Muestra un personaje por su ID (para la navegación)
app.get("/character/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const characters = await getMergedCharacters();
        const character = characters.find((char) => char.id === id);

        if (character) {
            res.render("index", {
                character: character,
                allCharacters: null, // No se muestra la galería aquí
                totalCharacters: characters.length,
                error: null,
            });
        } else {
            res.render("index", {
                character: null,
                allCharacters: [],
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


// --- Rutas de API (las que solo devuelven datos JSON) ---

// (Aquí van tus rutas /api/... y las funciones getThronesCharacters, getIceAndFireCharacters, getMergedCharacters)
// ... (Omitido por brevedad, no necesitan cambios) ...
async function getThronesCharacters() {
    try {
        const response = await axios.get(URLTHRONES);
        return response.data.map(char => ({ id: char.id, image: char.imageUrl || char.image || null, firstName: char.firstName || "Unknown", lastName: char.lastName || "", fullName: char.fullName || `${char.firstName} ${char.lastName}`, born: char.born || "Unknown", died: char.died || "N/A", titles: Array.isArray(char.title) ? char.title.join(", ") : (char.title || "No title"), aliases: char.aliases || "No aliases", family: char.family || "Unknown", familyCrest: char.imageUrl || null, source: "thrones" }));
    } catch (error) {
        console.error("Error fetching Thrones API:", error);
        return [];
    }
}
async function getIceAndFireCharacters(pages = 10) {
    try {
        let allChars = [];
        for (let page = 1; page <= pages; page++) {
            const response = await axios.get(`${URLICE}?page=${page}&pageSize=50`);
            allChars = [...allChars, ...response.data];
        }
        return allChars.filter(char => char.name && char.name !== "").map(char => {
            const id = char.url.split('/').pop();
            const nameParts = char.name.split(' ');
            return { id: parseInt(id), image: null, firstName: nameParts[0] || "Unknown", lastName: nameParts.slice(1).join(' ') || "", fullName: char.name, born: char.born || "Unknown", died: char.died || "N/A", titles: char.titles.filter(t => t !== "").join(", ") || "No title", aliases: char.aliases.filter(a => a !== "").join(", ") || "No aliases", family: char.allegiances.length > 0 ? "See allegiances" : "Unknown", familyCrest: null, source: "iceandfire" };
        });
    } catch (error) {
        console.error("Error fetching Ice & Fire API:", error);
        return [];
    }
}
async function getMergedCharacters() {
    if (mergedCharacters) { return mergedCharacters; }
    console.log("Fetching characters from both APIs...");
    const thronesChars = await getThronesCharacters();
    const iceChars = await getIceAndFireCharacters(10);
    const thronesNames = new Set(thronesChars.map(c => c.fullName.toLowerCase().trim()));
    const uniqueIceChars = iceChars.filter(char => !thronesNames.has(char.fullName.toLowerCase().trim()));
    mergedCharacters = [...thronesChars, ...uniqueIceChars];
    mergedCharacters = mergedCharacters.map((char, index) => ({ ...char, id: index + 1 }));
    console.log(`Total characters: ${mergedCharacters.length}`);
    return mergedCharacters;
}
app.get("/api/characters/count", async (req, res) => {
    try {
        const characters = await getMergedCharacters();
        res.json({ success: true, count: characters.length });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server error" });
    }
});
app.get("/api/character/navigate/:direction/:currentId", async (req, res) => {
    try {
        const currentId = parseInt(req.params.currentId);
        const direction = req.params.direction;
        const characters = await getMergedCharacters();
        const currentIndex = characters.findIndex(char => char.id === currentId);
        if (currentIndex === -1) { return res.status(404).json({ success: false, error: "Current character not found" }); }
        let newIndex;
        if (direction === 'next') { newIndex = (currentIndex + 1) % characters.length; }
        else if (direction === 'prev') { newIndex = currentIndex === 0 ? characters.length - 1 : currentIndex - 1; }
        else { return res.status(400).json({ success: false, error: "Invalid direction. Use 'next' or 'prev'" }); }
        const character = characters[newIndex];
        res.json({ success: true, data: character, totalCharacters: characters.length });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server error" });
    }
});


// --- Iniciar el Servidor ---
app.listen(3000, () => {
    console.log("Servidor escuchando en el puerto 3000");
});

