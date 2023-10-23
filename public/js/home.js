const btnSearch = document.getElementById('btn-cards-search');
const btnDel = document.getElementById('btn-cards-del');
const currentAuthor = document.getElementById('cards-list-author');
const currentCategory = document.getElementById('cards-list-category');
const currentAge = document.getElementById('cards-list-age');
const listBook = document.querySelector('.cards');

let oldList = [];

for (let i = 0; i < listBook.children.length; i++) {
    oldList.push(listBook.children[i]);
}

btnSearch.onclick = (e)=>{
    listBook.innerHTML = '';

    for (let i = 0; i < oldList.length; i++) {
        listBook.appendChild(oldList[i]); 
    }

    if(currentAuthor.value != 'null'){
        createNewList(listBook, [currentAuthor.value, 'data-author']);
    }

    if(currentCategory.value != 'null'){
        createNewList(listBook, [currentCategory.value, 'data-category']);
    }

    if(currentAge.value != 'null'){
        createNewList(listBook, [currentAge.value, 'data-age']);
    }
}

btnDel.onclick = (e)=>{
    currentAuthor.value = 'null';
    currentCategory.value = 'null';
    currentAge.value = 'null';
    listBook.innerHTML = '';

    for (let i = 0; i < oldList.length; i++) {
        listBook.appendChild(oldList[i]); 
    }
}

function createNewList(list, target){
    let arr = [];
    for (let i = 0; i < list.children.length; i++) {
        arr.push(list.children[i]);        
    }
    arr = arr.filter((el) => el.getAttribute(target[1]) == target[0]);

    list.innerHTML = '';

    for (let i = 0; i < arr.length; i++) {
        list.appendChild(arr[i]);        
    }
}