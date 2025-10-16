const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const axios = require("axios");
const FormData = require("form-data");

const URLTHRONES = "https://thronesapi.com/api/v2/Characters";
const URLICE = "https://api.iceandfire.com/characters";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("index", { characters: null, error: null });
});

app.listen(3000, () => {
    console.log("Listening to port 3000");
});

