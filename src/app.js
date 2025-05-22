const express = require('express');
const path = require('path');
const connectDB = require('./db');
const User = require('../models/User');
const bodyParser = require('body-parser');
const app = express();

connectDB();

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../assets')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.render('mainpage');
});

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send('User already exists. Try logging in.');
        }

        const newUser = new User({ username, email, password });
        await newUser.save();
        res.redirect('/profile?user=' + username);
    } catch (err) {
        console.error(err);
        res.send('Signup failed.');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password }); // No password hashing for now
        if (!user) {
            return res.send('Invalid email or password');
        }

        res.redirect('/profile?user=' + user.username);
    } catch (err) {
        console.error(err);
        res.send('Login failed.');
    }
});

app.get('/profile', async (req, res) => {
  const username = req.query.user;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.send('User not found');

    res.render('profile', {
      username: user.username,
      portfolio: user.portfolio || []
    });
  } catch (err) {
    console.error(err);
    res.send('Error loading profile');
  }
});




app.get('/explore', async (req, res) => {
    const username = req.query.user;
    res.render('explore', { username });
}); 

app.post('/add-crypto', async (req, res) => {
    const { username, cryptoId } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && !user.portfolio.includes(cryptoId)) {
            user.portfolio.push(cryptoId);
            await user.save();
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to add crypto");
    }
});


app.listen(3000, () => {
    console.log('✅ Server listening on port 3000');
});
