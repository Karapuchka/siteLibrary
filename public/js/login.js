const formLog = document.forms.formLog;
const errBox = document.getElementById('error-messange')

formLog.elements.btnLog.onclick = (e)=>{

    let valid = true;

    for (let i = 0; i < formLog.length; i++) {
        if(formLog[i].value == '' && formLog[i].name != 'btnLog'){
            formLog[i].style.border = '1px solid red';
            valid = false;    
        }      
    }

    if(!valid){
        e.preventDefault();
        errBox.innerText = 'Заполните все поля!';
    }
}

formLog.onclick= (e)=>{
    if(e.target.style.border == '1px solid red') return e.target.style.border = '1px solid gray';
}