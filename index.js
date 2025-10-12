const express = require('express');
const session = require('express-session')
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mysql = require('mysql2');
const MySQLStore = require('express-mysql-session')(session);

require('dotenv').config()

const app = express()

app.set('view engine', 'ejs')

// current database connection
const db = mysql.createConnection({
    host:process.env.DB_HOST,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database:process.env.DB_NAME
})

// for user sessions 
const sessionStore = new MySQLStore({},db)

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    store:sessionStore,
    cookie:{
        maxAge: 365 * 24 * 60 * 60 * 1000 //1 year of time

    }
}))

app.use(passport.initialize())

app.use(passport.session())

//serialize
passport.serializeUser((user,done) => {
    done(null,user.id)
})

passport.deserializeUser((id,done) => {
    db.query("SELECT * FROM users WHERE id = ?",[id],(err,results) => {
        if(err) throw done(err)
        
        if(results.length === 0) {
            return done(null,false)
        }
        done(null,results[0])
    })
})

passport.use(
    new GoogleStrategy(
    {
        clientID:process.env.GOOGLE_CLIENT_ID,
        clientSecret:process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:process.env.GOOGLE_CALLBACK_URL
    },
    (token,tokenSecret,profile,done) => {
        db.query
        ("SELECT * FROM users WHERE google_id = ?", 
            [profile.id],
            (err,results) => {
            if(err) return done(err)
            
            if(results.length > 0) {
                return done(null,results[0])
            }else {
                const newUser = {
                    google_id:profile.id,
                    display_name:profile.displayName,
                    email:profile.emails[0].value,
                    photo:profile.photos[0].value
                }
                db.query("INSERT INTO users SET ?",newUser,(err,results) => {
                    if(err) return done(err)
                    newUser.id = results.insertId;
                    return done(null,newUser)
                })
            }
        })
    }
))

db.connect((err) => {
    if(err) throw err;

    console.log("Connected to MySQL")
})

app.get('/', (req,res) => {
    res.render("index",{
        title:"Home Page",
        user:req.isAuthenticated() ? req.user : null
    });
});

app.get(
    '/auth/google',
    passport.authenticate('google',{
    scope:['profile','email']
})
);

app.get('/auth/google/callback',passport.authenticate('google',{
    failureRedirect:"/"
}),(req,res) => {
    res.redirect('/')
});

app.listen(4000,()=> {
    console.log("app is listening on port 4000")
});

