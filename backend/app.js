const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

const URLTHRONES = "https://thronesapi.com/api/v2/Characters";
const URLICE = "https://api.iceandfire.com/characters";

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); //Used to recive JSON data
app.use(express.static("public"));
app.set("view engine", "ejs");

const app = express();

//Route 1: Base page
app.get("/", (req, res) => {
    res.render("index", { characters: null, error: null });
});

app.get("/api/characters/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const characters = await getAllCharacters();
        const character = characters.find(char => String(char.id) === id);
        
        if (character) {
            res.json({
                success: true,
                data: character,
                totalCharacters: characters.length
            });
        } else {
            res.status(404).json({
                success: false,
                error: "Character not found"
            });
        }
    } catch (error) {
        res.status(500).json({ error: "Error fetching character data" });
    }
});

//Get's the count of all characters
app.get("/api/characters/count", async (req, res) => {
    try {
        const characters = await getAllCharacters();
        res.json({
            success: true,
            count: characters.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
});

//Using the API of GOT to get all characters
async function getThronesCharacters() {
    try {
        const response = await axios.get(URLTHRONES);
        return response.data.map(char => ({ //Filtered to only get the necessary data
            id: char.id,
            image: char.imageUrl || char.image || null,
            firstName: char.firstName || "Unknown",
            lastName: char.lastName || "",
            fullName: char.fullName || `${char.firstName} ${char.lastName}`,
            born: char.born || "Unknown",
            died: char.died || "N/A",
            titles: Array.isArray(char.title) ? char.title.join(", ") : (char.title || "No title"),
            aliases: char.aliases || "No aliases",
            family: char.family || "Unknown",
            familyCrest: char.imageUrl || null, 
            source: "thrones"
        }));
    } catch (error) {
        console.error("Error fetching Thrones API:", error);
        return [];
    }
}

//Using the API of Ice and Fire to get all characters
async function getIceAndFireCharacters(page = 1, pageSize = 50) {
    try {
        let allChars = [];  

    for (let page = 1; page <= pages; page++) {
            const response = await axios.get(`${URLICE}?page=${page}&pageSize=50`);
            allChars = [...allChars, ...response.data];
        }
        
        return allChars
            .filter(char => char.name && char.name !== "") //Only characters with names
            .map(char => {
                const id = char.url.split('/').pop();
                const nameParts = char.name.split(' ');
                
                return {    //Return only necesary data
                    id: parseInt(id),
                    image: null, // Ice & Fire doens't have images
                    firstName: nameParts[0] || "Unknown",
                    lastName: nameParts.slice(1).join(' ') || "",
                    fullName: char.name,
                    born: char.born || "Unknown",
                    died: char.died || "N/A",
                    titles: char.titles.filter(t => t !== "").join(", ") || "No title",
                    aliases: char.aliases.filter(a => a !== "").join(", ") || "No aliases",
                    family: char.allegiances.length > 0 ? "See allegiances" : "Unknown",
                    familyCrest: null, //Doesn't have family crests
                    source: "iceandfire"
                };
            });
    } catch (error) {
        console.error("Error fetching Ice & Fire API:", error);
        return [];
    }
}

async function getMergedCharacters() {
    if (mergedCharacters) {
        return mergedCharacters;
    }

    console.log("Fetching characters from both APIs...");

    const thronesChars = await getThronesCharacters();
    const iceChars = await getIceAndFireCharacters(10); 

    console.log(`Thrones API: ${thronesChars.length} characters`);
    console.log(`Ice & Fire API: ${iceChars.length} characters`);

    //Creating a set of full names from Thrones characters for quick lookup
    const thronesNames = new Set(
        thronesChars.map(c => c.fullName.toLowerCase().trim())
    );

    //Filtering Ice & Fire characters to remove duplicates based on full name
    const uniqueIceChars = iceChars.filter(
        char => !thronesNames.has(char.fullName.toLowerCase().trim())
    );

    //merge both lists
    mergedCharacters = [...thronesChars, ...uniqueIceChars];
    
    //Re index the IDs
    mergedCharacters = mergedCharacters.map((char, index) => ({
        ...char,
        id: index + 1
    }));

    console.log(`Total characters: ${mergedCharacters.length}`);
    
    return mergedCharacters;
}

//Navegation
app.get("/api/character/navigate/:direction/:currentId", async (req, res) => {
    try {
        const currentId = parseInt(req.params.currentId);
        const direction = req.params.direction;
        const characters = await getMergedCharacters();
        
        const currentIndex = characters.findIndex(char => char.id === currentId);
        
        if (currentIndex === -1) {
            return res.status(404).json({
                success: false,
                error: "Current character not found"
            });
        }
        
        let newIndex;
        
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % characters.length;
        } else if (direction === 'prev') {
            newIndex = currentIndex === 0 ? characters.length - 1 : currentIndex - 1;
        } else {
            return res.status(400).json({
                success: false,
                error: "Invalid direction. Use 'next' or 'prev'"
            });
        }
        
        const character = characters[newIndex];
        
        res.json({
            success: true,
            data: {
                id: character.id,
                image: character.image,
                firstName: character.firstName,
                lastName: character.lastName,
                fullName: character.fullName,
                born: character.born,
                died: character.died,
                titles: character.titles,
                aliases: character.aliases,
                family: character.family,
                familyCrest: character.familyCrest
            },
            totalCharacters: characters.length
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
});

//ALWAYS KEEP AT THE END
app.listen(3000, () => {
    console.log("Listening to port 3000");
});

