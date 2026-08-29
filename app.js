const estados = [
    "Consulta nueva",
    "Información enviada",
    "Esperando cliente",
    "Esperando respuesta interna",
    "Cerrado",
    "Perdido",
    "Archivado"
];

let registros = JSON.parse(localStorage.getItem('memora_registros') || '[]');
let editando = null;
let comentariosEdicionActual = [];
let registrosUltimoFiltro = [];
let mostrandoArchivados = false;

/* ==========================================================================
   GOOGLE DRIVE API v3 - GUARDA Y RESTAURA (BIDIRECCIONAL)
   ========================================================================== */
const GOOGLE_CLIENT_ID = '766888773519-676shp6ma451vga2oe5rq3hu1ck7bhpo.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let tokenClient = null;
let googleAccessToken = localStorage.getItem('memora_gdrive_token') || null;

function inicializarGoogleDriveAPI() {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: DRIVE_SCOPE,
            callback: async (response) => {
                if (response.error !== undefined) {
                    alert("Error con Google Drive: " + response.error);
                    return;
                }
                googleAccessToken = response.access_token;
                localStorage.setItem('memora_gdrive_token', googleAccessToken);
                localStorage.setItem('memora_nube_conectado', 'true');
                
                if ($('cloudStatusText')) $('cloudStatusText').innerText = 'Conectado a Google Drive';
                alert("¡Google Drive vinculado con éxito!");
            },
        });
    }
}

function conectarServicioNube() {
    const estadoActual = localStorage.getItem('memora_nube_conectado') === 'true';
    if (estadoActual) {
        if (confirm("¿Desconectar la cuenta de Google Drive?")) {
            localStorage.setItem('memora_nube_conectado', 'false');
            localStorage.removeItem('memora_gdrive_token');
            googleAccessToken = null;
            if ($('cloudStatusText')) $('cloudStatusText').innerText = 'Sin vincular';
        }
    } else {
        if (!tokenClient) inicializarGoogleDriveAPI();
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            alert("Cargando cliente de Google, reintenta un instante...");
        }
    }
}

