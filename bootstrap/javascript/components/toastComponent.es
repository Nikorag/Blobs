class ToastComponent {
    constructor(){
        jQuery('.toast').toast();
    }

    show(title, body){
        var clazz = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); //Create random UUID
        document.getElementById("toastComponent").innerHTML += `<div class="${clazz} toast" role="alert" aria-live="assertive" aria-atomic="true" data-delay="6000">
            <div class="toast-header">
                <strong class="mr-auto">${title}</strong>
                <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="toast-body">
                ${body}
            </div>
        </div>`
        jQuery('.'+clazz).toast({});
        jQuery('.'+clazz).toast('show');
        jQuery('.'+clazz).on('hidden.bs.toast', ()=> {
            var thisToast = document.getElementsByClassName(clazz)[0];
            thisToast.parentElement.removeChild(thisToast);
        });
    }
}

let toastComponent = new ToastComponent();

function showToast(title, body){
    toastComponent.show(title,body);
}


