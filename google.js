const http = require("http");
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const passport = require("passport");
const bodyParser = require("body-parser");
const fs = require("fs");
const mysql = require('mysql2');
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = 8080;

const GOOGLE_CLIENT_ID = "984288233831-e3ukerm8gvi159hdnpejqr34jm0fr1pj.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

const dbConfig = {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "par1k7208!",
    database: "ssaltalk",
};

const db = mysql.createPool(dbConfig).promise();

const options = {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
};

const sessionStore = new MySQLStore(options);

app.use(
    session({
        secret: "secret key",
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
    })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (id, done) {
    done(null, id);
});

passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:8080/auth/google/callback",
            passReqToCallback: true,
        },
        async function (request, accessToken, refreshToken, profile, done) {
            try {
                // 여기에 사용자를 데이터베이스에 저장하는 코드를 추가할 수 있습니다.
                // 예를 들어, profile.id로 사용자를 조회하고, 없으면 새로 추가하는 로직 등
                // const user = await db.query('SELECT * FROM users WHERE googleId = ?', [profile.id]);
                // if (!user) {
                //     await db.query('INSERT INTO users SET ?', { googleId: profile.id, ... });
                // }
                
                const user = {
                    id: profile.id,
                    email: profile.email
                }
                
                
                done(null, user);
            } catch (error) {
                console.error(`Error during GoogleStrategy callback: ${error.message}`);
                done(error);
            }
        }
    )
);

app.get("/login", (req, res) => {
    if (req.user) return res.redirect("/");
    res.sendFile(path.join(__dirname, 'webpage', 'login.html'));
});

app.get("/", (req, res) => {
    if (!req.user) return res.redirect("/login");
    res.sendFile(path.join(__dirname, 'webpage', 'main.html'));
});

app.get("/auth/google", passport.authenticate("google", { scope: ["email", "profile"] }));

app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
        res.redirect("/user/info");
    }
);

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/login");
});

app.get('/user/info', (req, res) => {
    if (!req.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'webpage', 'user_info.html'));
});

app.post('/user/info', async (req, res) => {
    try {
        const { gender, name, phoneNumber, birthday, picture, nickname, introduce } = req.body;

        console.log(req.user);
        const googleOauth = req.user.email;
        const created = new Date();
        const query = `INSERT INTO users (gender, name, phoneNumber, birthday, picture, nickname, introduce, googleOauth, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.execute(query, [gender, name, phoneNumber, birthday, picture, nickname, introduce, googleOauth, created]);
        res.redirect('/');
    } catch (error) {
        console.error(`Error in POST /user/info: ${error.message}`);
        res.status(500).send('사용자 정보를 저장하는 과정에서 문제가 발생했습니다.');
    }
});

// 전역 에러 핸들러
app.use((error, req, res, next) => {
    console.error(`Global Error Handler: ${error.message}`);
    res.status(500).send('서버에서 문제가 발생했습니다.');
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
