import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
//for Express to get values using the POST method
app.use(express.urlencoded({extended:true}));


//setting up database connection pool, replace values in red
const pool = mysql.createPool({
    host: "bqmayq5x95g1sgr9.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "jiarzphlrz71n5bx",
    password: "g9cxkcpm4l369gzh",
    database: "he5dh1d9q9dzzeme",
    connectionLimit: 10,
    waitForConnections: true
});


//routes

// ROUTE 1: home page(Populates Authors and Categories dropdowns)
app.get('/', async (req, res) => {
    // Fetch Authors sorted by last name
    let sqlAuthors = `SELECT authorId, firstName, lastName FROM authors ORDER BY lastName`;
    const[authors] = await pool.query(sqlAuthors);
    
    // Fetch Distinct Categories (extra credit)
    let sqlCategories = `SELECT DISTINCT(category) FROM quotes ORDER BY category`;
    const [categories] = await pool.query(sqlCategories);

    res.render('home.ejs', { authors, categories });
});

// ROUTE 2: searching by keyword 
app.get("/searchByKeyword", async(req, res) => {
   try {
        let keyword = req.query.keyword;
        let sql = `SELECT quote, firstName, lastName, authorId FROM quotes NATURAL JOIN authors WHERE quote LIKE ?`;
        let sqlParams = [`%${keyword}%`]; // Prevents SQL Injection!
        
        const [rows] = await pool.query(sql, sqlParams); 
        res.render("quotes.ejs", { rows, searchType: "Keyword Search Results" });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});

// ROUTE 3: searching by author
app.get("/searchByAuthor", async(req, res) => {
    try {
         let authorId = req.query.authorId;
         let sql = `SELECT quote, firstName, lastName, authorId FROM quotes NATURAL JOIN authors WHERE authorId = ?`;
         let sqlParams = [authorId];
         
         const [rows] = await pool.query(sql, sqlParams); 
         res.render("quotes.ejs", { rows, searchType: "Author Search Results" });
     } catch (err) {
         console.error("Database error:", err);
         res.status(500).send("Database error!");
     }
 });

// ROUTE 4: searching by category 
app.get("/searchByCategory", async(req, res) => {
    try {
         let category = req.query.category;
         let sql = `SELECT quote, firstName, lastName, authorId FROM quotes NATURAL JOIN authors WHERE category = ?`;
         let sqlParams = [category];
         
         const [rows] = await pool.query(sql, sqlParams); 
         res.render("quotes.ejs", { rows, searchType: "Category Search Results" });
     } catch (err) {
         console.error("Database error:", err);
         res.status(500).send("Database error!");
     }
 });

// ROUTE 5: searching by likes   
app.get("/searchByLikes", async(req, res) => {
    try {
         let min = req.query.minLikes || 0;
         let max = req.query.maxLikes || 1000000;
         // Grab likes, sort descending so the best quotes are on top
         let sql = `SELECT quote, firstName, lastName, authorId, likes FROM quotes NATURAL JOIN authors WHERE likes BETWEEN ? AND ? ORDER BY likes DESC`;
         let sqlParams = [min, max];
         
         const[rows] = await pool.query(sql, sqlParams); 
         // Rubric says: "Use a different view to display the results to include the number of likes." 
         res.render("likes.ejs", { rows, searchType: "Likes Range Search Results" });
     } catch (err) {
         console.error("Database error:", err);
         res.status(500).send("Database error!");
     }
 });

// ROUTE: search by gender (from user story requirements)
app.get("/searchByGender", async(req, res) => {
    try {
         let sex = req.query.sex; // gets 'M' or 'F' from the dropdown
         let sql = `SELECT quote, firstName, lastName, authorId FROM quotes NATURAL JOIN authors WHERE sex = ?`;
         let sqlParams = [sex];
         
         const [rows] = await pool.query(sql, sqlParams); 
         res.render("quotes.ejs", { rows, searchType: "Gender Search Results" });
     } catch (err) {
         console.error("Database error:", err);
         res.status(500).send("Database error!");
     }
});

// ROUTE: author profile (Clicking an author's name)
app.get("/authorInfo", async(req, res) => {
    try {
         let authorId = req.query.authorId;
         let sql = `SELECT * FROM authors WHERE authorId = ?`;
         let sqlParams = [authorId];
         
         const [rows] = await pool.query(sql, sqlParams); 
         // Pass the single author record to a new author.ejs view
         res.render("author.ejs", { author: rows[0] });
     } catch (err) {
         console.error("Database error:", err);
         res.status(500).send("Database error!");
     }
});

//dbTest
app.listen(3000, ()=>{
    console.log("Express server running on port 3000")
})