// 1. SUBIR A DRIVE
async function subirRespaldoADrive() {
    if (localStorage.getItem('memora_nube_conectado') !== 'true' || !googleAccessToken) {
        alert("Primero debes conectar tu cuenta de Google Drive.");
        return;
    }

    try {
        const datosBackup = JSON.stringify(registros, null, 2);
        const searchUrl = "https://www.googleapis.com/drive/v3/files?q=name%3D%27memora_backup.json%27%20and%20trashed%3Dfalse";
        
        const searchResp = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });
        
        if (searchResp.status === 401) {
            tokenClient.requestAccessToken({ prompt: '' });
            return;
        }

        const searchData = await searchResp.json();
        let fileId = (searchData.files && searchData.files.length > 0) ? searchData.files[0].id : null;

        if (fileId) {
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${googleAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: datosBackup
            });
            alert("Respaldo guardado correctamente en tu Google Drive.");
        } else {
            const metadata = { name: 'memora_backup.json', mimeType: 'application/json' };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([datosBackup], { type: 'application/json' }));

            await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${googleAccessToken}` },
                body: form
            });
            alert("Primer respaldo creado con éxito en tu Google Drive.");
        }
    } catch (err) {
        console.error("Error al subir a Drive:", err);
        alert("Error de conexión al guardar en Drive.");
    }
}

// 2. RESTAURAR DESDE DRIVE (DESCARGA RESTAURA)
async function restaurarDesdeDrive() {
    if (localStorage.getItem('memora_nube_conectado') !== 'true' || !googleAccessToken) {
        alert("Primero debes conectar tu cuenta de Google Drive.");
        return;
    }

    try {
        const searchUrl = "https://www.googleapis.com/drive/v3/files?q=name%3D%27memora_backup.json%27%20and%20trashed%3Dfalse";
        const searchResp = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });

        if (searchResp.status === 401) {
            tokenClient.requestAccessToken({ prompt: '' });
            return;
        }

        const searchData = await searchResp.json();
        let fileId = (searchData.files && searchData.files.length > 0) ? searchData.files[0].id : null;

        if (!fileId) {
            alert("No se encontró ningún archivo 'memora_backup.json' en tu Drive.");
            return;
        }

        if (confirm("¿Estás seguro de reemplazar tus registros locales con la copia respaldada en Drive?")) {
            const downloadResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { 'Authorization': `Bearer ${googleAccessToken}` }
            });

            const datosRestaurados = await downloadResp.json();
            if (Array.isArray(datosRestaurados)) {
                registros = datosRestaurados;
                guardarLocal();
                render();
                alert(`¡Restauración exitosa! Se recuperaron ${registros.length} registros.`);
            } else {
                alert("El archivo respaldado no tiene un formato válido.");
            }
        }
    } catch (err) {
        console.error("Error al restaurar desde Drive:", err);
        alert("Ocurrió un error al intentar descargar el respaldo.");
    }
}

function toggleAutoNube() {
    const val = $('chkAutoNube')?.checked ?? false;
    localStorage.setItem('memora_auto_nube', val);
}

function sincronizarAutoNube(r) {
    if (localStorage.getItem('memora_nube_conectado') === 'true' && localStorage.getItem('memora_auto_nube') === 'true') {
        subirRespaldoADrive();
    }
}

/* ==========================================================================
   EXPORTACIÓN A EXCEL NATIVO REAL (.XLSX) - FIX COMPATIBILIDAD ANDROID
   ========================================================================== */
function exportarCSVFiltrado() {
    let datosAExportar = registrosUltimoFiltro.length > 0 ? registrosUltimoFiltro : registros;
    let estadoFiltro = $('filtroEstado')?.value || $('screenTitle')?.innerText || 'Todos';
    let filtroLimpio = estadoFiltro.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    if (!filtroLimpio || filtroLimpio === 'Inicio' || filtroLimpio === 'Perfil') filtroLimpio = 'Todos';

    let nombreArchivo = `MEMORA_Reporte_Clientes_${filtroLimpio}.xlsx`;

    function clasificarContacto(canal, contacto) {
        let val = (contacto || '').trim();
        if (!val) return { telefono: '-', usuario: '-', email: '-', otro: '-' };
        let cLower = (canal || '').toLowerCase();
        
        if (cLower === 'whatsapp' || (/^[0-9+\s\-()]{7,}$/.test(val) && !val.includes('@'))) {
            return { telefono: val, usuario: '-', email: '-', otro: '-' };
        } else if (cLower === 'email' || (val.includes('@') && val.includes('.'))) {
            return { telefono: '-', usuario: '-', email: val, otro: '-' };
        } else if (cLower === 'instagram' || cLower === 'facebook' || cLower === 'telegram' || val.startsWith('@')) {
            return { telefono: '-', usuario: val, email: '-', otro: '-' };
        } else {
            return { telefono: '-', usuario: '-', email: '-', otro: val };
        }
    }

    let filas = [[
        'Doc / ID Interno',
        'Nombre del Cliente',
        'Canal',
        'Teléfono / WhatsApp',
        'Usuario (@)',
        'Correo Electrónico',
        'Estado Actual',
        'Último Comentario',
        'Total Comentarios',
        'Fecha de Registro'
    ]];

    datosAExportar.forEach(r => {
        let comentariosActivos = (r.comentarios || []).filter(c => !c.eliminado);
        let ultimoCom = comentariosActivos.length > 0 
            ? comentariosActivos[comentariosActivos.length - 1].texto.replace(/[\r\n]+/g, ' ') 
            : 'Sin comentarios';

        let d = new Date(r.fecha);
        let fechaCreacionTexto = isNaN(d.getTime()) ? r.fecha : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        let clasif = clasificarContacto(r.canal, r.contacto);

        filas.push([
            r.identificador || 'N/A',
            r.nombre || 'Sin registrar',
            r.canal || 'Otro',
            clasif.telefono,
            clasif.usuario,
            clasif.email,
            r.estado || 'Consulta nueva',
            ultimoCom,
            (r.comentarios || []).length,
            fechaCreacionTexto
        ]);
    });

    if (typeof XLSX !== 'undefined') {
        let ws = XLSX.utils.aoa_to_sheet(filas);

        let colWidths = filas[0].map((col, colIdx) => {
            let maxLen = Math.max(...filas.map(row => String(row[colIdx] || '').length));
            return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
        });
        ws['!cols'] = colWidths;

        let wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

        // Generar ArrayBuffer binario compatible con navegadores y visores móviles de Android
        let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        let blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        let a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        alert("Cargando la librería de Excel, reintenta en un instante...");
    }
}

/* ==========================================================================
   FUNCIONES GENERALES CRM Y NAVEGACIÓN
   ========================================================================== */
const $ = id => document.getElementById(id);

if ($('estado')) $('estado').innerHTML = estados.map(e => `<option>${e}</option>`).join('');
if ($('filtroEstado')) $('filtroEstado').innerHTML = '<option value="">Todos los estados</option>' + estados.map(e => `<option>${e}</option>`).join('');

function ahoraMemora() { return new Date(); }

function fechaHoraTextoFormateada(d = ahoraMemora()) {
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

function iniciarRelojHeader() {
    function actualizar() {
        const d = ahoraMemora();
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const nomDia = diasSemana[d.getDay()];
        const fechaFmt = `${nomDia} ${d.getDate()}/${d.getMonth() + 1}`;
        const horaFmt = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if ($('relojHeader')) {
            $('relojHeader').innerText = `${fechaFmt}   ${horaFmt}`;
        }
    }
    actualizar();
    setInterval(actualizar, 1000);
}

function navegarA(pantalla, customTitle = null) {
    document.querySelectorAll('.app-section').forEach(sec => sec.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    const titleMap = {
        'inicio': 'Inicio',
        'registros': 'Registros',
        'formulario': editando ? 'Editar Cliente' : 'Nuevo Cliente',
        'perfil': 'Perfil',
        'ficha': 'Ficha Cliente'
    };
    
    if ($('screenTitle')) {
        $('screenTitle').innerText = customTitle || titleMap[pantalla] || 'MEMORA';
    }

    if (pantalla === 'inicio') {
        $('sec-inicio').style.display = 'block';
        $('nav-inicio').classList.add('active');
        $('btnHeaderBack').style.display = 'none';
    } else if (pantalla === 'registros') {
        $('sec-registros').style.display = 'block';
        $('nav-registros').classList.add('active');
        $('btnHeaderBack').style.display = 'none';
    } else if (pantalla === 'formulario') {
        $('sec-formulario').style.display = 'block';
        $('btnHeaderBack').style.display = 'block';
    } else if (pantalla === 'perfil') {
        $('sec-perfil').style.display = 'block';
        $('nav-perfil').classList.add('active');
        $('btnHeaderBack').style.display = 'none';
        cargarDiagnosticoSistema();
        cargarDatosUsuarioPerfil();
    } else if (pantalla === 'ficha') {
        $('sec-ficha').style.display = 'block';
        $('btnHeaderBack').style.display = 'block';
    }
    render();
}

function obtenerAvatarEIdentidad(r) {
    const tieneNombre = r.nombre && r.nombre.trim().length > 0;
    
    if (tieneNombre) {
        const iniciales = r.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        return { avatarHTML: iniciales, tituloHTML: r.nombre };
    }
    
    let badgeText = 'CN';
    let iconName = null;
    if (r.canal === 'WhatsApp') badgeText = 'WP';
    else if (r.canal === 'Instagram') badgeText = 'INS';
    else if (r.canal === 'Email') iconName = 'alternate_email';
    else if (r.identificador) iconName = 'badge';
    else iconName = 'person';

    let avatarInner = iconName ? `<span class="material-symbols-outlined">${iconName}</span>` : badgeText;
    let contactoDestacado = r.contacto || r.identificador || 'Contacto Sin Nombre';
    
    return {
        avatarHTML: avatarInner,
        tituloHTML: `<span style="color:var(--text-primary); font-weight:600;">${contactoDestacado}</span>`
    };
}

function abrirFicha(id) {
    let r = registros.find(x => x.id === id);
    if (!r) return;

    let { avatarHTML, tituloHTML } = obtenerAvatarEIdentidad(r);
    let comentarios = r.comentarios || [];
    let ultimoComentario = comentarios.length > 0 ? comentarios[comentarios.length - 1] : null;
    let historialComentarios = comentarios.length > 1 ? comentarios.slice(0, comentarios.length - 1) : [];

    let html = `
        <div class="card" style="padding: 20px 16px;">
            <div style="display: flex; align-items: center; gap: 16px;">
                <div class="avatar avatar-blue" style="width: 56px; height: 56px; font-size: 1.1rem;">${avatarHTML}</div>
                <div>
                    <h3 style="font-size: 1.1rem;">${tituloHTML}</h3>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">${r.canal} • ${r.contacto}</p>
                    ${r.identificador ? `<p style="font-size: 0.75rem; color: var(--text-secondary);">ID / Doc: ${r.identificador}</p>` : ''}
                    <div style="margin-top: 6px;"><span class="tag tag-blue">${r.estado}</span></div>
                </div>
            </div>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <button onclick="editar(${r.id})" style="flex: 1; background-color: var(--primary-blue); color: white; border: none; padding: 10px; border-radius: 10px; font-weight: 600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; font-size:0.8rem;">
                <span class="material-symbols-outlined" style="font-size:1.1rem;">edit</span> Editar
            </button>
            <button onclick="archivarCliente(${r.id})" style="flex: 1; background-color: #E5E7EB; color: #374151; border: none; padding: 10px; border-radius: 10px; font-weight: 600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; font-size:0.8rem;">
                <span class="material-symbols-outlined" style="font-size:1.1rem;">archive</span> ${r.estado === 'Archivado' ? 'Desarchivar' : 'Archivar'}
            </button>
            <button onclick="eliminar(${r.id})" style="flex: 1; background-color: #FEE2E2; color: #DC2626; border: none; padding: 10px; border-radius: 10px; font-weight: 600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; font-size:0.8rem;">
                <span class="material-symbols-outlined" style="font-size:1.1rem;">delete</span> Eliminar
            </button>
        </div>
        <div class="section-header">
            <h3>Comentarios</h3>
        </div>
        ${ultimoComentario ? `
        <div class="card" style="padding: 14px; margin-bottom: 12px; border-left: 4px solid var(--primary-blue);">
            <div style="font-size: 0.75rem; color: var(--primary-blue); font-weight:700; margin-bottom: 4px;">ÚLTIMO COMENTARIO</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px;">
                ${ultimoComentario.fecha} ${ultimoComentario.editado ? `<span style="color:#D97706;"> (Editado el ${ultimoComentario.editado})</span>` : ''}
            </div>
            <p style="font-size: 0.9rem; font-weight: 500; ${ultimoComentario.eliminado ? 'color: var(--text-secondary); font-style: italic;' : ''}">${ultimoComentario.texto}</p>
        </div>` : '<p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:12px;">Sin comentarios registrados.</p>'}
        ${historialComentarios.length > 0 ? `
        <h4 style="font-size: 0.85rem; color: var(--text-secondary); margin: 12px 0 8px 0;">Historial anterior</h4>
        ${historialComentarios.map(c => `
            <div class="card" style="padding: 10px; margin-bottom: 8px; background-color:#FAFAFA;">
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px;">
                    ${c.fecha} ${c.editado ? `<span style="color:#D97706;"> (Editado el ${c.editado})</span>` : ''}
                </div>
                <p style="font-size: 0.85rem; ${c.eliminado ? 'color: var(--text-secondary); font-style: italic;' : ''}">${c.texto}</p>
            </div>
        `).join('')}
        ` : ''}
    `;
    $('contenidoFicha').innerHTML = html;
    navegarA('ficha');
}

function archivarCliente(id) {
    let r = registros.find(x => x.id === id);
    if (!r) return;
    if (r.estado === 'Archivado') {
        r.estado = 'Consulta nueva';
        alert('Cliente desarchivado y enviado a Consulta nueva.');
    } else {
        r.estado = 'Archivado';
        alert('Cliente archivado con éxito.');
    }
    r.ultimaModificacion = ahoraMemora().toISOString();
    guardarLocal();
    navegarA('registros');
}

function alternarVistaArchivados() {
    mostrandoArchivados = !mostrandoArchivados;
    if ($('filtroEstado')) $('filtroEstado').value = '';
    render();
}

function mostrarCanal() {
    let c = $('canal').value;
    let nombres = { 
        WhatsApp: 'Teléfono / WhatsApp', 
        Instagram: 'Usuario Instagram (@usuario)', 
        Email: 'Correo electrónico', 
        Facebook: 'Usuario Facebook', 
        Telegram: 'Teléfono / Usuario Telegram', 
        Otro: 'Dato de contacto' 
    };
    $('campoCanal').innerHTML = `<label style="font-size: 0.8rem; color: var(--text-secondary);">${nombres[c] || 'Contacto'}</label><input id="contacto" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">`;
}

