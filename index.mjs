import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';

// NEW: Dr. Lara's required fix for ESM __dirname
import path from 'path';
import { fileURLToPath } from 'url';

// NEW: Lab 7 imports
import session from 'express-session';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express(); // this line means we are creating an Express application and storing it in the variable 'app'. We will use 'app' to define routes and middleware for our web server. We do this because Express provides a lot of functionality for building web applications, and we need to create an instance of it to use that functionality. By calling 'express()', we are initializing our application and can now use 'app' to set up our server, define routes, and handle requests and responses. Alternatively if we decided const app = node.js http module, we would have to write a lot more code to handle routing, parsing request bodies, and other common web server tasks that Express simplifies for us. So using Express allows us to write cleaner and more efficient code for our web application.
app.set('view engine', 'ejs');

// NEW: safely binding the paths using __dirname and path.join, which is required for ESM modules. This allows us to use relative paths for our views and static files without running into issues with the current working directory.
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
//for Express to get values using the POST method
app.use(express.urlencoded({extended:true}));

// NEW: Lab 7 Session Setup (From Dr. Lara's class transcript)
app.use(session({
    secret: 'super_secret_cookie_key', // In production, this should be in .env
    resave: false,
    saveUninitialized: true
}));

// NEW: Make session data available to all EJS templates (Middleware from Dr. Lara's transcript)
app.use((req, res, next) => {
    res.locals.authenticated = req.session.authenticated || false;
    res.locals.userFullName = req.session.userFullName || '';
    next();
});

//setting up database connection pool, replace values in red
const pool = mysql.createPool({
    host: "bqmayq5x95g1sgr9.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
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

// ============================================
// LAB 7: authentication middleware & routes

// Middleware to protect admin routes 
function isAuthenticated(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Render the Login Page
app.get('/login', (req, res) => {
    res.render('login.ejs');
});

// Process Login Credentials using bcrypt
app.post('/login', async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    try {
        let sql = `SELECT * FROM admin WHERE username = ?`;
        const [rows] = await pool.query(sql, [username]);

        if (rows.length > 0) {
            let hashPassword = rows[0].password;
            let match = await bcrypt.compare(password, hashPassword);

            if (match) {
                // Set session variables
                req.session.authenticated = true;
                req.session.userFullName = rows[0].firstName + " " + rows[0].lastName;
                
                // Redirect to the protected dashboard
                res.redirect('/admin'); 
            } else {
                res.render('login.ejs', { loginError: "Wrong credentials. Try again." });
            }
        } else {
            res.render('login.ejs', { loginError: "Wrong credentials. Try again." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Database error during login");
    }
});

// Logout Route 
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


// ============================================
// LAB 7: admin dashboard & delete routes

// Admin Dashboard (Protected)
app.get('/admin', isAuthenticated, async (req, res) => {
    try {
        // Fetch all authors
        const [authors] = await pool.query('SELECT * FROM authors ORDER BY lastName');
        
        // Fetch all quotes (Join with authors to get the author's last name)
        const[quotes] = await pool.query(`
            SELECT q.quoteId, q.quote, a.lastName 
            FROM quotes q 
            JOIN authors a ON q.authorId = a.authorId 
            ORDER BY q.quoteId DESC
        `);
        
        // Pass both lists to the EJS view
        res.render('admin.ejs', { authors, quotes });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading admin dashboard.");
    }
});

// Delete Author Route
app.post('/admin/author/delete', isAuthenticated, async (req, res) => {
    let authorId = req.body.authorId;
    try {
        // Step A: Delete all quotes associated with this author to prevent database constraint errors
        await pool.query('DELETE FROM quotes WHERE authorId = ?', [authorId]);
        
        // Step B: Delete the actual author
        await pool.query('DELETE FROM authors WHERE authorId = ?', [authorId]);
        
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting author.");
    }
});

// Delete Quote Route
app.post('/admin/quote/delete', isAuthenticated, async (req, res) => {
    let quoteId = req.body.quoteId;
    try {
        await pool.query('DELETE FROM quotes WHERE quoteId = ?', [quoteId]);
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting quote.");
    }
});
// ============================================

// ROUTE 2: searching by keyword 
app.get("/searchByKeyword", async(req, res) => {
   try {
        let keyword = req.query.keyword;
        let sql = `SELECT quote, firstName, lastName, authorId 
                    FROM quotes 
                    NATURAL JOIN authors 
                    WHERE quote LIKE ?`;
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
         let sql = `SELECT quote, firstName, lastName, authorId 
                    FROM quotes 
                    NATURAL JOIN authors 
                    WHERE authorId = ?`;
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

// ROUTE: API to get the author infor based on an authorId (for extra credit AJAX)
app.get('/api/author/:author_Id', async(req, res) => {
    console.log(req);
    try {
         let authorId = req.params.author_Id;
         let sql = `SELECT * 
                    FROM authors 
                    WHERE authorId = ?`; //? prevents SQL Injection
         let sqlParams = [authorId];
         
         const [authorInfo] = await pool.query(sql,[authorId]); 
         // Pass the single author record to a new author.ejs view
         res.send(authorInfo);//displays info in JSON format, can be used by AJAX on the frontend
     } catch (err) {
         console.error("Database error:", err);
         res.status(500).send("Database error!");
     }
});

//dbTest
app.listen(3000, ()=>{
    console.log("Express server running on port 3000")
})
