const express = require('express');
const path = require('path');
const connectDB = require('./db');
const User = require('../models/User');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
require('./monitor');

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

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
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
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
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

        const exists = user.portfolio.find(p => p.coin === cryptoId);
        if (!exists) {
            user.portfolio.push({ coin: cryptoId, threshold: 0, interval: 0 });
            await user.save();
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to add crypto");
    }
});

app.get('/get-preferences/:user/:coinId', async (req, res) => {
    const { user, coinId } = req.params;
    const userDoc = await User.findOne({ username: user });
    const coin = userDoc.portfolio.find(p => p.coin === coinId);
    res.json({
        threshold: coin?.threshold || '',
        interval: coin?.interval || ''
    });
});

app.post('/edit-preferences/:user/:coinId', async (req, res) => {
    const { user, coinId } = req.params;
    const { threshold, interval } = req.body;

    await User.updateOne(
        { username: user, 'portfolio.coin': coinId },
        {
            $set: {
                'portfolio.$.threshold': threshold,
                'portfolio.$.interval': interval
            }
        }
    );
    res.sendStatus(200);
});

app.delete('/delete-crypto/:user/:coinId', async (req, res) => {
    const { user, coinId } = req.params;
    await User.updateOne(
        { username: user },
        { $pull: { portfolio: { coin: coinId } } }
    );
    res.sendStatus(200);
});

app.listen(3000, () => {
    console.log('✅ Server listening on port 3000');
});