function mostrarId() {
    let t = $('tipoId').value;
    $('campoId').innerHTML = t === 'Ninguno' ? '' : `<label style="font-size: 0.8rem; color: var(--text-secondary);">${t}</label><input id="valorId" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">`;
}

function prepararNuevoRegistro() {
    limpiar();
    navegarA('formulario');
}

function agregarComentarioFormulario() {
    let txt = $('comentario').value.trim();
    if (!txt) return;
    comentariosEdicionActual.push({
        texto: txt,
        fecha: fechaHoraTextoFormateada(),
        editado: null,
        eliminado: false
    });
    $('comentario').value = '';
    renderListaComentariosEdicion();
}

function editarComentarioTexto(index) {
    let actual = comentariosEdicionActual[index];
    if (actual.eliminado) return;
    let nuevoTexto = prompt("Editar comentario:", actual.texto);
    if (nuevoTexto !== null && nuevoTexto.trim() !== "") {
        comentariosEdicionActual[index].texto = nuevoTexto.trim();
        comentariosEdicionActual[index].editado = fechaHoraTextoFormateada();
        renderListaComentariosEdicion();
    }
}

function borrarComentarioTexto(index) {
    if (confirm("¿Marcar este comentario como eliminado?")) {
        const fechaHora = fechaHoraTextoFormateada();
        comentariosEdicionActual[index].texto = `Se ha eliminado este comentario (${fechaHora})`;
        comentariosEdicionActual[index].eliminado = true;
        renderListaComentariosEdicion();
    }
}

