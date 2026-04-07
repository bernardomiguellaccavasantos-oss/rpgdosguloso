function tab(id) {
    document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    event.currentTarget.classList.add('active');
}

function roll(s) {
    document.getElementById('d-res').innerText = Math.floor(Math.random() * s) + 1;
}

const upload = document.getElementById('map-upload');
upload.onchange = function(e) {
    const reader = new FileReader();
    reader.onload = (ev) => document.getElementById('map-img').src = ev.target.result;
    reader.readAsDataURL(e.target.files[0]);
};

function calcPts() {
    let gasto = 0;
    document.querySelectorAll('.attr').forEach(i => gasto += parseInt(i.value || 0));
    document.getElementById('pts').innerText = 37 - gasto;
}