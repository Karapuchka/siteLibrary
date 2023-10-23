import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import mysql from 'mysql2';

const app = express();

let user;

//Подключение к бд
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 3000,
    user: 'root',
    database: 'sitelibrery',
});

//Создание парсера
const urlcodedParsers = express.urlencoded({extended: false});

//Настройка storage config. 
const storageConfig = multer.diskStorage({
    destination: (req, file, cd)=>{
        cd(null, 'source'); //Путь сохранения
    },
    filename: (req, file, cd)=>{
        cd(null, file.originalname); //Имя файла
    }
})

const upload = multer({storage: storageConfig});

//Указание пути к файлом hbs
app.use(express.static(path.join(fs.realpathSync('.') + '/public')));

app.set('view engine', 'hbs');

app.get('/', (_, res)=>{
    res.render('index.hbs')
});

app.get('/registration', (_, res)=>{
    res.render('registration.hbs');
});

//Регистрация пользователя
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

    pool.query('SELECT * FROM users', (err, data)=>{

        user = simpleSearch(data, 'login', req.body.login)

        if(!user) return res.render('index.hbs', {errorMessange: 'Пользователь не найден!'});

        if(user && user.password != req.body.password) return res.render('index.hbs', {errorMessange: 'Пароль введён неверно!'});

        pool.query('SELECT * FROM cards', (err, data)=>{
            if(err) return console.log(err);

            let listAuthor = delDublicates(data, 'author');
            let listCategory = delDublicates(data, 'category');
            let listAge = delDublicates(data, 'age');

            res.render('home.hbs', {
                bookAuthor: listAuthor,
                bookCategory: listCategory,
                bookAge: listAge,
                cards: data,
                firstName: user.firstName,
                lastName: user.lastName,
                pathImgProfile: user.pathImg,
            });
        });
    });
});

// Открытие страцницы с описанием книги
app.post('/getBookPage/:id=?', urlcodedParsers, (req, res)=>{
    if(!req.body) return res.statusCode(400);

    pool.query('SELECT * FROM cards', (err, data)=>{
        if(err) console.log(err);

        let book;

        for (let i = 0; i < data.length; i++) {
            if(data[i].id == req.params.id){
                book = data[i];
                break;
            }            
        }
        res.send(book);
    })
});

app.get('/home', (_, res)=>{
    pool.query('SELECT * FROM cards', (err, data)=>{
        if(err) return console.log(err);

        let listAuthor = delDublicates(data, 'author');
        let listCategory = delDublicates(data, 'category');
        let listAge = delDublicates(data, 'age');

        res.render('home.hbs', {
            bookAuthor: listAuthor,
            bookCategory: listCategory,
            bookAge: listAge,
            cards: data,
            firstName: user.firstName,
            lastName: user.lastName,
            pathImgProfile: user.pathImg,
        });
    });
})

app.get('/profile', (_, res)=>{

    if(user.status) return res.render('profileAdmin.hbs', {
        firstName: user.firstName,
        lastName: user.lastName,
        pathImgProfile: user.pathImg,
    });
    else return res.render('profileUser.hbs', {
        firstName: user.firstName,
        lastName: user.lastName,
        pathImgProfile: user.pathImg,
    });
});

/* app.post('/upload', upload.single('uploads'), (req, res)=>{
    res.send("Файл загружен");
}) */

app.listen(3000, ()=>{
    console.log('Server start! URL: http://localhost:3000/');
});

//Фунакция дял простого поиска
function simpleSearch(arr, arg, target){
    for (let i = 0; i < arr.length; i++) {
        if(arr[i][arg] === target) return arr[i];
    }

    return false;
}

function delDublicates(arr, target){
    arr = arr.map(item => item[target]).sort();
    return arr.filter((item, id)=>{
        return arr.indexOf(item) === id;
    });
}