function renderListaComentariosEdicion() {
    let container = $('listaComentariosEdicion');
    if (!container) return;
    if (comentariosEdicionActual.length === 0) {
        container.innerHTML = '<p style="font-size:0.75rem; color:var(--text-secondary);">No hay comentarios adjuntos.</p>';
        return;
    }
    container.innerHTML = comentariosEdicionActual.map((c, i) => `
        <div class="card" style="padding:10px; margin-top:6px; font-size:0.8rem; background:#F9FAFB; border:1px solid #E5E7EB;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.7rem; color:var(--text-secondary);">
                <span>${c.fecha} ${c.editado ? `<strong style="color:#D97706;">(Editado el ${c.editado})</strong>` : ''}</span>
                ${!c.eliminado ? `
                <div>
                    <a href="#" onclick="editarComentarioTexto(${i}); return false;" style="color:var(--primary-blue); margin-right:8px; text-decoration:none;">Editar</a>
                    <a href="#" onclick="borrarComentarioTexto(${i}); return false;" style="color:#DC2626; text-decoration:none;">Eliminar</a>
                </div>` : ''}
            </div>
            <div style="font-weight:500; ${c.eliminado ? 'color:var(--text-secondary); font-style:italic;' : ''}">${c.texto}</div>
        </div>
    `).join('');
}

