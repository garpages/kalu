const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("KALU Server is running!");
});

app.listen(PORT, () => {
    console.log(`KALU is running at http://localhost:${PORT}`);
});