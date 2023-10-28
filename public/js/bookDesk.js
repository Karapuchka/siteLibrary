const btnCansel = document.getElementById('btn-cancel');
const btnRent = document.getElementById('btn-rent');
const modal = document.querySelector('.modal-rent');

window.onclick = (e)=>{
    if(e.target.className == 'modal-rent'){
        modal.style.display = 'none';
    }
}

btnRent.onclick = (e)=>{
    modal.style.display = 'flex';
}

btnCansel.onclick = (e)=>{
    modal.style.display = 'none';
}