function guardar() {
    const contacto = $('contacto')?.value.trim() || '';
    if (!contacto) { alert('Completa el dato de contacto del canal.'); return; }

    let viejo = registros.find(r => r.id === editando);
    let r = {
        id: editando || Date.now(),
        nombre: $('nombre').value ? $('nombre').value.trim() : '',
        canal: $('canal').value,
        contacto,
        identificador: $('valorId')?.value || '',
        estado: $('estado').value,
        comentarios: [...comentariosEdicionActual],
        fecha: viejo?.fecha || ahoraMemora().toISOString(),
        ultimaModificacion: ahoraMemora().toISOString()
    };

    if (viejo) {
        registros = registros.map(x => x.id === r.id ? r : x);
    } else {
        registros.push(r);
    }
    
    guardarLocal();
    sincronizarAutoNube(r);
    limpiar();
    navegarA('registros');
}

function limpiar() {
    ['nombre', 'comentario'].forEach(x => { if ($(x)) $(x).value = ''; });
    if ($('tipoId')) $('tipoId').value = 'Ninguno';
    mostrarId();
    if ($('estado')) $('estado').value = estados[0];
    editando = null;
    comentariosEdicionActual = [];
    renderListaComentariosEdicion();
    mostrarCanal();
}

function editar(id) {
    let r = registros.find(x => x.id === id);
    if (!r) return;
    editando = id;
    $('nombre').value = r.nombre || '';
    $('canal').value = r.canal;
    mostrarCanal();
    $('contacto').value = r.contacto;
    $('estado').value = r.estado;
    if ($('tipoId')) $('tipoId').value = r.identificador ? 'ID Interno' : 'Ninguno';
    mostrarId();
    if ($('valorId')) $('valorId').value = r.identificador || '';
    
    comentariosEdicionActual = JSON.parse(JSON.stringify(r.comentarios || []));
    renderListaComentariosEdicion();
    navegarA('formulario');
}

function eliminar(id) {
    if (confirm("¿Estás seguro de eliminar este registro permanentemente?")) {
        registros = registros.filter(x => x.id !== id);
        guardarLocal();
        navegarA('registros');
    }
}

function tarjetaEstetica(r) {
    const d = new Date(r.fecha);
    let fechaFmt = r.fecha;
    let horaFmt = '';
    if (!isNaN(d.getTime())) {
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const anio = d.getFullYear();
        const hora = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        fechaFmt = `${dia}/${mes}/${anio}`;
        horaFmt = `Creado a las ${hora}:${min}`;
    }

    const { avatarHTML, tituloHTML } = obtenerAvatarEIdentidad(r);
    const ultimoComentario = (r.comentarios && r.comentarios.length > 0) ? r.comentarios[r.comentarios.length - 1] : null;

    return `
    <div class="card client-card" style="margin-bottom: 12px; cursor:pointer;" onclick="abrirFicha(${r.id})">
        <div class="client-info">
            <div class="avatar avatar-blue">${avatarHTML}</div>
            <div class="client-details">
                <h4>${tituloHTML}</h4>
                <div class="client-sub">${r.canal} • ${r.contacto} ${r.identificador ? ' | ID: ' + r.identificador : ''}</div>
            </div>
            <div class="time-ago" style="display:flex; flex-direction:column; align-items:flex-end;">
                <span style="font-weight:600; color:var(--text-primary);">${fechaFmt}</span>
                <span style="font-size:0.65rem; color:var(--text-secondary);">${horaFmt}</span>
            </div>
        </div>
        <div class="tag-row"><span class="tag tag-blue">${r.estado}</span></div>
        ${ultimoComentario ? `
        <div class="alert-box" style="background-color: #F3F4F6; color: var(--text-primary);">
            <span class="material-symbols-outlined">chat</span>
            <div>
                <strong>Último comentario:</strong> ${ultimoComentario.editado ? `<small style="color:#D97706;">(Editado el ${ultimoComentario.editado})</small>` : ''}<br>
                <span style="${ultimoComentario.eliminado ? 'font-style:italic; color:var(--text-secondary);' : ''}">${ultimoComentario.texto}</span>
            </div>
        </div>` : ''}
    </div>`;
}

