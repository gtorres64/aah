if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const http = require('http');
const express = require("express");
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override')

const hostname = '127.0.0.1';
const port = 3000;

const initializePassport =  require('./passport-config');
const {pool, insertUser} = require('./sql/mysql-config');
initializePassport(passport, 
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
)

const users = []
const ROLES = {
    ADMIN: 'admin',
    CUSTOMER: 'customer'
};

app.set('view-engine', 'ejs');
app.use(express.urlencoded({extended:false}));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

app.get('/', (req, res) => {
    console.log("Request recieved");
    res.render('index.ejs', { loggedIn: req.isAuthenticated() });
})

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs');
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
}), (req, res) => {
    console.log("Logged in");
    res.redirect('/dashboard');
})

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs');
})

app.get('/dashboard', checkAuthenticated, (req, res) => {
    if (req.isAuthenticated()) {
        const isAdmin = req.user.isAdmin;

        if (isAdmin) {
            res.render('dashAdmin.ejs');
        } else {
            res.render('dashCustomer.ejs', {name: req.user.firstName});
        }
    } else {
        res.redirect('/login');
    }
})

app.get('/admin_dashboard', checkAuthenticated, (req, res) => {
    res.render('dashAdmin.ejs');
})

app.get('/customer_dashboard', checkAuthenticated, (req, res) => {
    res.render('dashCustomer.ejs', {name: req.user.firstName});
})


app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        //Register the user to the database

        const userId = await insertUser(
            req.body.username, 
            hashedPassword, 
            req.body.email, 
            req.body.firstName, 
            req.body.lastName);
        console.log("USER INSERTED WITH ID:", userId);
        res.redirect('/login');

    } catch (error){
        console.error('ERROR REGISTERING USER:', error);
        res.redirect('/register');
    }
})

app.delete('/logout', (req, res, next) => {
    req.logOut((err) => {
      if (err) {
        return next(err);
      }
      res.redirect('/login');
    });
  });

function checkAdmin(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    next();
}

app.listen(port, hostname);
