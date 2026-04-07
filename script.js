// --- NAVEGAÇÃO ---
function tab(id) {
    document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- DADOS ---
function roll(s) {
    const res = Math.floor(Math.random() * s) + 1;
    document.getElementById('d-res').innerText = res;
}

// --- MAPA ---
const upload = document.getElementById('map-upload');
const wrapper = document.getElementById('map-wrapper');
const img = document.getElementById('map-img');

upload.onchange = function(e) {
    const reader = new FileReader();
    reader.onload = (ev) => img.src = ev.target.result;
    reader.readAsDataURL(e.target.files[0]);
};

wrapper.onclick = function(e) {
    if(e.target.id !== 'map-img') return;
    const label = prompt("Nome do local:");
    if(!label) return;
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const pin = document.createElement('div');
    pin.className = 'pin';
    pin.style.left = x + '%';
    pin.style.top = y + '%';
    pin.setAttribute('data-label', label);
    pin.oncontextmenu = (ev) => { ev.preventDefault(); pin.remove(); };
    wrapper.appendChild(pin);
};

// --- BLOCO DE NOTAS (SALVAMENTO AUTOMÁTICO) ---
const note = document.getElementById('notepad');
note.value = localStorage.getItem('rpg_notes') || "";
note.oninput = () => localStorage.setItem('rpg_notes', note.value);

// --- PERSONAGENS (37 PONTOS) ---
function calcPts() {
    let gasto = 0;
    document.querySelectorAll('.attr').forEach(i => gasto += parseInt(i.value || 0));
    const resto = 37 - gasto;
    const el = document.getElementById('pts');
    el.innerText = resto;
    el.style.color = resto < 0 ? 'red' : '#ffb703';
}

function salvarPersonagem() {
    const nome = document.getElementById('p-nome').value;
    if(!nome) return alert("Dê um nome ao herói!");
    const lista = document.getElementById('lista-personagens');
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<b>${nome}</b> - Atributos salvos. <button onclick="this.parentElement.remove()" style="float:right">X</button>`;
    lista.appendChild(div);
    // Limpa campos
    document.getElementById('p-nome').value = "";
    document.querySelectorAll('.attr').forEach(i => i.value = 0);
    calcPts();
}