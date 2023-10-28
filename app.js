import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import mysql from 'mysql2';

const app = express();

let user;

let date = new Date();

let curDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;

//Подключение к бд
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 3000,
    user: 'root',
    database: 'sitelibrery',
});

//Создание парсера
const urlcodedParsers = express.urlencoded({extended: false});

//Настройка storage config для img. 
const storageConfigImg = multer.diskStorage({
    destination: (_, _, cd)=>{
        cd(null, 'public/img/profile'); //Путь сохранения
    },
    filename: (_, file, cd)=>{
        cd(null, file.originalname); //Имя файла
    }
});

const fileFilterImg = (_, file, cd)=>{
    if(file.mimetype === 'image/png' ||
       file.mimetype === 'image/jpg' ||
       file.minetype === 'image/webp' ||
       file.mimetype === 'image/jpeg'){
        cd(null, true);
    } else {
        cd(null, false);
    }
}

// Настройка storage config для txt

const storageConfigTxt = multer.diskStorage({
    destination: (_, _, cd)=>{
        cd(null, 'public/pdf')
    },
    filename: (_, file, cd)=>{
        cd(null, file.originalname);
    }
})

const uploadImg = multer({storage: storageConfigImg,  fileFilter: fileFilterImg});
const uploadTxt = multer({storage: storageConfigTxt});

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

    let bookDesk= {
        pay: false,
        rent: false,
        rentEnd: false,
    }

    pool.query('SELECT * FROM usersbooklist', (err, data)=>{
        if(err) return console.log(err);

        for (let i = 0; i < data.length; i++) {
            if(data[i].idBook == req.params.id){
                bookDesk = {
                    pay: data[i].status,
                    rent: (data[i].rentStart != 'n') ? true : false,
                }
            }            
        }
    });

    pool.query('SELECT * FROM cards', (err, data)=>{
        if(err) console.log(err);

        let book;

        for (let i = 0; i < data.length; i++) {
            if(data[i].id == req.params.id){
                book = data[i];
                break;
            }            
        }

        if(user.status){
            res.render('bookDeskAdmin.hbs');
        } else {
/* 
            let text = fs.readFileSync(`${fs.realpathSync('.')}/public/${book.pathText}`, 'utf-8', (err, data)=>{
                if(err) return console.log(err);

                return data;
                
            });

            text = text.split('\r\n'); */

            res.render('bookDeskUser.hbs', {
                firstName: user.firstName,
                lastName: user.lastName,
                pathImgProfile: user.pathImg,
                payVisible: !bookDesk.pay,
                rent: bookDesk.rent,
                coverBook: book.pathImg,
                bookName: book.name,
                bookAuthor: book.author,
                bookAge: book.age,
                bookCategory: book.category,
                bookDesk: book.desk,
                bookId: book.id,
            });
        }

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

    pool.query('SELECT * FROM usersbooklist', (err, data)=>{
        if(err) return console.log(err);

        let listBook = [];

        for (let i = 0; i < data.length; i++) {
            if(curDate == data[i].rentEnd){ // Проверка: если дата окончания аренды совападает с текущей, то удаляем книгу из списка
                pool.query('DELETE FROM usersbooklist WHERE id=?', [data[i].id], err => {if(err) return console.log(err);})
            }

            if(user.id == data[i].idUser && curDate != data[i].rentEnd)  listBook.push({
                id: data[i].id,
                name: data[i].bookName,
                status: (data[i].status == 't') ? 'Куплено' : `${data[i].rentEnd}`,
                rentStart: (data[i].status == 'f') ? 'n' : data[i].rentStart,
            });    
        }

        if(user.status) return res.render('profileAdmin.hbs', {
            firstName: user.firstName,
            lastName: user.lastName,
            pathImgProfile: user.pathImg,

        });
        else return res.render('profileUser.hbs', {
            firstName: user.firstName,
            lastName: user.lastName,
            pathImgProfile: user.pathImg,
            profileImg: user.pathImg,
            login: user.login,
            password: user.password,
            tableBook: listBook,
        });
    })
});

