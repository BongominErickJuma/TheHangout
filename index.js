import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

//before passport
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

const createJokeUsersTable = `
    CREATE TABLE IF NOT EXISTS joke_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password varchar(100) NOT NULL
    );
`;

db.query(createJokeUsersTable, (err) => {
  if (err) {
    console.error("Error creating users table:", err);
  } else {
    console.log("Users table created successfully!");
  }
});

let joke;

app.get("/", (req, res) => {
  res.render("login.ejs");
});

app.get("/joke", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("index.ejs", { joke: joke });
  } else {
    res.redirect("/");
  }
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/joke",
    failureRedirect: "/",
  })
);

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.post("/register", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  try {
    const result = await db.query("SELECT * FROM joke_users WHERE email = $1", [
      username,
    ]);

    if (result.rows.length > 0) {
      res.redirect("/");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.log("error hashing password");
        } else {
          const result = await db.query(
            "INSERT INTO joke_users (email, password) VALUES ($1, $2) RETURNING *",
            [username, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            res.redirect("/joke");
          });
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/joke", async (req, res) => {
  const category = req.body.category;
  try {
    const result = await axios.get(
      `https://v2.jokeapi.dev/joke/${category}?type=single`
    );
    if (result.data.joke) {
      joke = result.data.joke;
    } else {
      joke = `no joke about ${category} today🙄`;
    }

    res.redirect("/joke");
  } catch (error) {
    console.log(error);
  }
});
passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query(
        "SELECT * FROM joke_users WHERE email = $1",
        [username]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;

        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              console.log(`&{user} not allowed`);
              return cb(null, false);
            }
          }
        });
      } else {
        return cb(null, false, { message: "User not found" });
      }
    } catch (error) {
      console.log(error);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`server running at http://localhost:${port}`);
});
