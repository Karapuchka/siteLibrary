import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import mysql from 'mysql2';

const app = express();

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 3000,
    user: 'root',
    database: 'sitelibrery',
});

const urlcodedParsers = express.urlencoded({extended: false});
const storageConfig = multer.diskStorage({
    destination: (req, file, cd)=>{
        cd(null, 'source');
    },
    filename: (req, file, cd)=>{
        cd(null, file.originalname);
    }
})

const upload = multer({storage: storageConfig});

app.use(express.static(path.join(fs.realpathSync('.') + '/public')));

app.set('view engine', 'hbs');

app.get('/', (_, res)=>{
    res.render('index.hbs')
});

app.get('/registration', (_, res)=>{
    res.render('registration.hbs');
});

//Регистрация польщователя
app.post('/adduser', urlcodedParsers, (req, res)=>{
    if(!req.body) return res.statusCode(400);

    pool.query('SELECT * FROM users', (err, data)=>{
        if(err) return console.log(err);

        let user = simpleSearch(data, 'login', req.body.login);

        if(user) return res.render('registration.hbs',{errorMessange: 'Логин занят!'});
        else {
            pool.query('INSERT INTO users (login, password, firstName, lastName) VALUES (?,?,?,?)', [req.body.login, req.body.password, req.body.firstName, req.body.lastName], (err)=>{
                if(err) return console.log(err);

                res.redirect('/');
            })
        }
    });

    
});

//Авторизация
app.post('/login', urlcodedParsers, (req, res)=>{
    if(!req.body) return res.statusCode(400);

    pool.query('SELECT * FROM users', [req.body.login], (err, data)=>{

        let user = simpleSearch(data, 'login', req.body.login)

        if(!user) return res.render('index.hbs', {errorMessange: 'Пользователь не найден'});

        if(user && user.password != req.body.password) return res.render('index.hbs', {errorMessange: 'Пароль введён неверно'});

        return res.render('/home');
    });
})

/* app.post('/upload', upload.single('uploads'), (req, res)=>{
    res.send("Файл загружен");
}) */

app.listen(3000, ()=>{
    console.log('Server start! URL: http://localhost:3000/');
});

function simpleSearch(arr, arg, target){
    for (let i = 0; i < arr.length; i++) {
        if(arr[i][arg] === target) return arr[i];
    }

    return false;
}