function render() {
    procesarAutoArchivado();
    actualizarKPIs();
    actualizarSeguimiento();
    actualizarMetricsInicio();

    let busqueda = $('busquedaRapida')?.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
    let nombre = $('filtroNombre')?.value.toLowerCase() || '';
    let canal = $('filtroCanal')?.value || '';
    let dato = $('filtroDato')?.value.toLowerCase() || '';
    let ident = $('filtroId')?.value.toLowerCase() || '';
    let estado = $('filtroEstado')?.value || '';
    let com = $('filtroComentario')?.value.toLowerCase() || '';

    registrosUltimoFiltro = registros.filter(r => {
        let esArchiv = r.estado === 'Archivado';
        
        if (mostrandoArchivados) {
            if (!esArchiv) return false;
        } else {
            if (esArchiv) return false;
        }

        let matchBusqueda = !busqueda || JSON.stringify(r).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(busqueda);
        let matchNombre = !nombre || (r.nombre || '').toLowerCase().includes(nombre);
        let matchCanal = !canal || r.canal === canal;
        let matchDato = !dato || (r.contacto || '').toLowerCase().includes(dato);
        let matchIdent = !ident || (r.identificador || '').toLowerCase().includes(ident);
        let matchEstado = !estado || r.estado === estado;
        let matchCom = !com || JSON.stringify(r.comentarios || []).toLowerCase().includes(com);

        return matchBusqueda && matchNombre && matchCanal && matchDato && matchIdent && matchEstado && matchCom;
    });

    if ($('listaRegistros')) {
        $('listaRegistros').innerHTML = registrosUltimoFiltro.map(tarjetaEstetica).join('') || '<p style="text-align:center; padding:20px; color:var(--text-secondary);">No se encontraron registros.</p>';
    }

    if ($('totalRegistrosTexto')) {
        $('totalRegistrosTexto').innerText = `${registrosUltimoFiltro.length} registros ${mostrandoArchivados ? '(Archivados)' : ''}`;
    }

    if ($('btnVerArchivados')) {
        $('btnVerArchivados').innerText = mostrandoArchivados ? 'Ver Activos' : 'Ver Archivados';
        $('btnVerArchivados').style.background = mostrandoArchivados ? '#E5E7EB' : '#F3F4F6';
    }
}

function actualizarKPIs() {
    if ($('kpi-consulta')) $('kpi-consulta').innerText = registros.filter(r => r.estado === 'Consulta nueva').length;
    if ($('kpi-info')) $('kpi-info').innerText = registros.filter(r => r.estado === 'Información enviada').length;
    if ($('kpi-esperando')) $('kpi-esperando').innerText = registros.filter(r => r.estado === 'Esperando cliente').length;
    if ($('kpi-resp-interna')) $('kpi-resp-interna').innerText = registros.filter(r => r.estado === 'Esperando respuesta interna').length;
    if ($('kpi-cerrado')) $('kpi-cerrado').innerText = registros.filter(r => r.estado === 'Cerrado').length;
    if ($('kpi-perdido')) $('kpi-perdido').innerText = registros.filter(r => r.estado === 'Perdido').length;
    if ($('kpi-archivado')) $('kpi-archivado').innerText = registros.filter(r => r.estado === 'Archivado').length;
}

function actualizarMetricsInicio() {
    const activos = registros.filter(r => r.estado !== 'Archivado' && r.estado !== 'Perdido').length;
    const ahora = ahoraMemora();
    const creadosMes = registros.filter(r => {
        const d = new Date(r.fecha);
        return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
    }).length;

    const conteoCanales = {};
    registros.forEach(r => { conteoCanales[r.canal] = (conteoCanales[r.canal] || 0) + 1; });
    let canalTop = '-';
    let max = 0;
    for (let c in conteoCanales) {
        if (conteoCanales[c] > max) { max = conteoCanales[c]; canalTop = c; }
    }

    if ($('dash-activos')) $('dash-activos').innerText = activos;
    if ($('dash-mes')) $('dash-mes').innerText = creadosMes;
    if ($('dash-canal')) $('dash-canal').innerText = canalTop;
}

function filtrarPorEstadoKPI(est) {
    mostrandoArchivados = (est === 'Archivado');
    if ($('filtroEstado')) $('filtroEstado').value = est === 'Archivado' ? '' : est;
    navegarA('registros', est);
}

function obtenerConfigSeguimiento() {
    const valor = parseInt(localStorage.getItem('memora_seg_valor') || '3');
    const unidad = localStorage.getItem('memora_seg_unidad') || 'dias';
    return { valor, unidad };
}

function guardarConfigSeguimiento() {
    const valor = parseInt($('cfgSegValor')?.value || '3');
    const unidad = $('cfgSegUnidad')?.value || 'dias';
    
    localStorage.setItem('memora_seg_valor', valor);
    localStorage.setItem('memora_seg_unidad', unidad);
    alert("¡Configuración de seguimiento actualizada!");
    render();
}