app.post('/getInfoUser', uploadImg.single('userImg'), urlcodedParsers, (req, res)=>{
    if(!req.body) return res.statusCode(400);

    let sourceRequest, sqlRequest; 
    if(typeof req.file === 'undefined') { // Если пользователь изменяет данные о себе, но не меняет аватар
        sourceRequest = [req.body.userLogin, req.body.userPassword, req.body.userFirstName, req.body.userLastName, user.id]
        sqlRequest = 'UPDATE users SET login=?, password=?, firstName=?, lastname=? WHERE id=?'
    }else{// Если пользователь изменяет данные о себе и аватар
        sourceRequest = [req.body.userLogin, req.body.userPassword, req.body.userFirstName, req.body.userLastName, '/img/profile/' + req.file.filename, user.id]
        sqlRequest = 'UPDATE users SET login=?, password=?, firstName=?, lastname=?, pathImg=? WHERE id=?'
    } 

    pool.query(sqlRequest, sourceRequest, (err, data)=>{
        if(err) return console.log(err);       
    });

    pool.query('SELECT * FROM users', (err, data)=>{
        if(err) return console.log(err);

        let id = user.id;
        user = simpleSearch(data, 'id', id);
    });

    pool.query('SELECT * FROM usersbooklist', (err, data)=>{
        if(err) return console.log(err);

        let listBook = [];

        for (let i = 0; i < data.length; i++) {

            if(curDate == data[i].rentEnd){// Проверка: если дата окончания аренды совападает с текущей, то удаляем книгу из списка
                pool.query('DELETE FROM usersbooklist WHERE id=?', [data[i].id], err => {if(err) return console.log(err);})
            }

            if(user.id == data[i].idUser && curDate != data[i].rentEnd)  listBook.push({
                id: data[i].id,
                name: data[i].bookName,
                status: (data[i].status == 't') ? 'Куплено' : `${data[i].rentEnd}`,
                rentStart: (data[i].status == 'f') ? 'n' : data[i].rentStart,
            });    
        }

        if(user.status) return res.render('profileAdmin.hbs', {
            firstName: user.firstName,
            lastName: user.lastName,
            pathImgProfile: user.pathImg,

        });
        else return res.render('profileUser.hbs', {
            firstName: user.firstName,
            lastName: user.lastName,
            pathImgProfile: user.pathImg,
            profileImg: user.pathImg,
            login: user.login,
            password: user.password,
            tableBook: listBook,
        });
    });

});

app.post('/payBook/:id', urlcodedParsers, (req, res)=>{
    let book = req.params.id;

    pool.query('SELECT * FROM cards', (err, data)=>{
        if(err) return console.log(err);

        for (let i = 0; i < data.length; i++) {
            if(data[i].id == book){
                book = data[i];
                break;
            }
        }
        pool.query('INSERT INTO usersbooklist (idUser, idBook, bookName, status, rentStart, rentEnd) VALUES(?,?,?,?,?,?)', [user.id, book.id, book.name, 't', 'n', 'n'], (err)=>{
            if(err) return console.log(err);
    
        })
        res.redirect('/profile')
    });
});

app.post('/rentBook/:id', urlcodedParsers, (req, res)=>{

    let rentEnd = {
        'oneWeek': createDateRent(7),
        'oneMonth': createDateRent(31),
        'treeMonth': createDateRent(61),
    }

    pool.query('SELECT * FROM usersbooklist', (err, data)=>{
        if(err) return console.log(err);

        let valid;

        for (let i = 0; i < data.length; i++) {
            if(data[i].idBook == req.params.id && data[i].idUser == user.id){
                data = data[i];
                break;
            } else {
                valid = false;
            }            
        }
        if(!valid){
            pool.query('INSERT INTO usersbooklist (idUser, idBook, bookName, status, rentStart, rentEnd) VALUES(?,?,?,?,?,?)', [user.id, +req.params.id, req.body.bookName, 'f', curDate, rentEnd[req.body.rent]], (err)=>{
                if(err) return console.log(err);
            });

            return res.redirect('/profile');
        }
        pool.query('UPDATE usersbooklist SET rentEnd=? WHERE id=?', [rentEnd[req.body.rent], data.id], (err)=>{
            if(err) return console.log(err);
        });

        return res.redirect('/profile');
    });
});

app.get('/openBook/:id', urlcodedParsers, (req, res)=>{
    pool.query('SELECT * FROM cards WHERE id=?', [req.params.id], (err, data)=>{
        if(err) return console.log(err);
        fs.readFile(`${fs.realpathSync('.')}/public/${data[0].pathText}`, 'utf-8', (err, dataRead)=>{
            if(err) return console.log(err);

            res.render('bookOpen.hbs', {
                book: dataRead.split('\r\n'),
            })
        })

    }); 
});

app.post('/setFileBook/:id', uploadImg.array(), urlcodedParsers, (req, res)=>{
    if(!req.body) return res.sendStatus(400);

    pool.query('UPDATE cards SET pathText=?, pathImg=? WHERE id=?', [req.body.pathText, req.body.pathImg, req.params.id], (err)=>{
        if(err) return console.log(err);
    })
})

app.listen(3000, ()=>{
    console.log('Server start! URL: http://localhost:3000/');
});

//Фунакция для простого поиска
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

function createDateRent(rent){

    if(date.getMonth() == 2){
        if(date.getDate() + rent > 28){
            return `${date.getDate() + rent - 28}.${date.getMonth()+2}.${date.getFullYear()}`;
        } else {
            return `${date.getDate() + rent}.${date.getMonth()+1}.${date.getFullYear()}`;
        }
    } else {
        if(date.getDate() + rent > 31){
            return `${date.getDate() + rent - 31}.${date.getMonth()+2}.${date.getFullYear()}`;
        } else {
            return `${date.getDate() + rent}.${date.getMonth()+1}.${date.getFullYear()}`;
        }
    }
}