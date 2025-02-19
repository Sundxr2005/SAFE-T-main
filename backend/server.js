require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

// Database Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "sundar",
    password: "greatestofalltime077$", // Set your MySQL password
    database: "safet_db",
});

db.connect(err => {
    if (err) throw err;
    console.log("MySQL Connected...");
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ error: "Access denied. No token provided." });
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: "Invalid token." });
        req.user = decoded;
        next();
    });
};
// User Registration
app.post("/signup", async (req, res) => {
    const { full_name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
        "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
        [full_name, email, hashedPassword],
        (err) => {
            if (err) return res.status(500).json({ error: "User already exists" });
            res.json({ message: "User registered successfully" });
        }
    );
});

// User Login
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: "Invalid credentials" });

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, full_name: user.full_name, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email } });
    });
});

app.get("/messages", (req, res) => {
    db.query(
        "SELECT messages.*, users.full_name FROM messages JOIN users ON messages.user_id = users.id ORDER BY messages.created_at DESC",
        (err, results) => {
            if (err) return res.status(500).json({ error: "Error fetching messages" });
            res.json(results);
        }
    );
});

// Send Message
app.post("/messages", verifyToken, (req, res) => {
    const { message } = req.body;
    const user_id = req.user.id;
    const full_name = req.user.full_name;
    
    db.query("INSERT INTO messages (user_id, full_name, message) VALUES (?, ?, ?)", [user_id, full_name, message], (err, result) => {
        if (err) return res.status(500).json({ error: "Error sending message" });

        db.query(
            "SELECT messages.id, messages.message, messages.created_at, messages.full_name FROM messages WHERE messages.id = ?",
            [result.insertId],
            (err, results) => {
                if (err) return res.status(500).json({ error: "Error retrieving message" });
                res.json(results[0]);
            }
        );
    });
});
// Serve Frontend Files
app.use(express.static(path.join(__dirname, "../Frontend")));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