function actualizarSeguimiento() {
    let ahora = ahoraMemora();
    let config = obtenerConfigSeguimiento();
    let horasLimite = config.unidad === 'horas' ? config.valor : config.valor * 24;

    if ($('textoBannerSeguimiento')) {
        let tiempoTexto = config.unidad === 'horas' ? `${config.valor} hora(s)` : `${config.valor} día(s)`;
        $('textoBannerSeguimiento').innerHTML = `MEMORA administra automáticamente a los clientes que llevan <strong>${tiempoTexto} o más sin gestión</strong>. Si un registro no se ha actualizado y no está en <em>Cerrado, Perdido o Archivado</em>, aparecerá abajo para tu revisión.`;
    }

    let lista = registros.filter(r => {
        let horasTranscurridas = (ahora - new Date(r.fecha)) / (1000 * 60 * 60);
        return horasTranscurridas >= horasLimite && r.estado !== "Cerrado" && r.estado !== "Perdido" && r.estado !== "Archivado";
    });

    if ($('contadorSeguimiento')) $('contadorSeguimiento').innerText = lista.length;
    if ($('contenedorSeguimiento')) {
        $('contenedorSeguimiento').innerHTML = lista.map(r => {
            let horasTranscurridas = (ahora - new Date(r.fecha)) / (1000 * 60 * 60);
            let tiempoTranscurridosTexto = config.unidad === 'horas' 
                ? `Hace ${Math.floor(horasTranscurridas)} horas` 
                : `Hace ${Math.floor(horasTranscurridas / 24)} días`;
            let { avatarHTML, tituloHTML } = obtenerAvatarEIdentidad(r);

            return `
            <div class="card client-card" onclick="abrirFicha(${r.id})" style="cursor:pointer;">
                <div class="client-info">
                    <div class="avatar avatar-blue">${avatarHTML}</div>
                    <div class="client-details">
                        <h4>${tituloHTML}</h4>
                        <div class="client-sub">${r.canal} • ${r.contacto}</div>
                    </div>
                </div>
                <div class="alert-box alert-orange" style="margin-top:10px;">
                    <span class="material-symbols-outlined">schedule</span>
                    <span>${tiempoTranscurridosTexto} que entró este cliente y requiere revisión.</span>
                </div>
            </div>`;
        }).join('') || '<p style="font-size:0.8rem; color:var(--text-secondary);">Sin seguimientos pendientes.</p>';
    }
}

function toggleModalConfigUser() {
    const modal = $('modalConfigAdmin');
    if (modal) {
        modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
    }
}

function guardarDatosUsuarioAdmin() {
    const datos = {
        rolAdmin: $('cfgAdminRol')?.value.trim() || 'Usuario Administrador',
        nombreAdmin: $('cfgAdminNombre')?.value.trim() || '',
        cedulaAdmin: $('cfgAdminCedula')?.value.trim() || '',
        empresaAdmin: $('cfgAdminEmpresa')?.value.trim() || '',
        whatsappAdmin: $('cfgAdminWhatsapp')?.value.trim() || ''
    };
    localStorage.setItem('memora_admin_user_data', JSON.stringify(datos));
    cargarDatosUsuarioPerfil();
    toggleModalConfigUser();
    alert("¡Perfil actualizado con éxito!");
}

function cargarDatosUsuarioPerfil() {
    const datosRaw = localStorage.getItem('memora_admin_user_data');
    const datos = datosRaw ? JSON.parse(datosRaw) : {
        rolAdmin: 'Usuario Administrador',
        nombreAdmin: 'Juan',
        cedulaAdmin: '48907555',
        empresaAdmin: 'Los tres locos',
        whatsappAdmin: '099 777 777'
    };

    if ($('perfilRolAdmin')) $('perfilRolAdmin').innerText = datos.rolAdmin || 'Usuario Administrador';

    let htmlLista = '';
    if (datos.nombreAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">Nombre:</span> <span class="perfil-valor">${datos.nombreAdmin}</span></div>`;
    if (datos.cedulaAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">Documento / C.I.:</span> <span class="perfil-valor">${datos.cedulaAdmin}</span></div>`;
    if (datos.empresaAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">Empresa:</span> <span class="perfil-valor">${datos.empresaAdmin}</span></div>`;
    if (datos.whatsappAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">Contacto / WA:</span> <span class="perfil-valor">${datos.whatsappAdmin}</span></div>`;

    if ($('perfilDatosLista')) {
        $('perfilDatosLista').innerHTML = htmlLista || '<p style="font-size:0.8rem; color:var(--text-secondary);">Sin datos adicionales cargados.</p>';
    }

    if ($('cfgAdminRol')) $('cfgAdminRol').value = datos.rolAdmin || 'Usuario Administrador';
    if ($('cfgAdminNombre')) $('cfgAdminNombre').value = datos.nombreAdmin || '';
    if ($('cfgAdminCedula')) $('cfgAdminCedula').value = datos.cedulaAdmin || '';
    if ($('cfgAdminEmpresa')) $('cfgAdminEmpresa').value = datos.empresaAdmin || '';
    if ($('cfgAdminWhatsapp')) $('cfgAdminWhatsapp').value = datos.whatsappAdmin || '';

    const cfgSeg = obtenerConfigSeguimiento();
    if ($('cfgSegValor')) $('cfgSegValor').value = cfgSeg.valor;
    if ($('cfgSegUnidad')) $('cfgSegUnidad').value = cfgSeg.unidad;
}

function exportarPDFFiltrado() {
    let datosAExportar = registrosUltimoFiltro.length > 0 ? registrosUltimoFiltro : registros;
    let ventana = window.open('', '_blank');
    let contenido = `<html><head><title>Reporte MEMORA</title></head><body><h1>MEMORA - Reporte (${datosAExportar.length} Registros)</h1><p>Fecha: ${ahoraMemora().toLocaleString()}</p>`;
    datosAExportar.forEach(r => {
        contenido += `<hr><b>${r.nombre || r.contacto}</b><br>Contacto: ${r.canal} - ${r.contacto}<br>Estado: ${r.estado}<br>`;
        contenido += `Comentarios:<br>${(r.comentarios || []).map(c => `- ${c.texto}`).join('<br>')}<br>`;
    });
    contenido += '</body></html>';
    ventana.document.write(contenido);
    ventana.print();
}

function procesarAutoArchivado() {
    const autoActivo = localStorage.getItem('memora_auto_archivar') === 'true';
    if (!autoActivo) return;

    const ahora = ahoraMemora();
    let modificado = false;
    registros.forEach(r => {
        if (r.estado === 'Cerrado' || r.estado === 'Perdido') {
            let dias = Math.floor((ahora - new Date(r.ultimaModificacion || r.fecha)) / (1000 * 60 * 60 * 24));
            if (dias >= 30) {
                r.estado = 'Archivado';
                modificado = true;
            }
        }
    });
    if (modificado) guardarLocal();
}

function guardarConfigAutoArchivar() {
    const valor = $('chkAutoArchivar')?.checked ?? false;
    localStorage.setItem('memora_auto_archivar', valor);
    render();
}

function cargarDiagnosticoSistema() {
    const ua = navigator.userAgent;
    let dev = "Escritorio";
    if (/android/i.test(ua)) dev = "Android Mobile";
    else if (/iphone|ipad/i.test(ua)) dev = "iOS Mobile";

    let nav = "Desconocido";
    if (ua.includes("Chrome")) nav = "Google Chrome";
    else if (ua.includes("Firefox")) nav = "Mozilla Firefox";
    else if (ua.includes("Safari")) nav = "Apple Safari";

    const storageBytes = new Blob([localStorage.getItem('memora_registros') || '']).size;
    const storageKB = (storageBytes / 1024).toFixed(2);

    if ($('sys-device')) $('sys-device').innerText = dev;
    if ($('sys-browser')) $('sys-browser').innerText = nav;
    if ($('sys-storage')) $('sys-storage').innerText = `${storageKB} KB`;

    if ($('chkAutoArchivar')) $('chkAutoArchivar').checked = localStorage.getItem('memora_auto_archivar') === 'true';
    if ($('chkAutoNube')) $('chkAutoNube').checked = localStorage.getItem('memora_auto_nube') === 'true';
    if ($('cloudStatusText')) $('cloudStatusText').innerText = localStorage.getItem('memora_nube_conectado') === 'true' ? 'Conectado a Google Drive' : 'Sin vincular';
}

function forzarLimpiezaCachePWA() {
    if ('caches' in window) {
        caches.keys().then(names => {
            for (let name of names) caches.delete(name);
        });
        alert("Caché borrada con éxito. Recargando la aplicación...");
        window.location.reload(true);
    }
}

function guardarLocal() { 
    localStorage.setItem('memora_registros', JSON.stringify(registros)); 
}

function exportarJSON() { 
    descargar(JSON.stringify(registros, null, 2), 'memora.json', 'application/json'); 
}

function descargar(c, n, t) {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([c], { type: t }));
    a.download = n;
    a.click();
}

function toggleFiltroAvanzado() {
    const f = document.getElementById('filtroAvanzado');
    if (f) { f.style.display = f.style.display === 'none' ? 'block' : 'none'; }
}

window.addEventListener('online', () => {
    if ($('netStatus')) $('netStatus').innerHTML = '<span class="status-dot"></span><span class="status-text">Online</span>';
});

window.addEventListener('offline', () => {
    if ($('netStatus')) $('netStatus').innerHTML = '<span class="status-dot offline"></span><span class="status-text">Offline</span>';
});

document.addEventListener('DOMContentLoaded', () => {
    iniciarRelojHeader();
    mostrarCanal();
    cargarDatosUsuarioPerfil();
    render();
    setTimeout(inicializarGoogleDriveAPI, 1000);
});
