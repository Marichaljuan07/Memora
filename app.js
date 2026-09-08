/* ==========================================================================
   MEMORA CRM - CORE LOGIC (v1.3.0 - CONSOLIDADO Y COMPLETO)
   ========================================================================== */

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
let comentariosTemporalesInicio = [];
let registrosUltimoFiltro = [];
let mostrandoArchivados = false;
let contactoOriginalBackup = "";
let currentStoryStep = 0;

let canalesExtraContadorInicio = 0;
let canalesExtraContadorMovil = 0;

const $ = id => document.getElementById(id);

function ahoraMemora() {
    return new Date();
}

function fechaHoraTextoFormateada(d = ahoraMemora()) {
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

/* ==========================================================================
   1. SISTEMA DE MODALES Y ALERTAS VISUALES
   ========================================================================== */
let callbackAvisoGlobal = null;
let callbackConfirmGlobal = null;
let callbackPromptGlobal = null;

function mostrarAvisoMemora(mensaje, titulo = "MEMORA", icono = "check_circle", callback = null) {
    if ($('avisoMemoraTexto')) $('avisoMemoraTexto').innerText = mensaje;
    if ($('avisoMemoraTitulo')) $('avisoMemoraTitulo').innerText = titulo;
    if ($('avisoMemoraIcono')) $('avisoMemoraIcono').innerText = icono;
    
    if (icono === 'error' || icono === 'cancel') {
        if ($('avisoMemoraIcono')) $('avisoMemoraIcono').style.color = '#EF4444';
    } else if (icono === 'warning' || icono === 'schedule') {
        if ($('avisoMemoraIcono')) $('avisoMemoraIcono').style.color = '#FB8C00';
    } else {
        if ($('avisoMemoraIcono')) $('avisoMemoraIcono').style.color = '#004F87';
    }
    
    callbackAvisoGlobal = callback;
    if ($('modalAvisoMemora')) $('modalAvisoMemora').style.display = 'flex';
}

function mostrarToastPC(mensaje, icono = "edit") {
    let toast = document.getElementById('toastMemoraPC');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastMemoraPC';
        toast.className = 'toast-memora-pc';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="material-symbols-outlined">${icono}</span> <span>${mensaje}</span>`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
}

function cerrarAvisoMemora() {
    if ($('modalAvisoMemora')) $('modalAvisoMemora').style.display = 'none';
    if (typeof callbackAvisoGlobal === 'function') {
        callbackAvisoGlobal();
        callbackAvisoGlobal = null;
    }
}

function cerrarBannerAviso() {
    const banner = document.getElementById('bannerSeguimientoAviso');
    if (banner) banner.style.display = 'none';
}

function mostrarConfirmMemora(mensaje, titulo = "¿Es seguro?", icono = "help_outline", colorBoton = "#DC2626", callback = null) {
    if ($('confirmMemoraTexto')) $('confirmMemoraTexto').innerText = mensaje;
    if ($('confirmMemoraTitulo')) $('confirmMemoraTitulo').innerText = titulo;
    if ($('confirmMemoraIcono')) $('confirmMemoraIcono').innerText = icono;
    if ($('confirmMemoraBtnAceptar')) $('confirmMemoraBtnAceptar').style.background = colorBoton;
    
    callbackConfirmGlobal = callback;
    if ($('modalConfirmMemora')) $('modalConfirmMemora').style.display = 'flex';
}

function responderConfirmMemora(respuesta) {
    if ($('modalConfirmMemora')) $('modalConfirmMemora').style.display = 'none';
    if (typeof callbackConfirmGlobal === 'function') {
        callbackConfirmGlobal(respuesta);
        callbackConfirmGlobal = null;
    }
}

function mostrarPromptMemora(mensaje, valorInicial = "", titulo = "Editar información", callback = null) {
    if ($('promptMemoraTexto')) $('promptMemoraTexto').innerText = mensaje;
    if ($('promptMemoraTitulo')) $('promptMemoraTitulo').innerText = titulo;
    if ($('promptMemoraInput')) $('promptMemoraInput').value = valorInicial;
    
    callbackPromptGlobal = callback;
    if ($('modalPromptMemora')) $('modalPromptMemora').style.display = 'flex';
    setTimeout(() => $('promptMemoraInput')?.focus(), 150);
}

function responderPromptMemora(valor) {
    if ($('modalPromptMemora')) $('modalPromptMemora').style.display = 'none';
    if (typeof callbackPromptGlobal === 'function') {
        callbackPromptGlobal(valor);
        callbackPromptGlobal = null;
    }
}

/* ==========================================================================
   2. GOOGLE DRIVE API v3
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
                    mostrarAvisoMemora("Error con Google Drive: " + response.error, "Google Drive", "error");
                    return;
                }
                googleAccessToken = response.access_token;
                localStorage.setItem('memora_gdrive_token', googleAccessToken);
                localStorage.setItem('memora_nube_conectado', 'true');
                
                if ($('cloudStatusText')) $('cloudStatusText').innerText = 'Conectado a Google Drive';
                mostrarAvisoMemora("¡Google Drive vinculado con éxito!", "Google Drive", "cloud_done");
            },
        });
    }
}

function conectarServicioNube() {
    const estadoActual = localStorage.getItem('memora_nube_conectado') === 'true';
    if (estadoActual) {
        mostrarConfirmMemora("¿Deseas desconectar la cuenta de Google Drive?", "Google Drive", "cloud_off", "#004F87", (confirmado) => {
            if (confirmado) {
                localStorage.setItem('memora_nube_conectado', 'false');
                localStorage.removeItem('memora_gdrive_token');
                googleAccessToken = null;
                if ($('cloudStatusText')) $('cloudStatusText').innerText = 'Sin vincular';
                mostrarAvisoMemora("Cuenta de Google Drive desconectada.", "Google Drive", "info");
            }
        });
    } else {
        if (!tokenClient) inicializarGoogleDriveAPI();
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            mostrarAvisoMemora("Cargando cliente de Google, reintenta un instante...", "Google Drive", "schedule");
        }
    }
}

async function subirRespaldoADrive() {
    if (localStorage.getItem('memora_nube_conectado') !== 'true' || !googleAccessToken) {
        mostrarAvisoMemora("Primero debes conectar tu cuenta de Google Drive.", "Google Drive", "warning");
        return;
    }
    try {
        const datosBackup = JSON.stringify(registros, null, 2);
        const searchUrl = "https://www.googleapis.com/drive/v3/files?q=name%3D%27memora_backup.json%27%20and%20trashed%3Dfalse";
        
        const searchResp = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });
        
        if (searchResp.status === 401) {
            if (tokenClient) tokenClient.requestAccessToken({ prompt: '' });
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
            mostrarAvisoMemora("Respaldo guardado correctamente en tu Google Drive.", "Google Drive", "cloud_done");
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
            mostrarAvisoMemora("Primer respaldo creado con éxito en tu Google Drive.", "Google Drive", "cloud_done");
        }
    } catch (err) {
        console.error("Error al subir a Drive:", err);
        mostrarAvisoMemora("Error de conexión al guardar en Drive.", "Google Drive", "error");
    }
}

async function restaurarDesdeDrive() {
    if (localStorage.getItem('memora_nube_conectado') !== 'true' || !googleAccessToken) {
        mostrarAvisoMemora("Primero debes conectar tu cuenta de Google Drive.", "Google Drive", "warning");
        return;
    }
    try {
        const searchUrl = "https://www.googleapis.com/drive/v3/files?q=name%3D%27memora_backup.json%27%20and%20trashed%3Dfalse";
        const searchResp = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });
        if (searchResp.status === 401) {
            if (tokenClient) tokenClient.requestAccessToken({ prompt: '' });
            return;
        }
        const searchData = await searchResp.json();
        let fileId = (searchData.files && searchData.files.length > 0) ? searchData.files[0].id : null;
        if (!fileId) {
            mostrarAvisoMemora("No se encontró ningún archivo 'memora_backup.json' en tu Drive.", "Google Drive", "warning");
            return;
        }
        mostrarConfirmMemora("¿Es seguro de reemplazar tus registros locales con la copia respaldada en Drive?", "Restaurar Copia", "cloud_download", "#004F87", async (confirmado) => {
            if (confirmado) {
                const downloadResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                    headers: { 'Authorization': `Bearer ${googleAccessToken}` }
                });
                const datosRestaurados = await downloadResp.json();
                if (Array.isArray(datosRestaurados)) {
                    registros = datosRestaurados;
                    guardarLocal();
                    render();
                    mostrarAvisoMemora(`¡Restauración exitosa! Se recuperaron ${registros.length} registros.`, "Google Drive", "check_circle");
                } else {
                    mostrarAvisoMemora("El archivo respaldado no tiene un formato válido.", "Google Drive", "error");
                }
            }
        });
    } catch (err) {
        console.error("Error al restaurar desde Drive:", err);
        mostrarAvisoMemora("Ocurrió un error al intentar descargar el respaldo.", "Google Drive", "error");
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
   3. SEGUIMIENTO PERSONALIZADO Y CONFIGURACIONES
   ========================================================================== */
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
    mostrarAvisoMemora("Configuración de seguimiento actualizada correctamente.", "Seguimiento", "tune");
    render();
}

function formatearTiempoAtraso(horasTotales) {
    let hs = Math.floor(horasTotales);
    if (hs < 24) {
        return `${hs} hs de atraso`;
    }
    let dias = Math.floor(hs / 24);
    let hsRestantes = hs % 24;
    
    if (hsRestantes === 0) {
        return `${dias} día(s) de atraso`;
    }
    return `${dias} día(s) y ${hsRestantes} hs de atraso`;
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
        let horasTranscurridas = (ahora - new Date(r.ultimaModificacion || r.fecha)) / (1000 * 60 * 60);
        return horasTranscurridas >= horasLimite && r.estado !== "Cerrado" && r.estado !== "Perdido" && r.estado !== "Archivado";
    });

    if ($('contadorSeguimiento')) $('contadorSeguimiento').innerText = lista.length;

    if ($('contenedorSeguimiento')) {
        const esPC = window.innerWidth >= 800;
        $('contenedorSeguimiento').innerHTML = lista.map(r => {
            let horasTranscurridas = (ahora - new Date(r.ultimaModificacion || r.fecha)) / (1000 * 60 * 60);
            let textoAtraso = formatearTiempoAtraso(horasTranscurridas);
            
            // Semaforización elegante vía Chip (sin romper el fondo blanco)
            let esUrgenciaCritica = horasTranscurridas >= (horasLimite * 2);
            let colorChipBg = esUrgenciaCritica ? '#FEE2E2' : '#FEF3C7';
            let colorChipText = esUrgenciaCritica ? '#991B1B' : '#92400E';

            let dCreacion = new Date(r.fecha);
            let dModif = new Date(r.ultimaModificacion || r.fecha);
            
            let fechaCreacionTexto = !isNaN(dCreacion.getTime()) 
                ? `${String(dCreacion.getDate()).padStart(2, '0')}/${String(dCreacion.getMonth() + 1).padStart(2, '0')}/${dCreacion.getFullYear()} ${String(dCreacion.getHours()).padStart(2, '0')}:${String(dCreacion.getMinutes()).padStart(2, '0')}` 
                : r.fecha;

            let fechaRevisionTexto = !isNaN(dModif.getTime()) 
                ? `${String(dModif.getDate()).padStart(2, '0')}/${String(dModif.getMonth() + 1).padStart(2, '0')}/${dModif.getFullYear()} ${String(dModif.getHours()).padStart(2, '0')}:${String(dModif.getMinutes()).padStart(2, '0')}` 
                : '-';

            let { avatarHTML, tituloHTML } = obtenerAvatarEIdentidad(r);
            let btnCanal = obtenerBotonAccionCanal(r);
            let accionClick = esPC ? `editar(${r.id})` : `abrirFicha(${r.id})`;

            return `
            <div class="card client-card" onclick="${accionClick}" style="cursor:pointer; background:#ffffff;">
                <div class="client-info">
                    <div class="avatar avatar-blue">${avatarHTML}</div>
                    <div class="client-details">
                        <h4>${tituloHTML}</h4>
                        <div class="client-sub">${r.canal} • ${r.contacto}</div>
                    </div>
                </div>
                <div>${r.asunto ? `<span style="font-size:0.8rem; font-weight:600; color:var(--primary-blue);">Asunto: ${r.asunto}</span>` : '-'}</div>
                <div class="tag-row"><span class="tag ${obtenerClaseEstado(r.estado)}">${r.estado}</span></div>
                <div style="font-size:0.72rem; color:var(--text-secondary); line-height: 1.5;">
                    <span>Creado: <strong>${fechaCreacionTexto}</strong></span><br>
                    <span>Última rev: <strong>${fechaRevisionTexto}</strong></span>
                </div>
                <div style="margin-top: 6px;">
                    <span style="display:inline-block; background:${colorChipBg}; color:${colorChipText}; font-size:0.72rem; font-weight:700; padding:3px 8px; border-radius:6px;">
                        ⚠️ ${textoAtraso}
                    </span>
                </div>
                <div style="display:flex; gap:6px; align-items:center; margin-top:10px;">
                    ${btnCanal}
                    <button class="btn-action-edit" onclick="event.stopPropagation(); editar(${r.id});">Editar</button>
                </div>
            </div>`;
        }).join('') || '<p style="font-size:0.8rem; color:var(--text-secondary);">Sin seguimientos pendientes.</p>';
    }
}



/* ==========================================================================
   4. BÚSQUEDA PREDICTIVA UNIFICADA
   ========================================================================== */
function buscarCoincidenciasPredictivas(valor, campo, contenedorDropId) {
    const texto = valor.trim().toLowerCase().replace(/\s+/g, '');
    const drop = $(contenedorDropId);
    if (!drop) return;
    if (!texto || texto.length < 2) {
        drop.style.display = 'none';
        drop.innerHTML = '';
        return;
    }
    const encontrados = registros.filter(r => {
        let valTarget = (campo === 'nombre' ? (r.nombre || '') : (r.contacto || '')).toLowerCase().replace(/\s+/g, '');
        return valTarget.includes(texto);
    });
    if (encontrados.length === 0) {
        drop.style.display = 'none';
        drop.innerHTML = '';
        return;
    }
    drop.innerHTML = encontrados.map(r => {
        let datoCoincidente = campo === 'nombre' ? (r.nombre || 'Sin nombre') : (r.contacto || 'Sin contacto');
        let asuntoTexto = r.asunto ? `Último registro: ${r.asunto}` : 'Sin asunto registrado';
        return `
            <div class="drop-item-card" onclick="seleccionarCoincidencia(${r.id}, '${contenedorDropId}')">
                <div class="drop-item-header">
                    <strong>${campo === 'nombre' ? 'Cliente' : r.canal}: ${datoCoincidente}</strong>
                </div>
                <div class="drop-item-sub">Ya existe • ${asuntoTexto}</div>
                <div class="drop-item-badge ${obtenerClaseEstado(r.estado)}">${r.estado}</div>
            </div>
        `;
    }).join('');
    drop.style.display = 'block';
}

function seleccionarCoincidencia(id, contenedorDropId) {
    const drop = $(contenedorDropId);
    if (drop) {
        drop.style.display = 'none';
        drop.innerHTML = '';
    }
    editar(id);
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.coincidencias-drop') && !e.target.closest('input')) {
        document.querySelectorAll('.coincidencias-drop').forEach(d => {
            d.style.display = 'none';
        });
    }
});

/* ==========================================================================
   5. NAVEGACIÓN Y ONBOARDING
   ========================================================================== */
function iniciarRelojHeader() {
    function actualizar() {
        const d = ahoraMemora();
        const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        
        const diaNombre = diasSemana[d.getDay()];
        const diaNum = String(d.getDate()).padStart(2, '0');
        const mesNum = String(d.getMonth() + 1).padStart(2, '0');
        const anioDosDigitos = String(d.getFullYear()).slice(-2);
        
        const fechaTexto = `${diaNombre} ${diaNum}/${mesNum}/${anioDosDigitos}`;
        const horaTexto = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

        if ($('relojHeader')) $('relojHeader').innerText = `${fechaTexto} • ${horaTexto}`;
    }
    actualizar();
    setInterval(actualizar, 1000);
}



function navegarA(pantalla, customTitle = null) {
    document.querySelectorAll('.app-section').forEach(sec => sec.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    const esPC = window.innerWidth >= 800;
    if (esPC) document.body.classList.add('pc-view');
    else document.body.classList.remove('pc-view');
    
    document.body.classList.remove('tab-inicio', 'tab-registros', 'tab-perfil', 'tab-formulario', 'tab-ficha');
    document.body.classList.add(`tab-${pantalla}`);
    
    const titleMap = {
        'inicio': 'Inicio',
        'registros': 'Registros',
        'formulario': editando ? 'Editar Cliente' : 'Nuevo Cliente',
        'perfil': 'Perfil',
        'ficha': 'Ficha Cliente'
    };
    
    if ($('screenTitle')) $('screenTitle').innerText = customTitle || titleMap[pantalla] || 'MEMORA';
    
    if (pantalla === 'inicio') {
        if ($('sec-inicio')) $('sec-inicio').style.display = 'block';
        if ($('nav-inicio')) $('nav-inicio').classList.add('active');
        if ($('btnHeaderBack')) $('btnHeaderBack').style.display = 'none';
    } else if (pantalla === 'registros') {
        if ($('sec-registros')) $('sec-registros').style.display = 'block';
        if ($('nav-registros')) $('nav-registros').classList.add('active');
        if ($('btnHeaderBack')) $('btnHeaderBack').style.display = 'none';
    } else if (pantalla === 'formulario') {
        if ($('sec-formulario')) $('sec-formulario').style.display = 'block';
        if ($('btnHeaderBack')) $('btnHeaderBack').style.display = 'block';
    } else if (pantalla === 'perfil') {
        if ($('sec-perfil')) $('sec-perfil').style.display = 'block';
        if ($('nav-perfil')) $('nav-perfil').classList.add('active');
        if ($('btnHeaderBack')) $('btnHeaderBack').style.display = 'none';
        cargarDiagnosticoSistema();
        cargarDatosUsuarioPerfil();
    } else if (pantalla === 'ficha') {
        if ($('sec-ficha')) $('sec-ficha').style.display = 'block';
        if ($('btnHeaderBack')) $('btnHeaderBack').style.display = 'block';
    }
    render();
}

function comprobarEstadoAccesoEInicial() {
    const perfilCompleto = localStorage.getItem('memora_profile_completed') === 'true';
    if (!perfilCompleto) {
        if (document.querySelector('.main-content')) document.querySelector('.main-content').style.filter = 'blur(8px)';
        if (document.querySelector('.bottom-nav')) document.querySelector('.bottom-nav').style.display = 'none';
        if ($('modalPerfilMemora')) $('modalPerfilMemora').style.display = 'flex';
        return;
    }
    desbloquearInterfazCompleta();
}

function procesarPerfilInicial() {
    const nombre = $('initNombre')?.value.trim() || '';
    const cedula = $('initCedula')?.value.trim() || '';
    const empresa = $('initEmpresa')?.value.trim() || '';
    const whatsapp = $('initWhatsapp')?.value.trim() || '';
    
    if (!nombre) {
        mostrarAvisoMemora("Debes ingresar un nombre para guardar tus datos y continuar.", "Dato Requerido", "warning");
        return;
    }
    
    const datos = {
        rolAdmin: 'Usuario Administrador', nombreAdmin: nombre,
        cedulaAdmin: cedula, empresaAdmin: empresa, whatsappAdmin: whatsapp
    };
    
    localStorage.setItem('memora_admin_user_data', JSON.stringify(datos));
    localStorage.setItem('memora_profile_completed', 'true');
    if ($('modalPerfilMemora')) $('modalPerfilMemora').style.display = 'none';
    iniciarStoriesBienvenida(nombre);
}

function iniciarStoriesBienvenida(nombre) {
    currentStoryStep = 0;
    if ($('modalStoriesMemora')) $('modalStoriesMemora').style.display = 'flex';
    renderStoryStep(nombre);
}

function renderStoryStep(nombre) {
    const primerNombre = nombre ? nombre.split(' ')[0] : 'Usuario';
    const stories = [
        {
            icon: "waving_hand",
            title: `¡Hola, ${primerNombre}!`,
            text: "Bienvenido a MEMORA, el CRM inteligente diseñado para gestionar tus clientes e interacciones con la máxima agilidad."
        },
        {
            icon: "auto_awesome",
            title: "Seguimiento Inteligente",
            text: "MEMORA monitorea tus contactos inactivos para que nunca olvides responder un mensaje ni pierdas una venta."
        },
        {
            icon: "cloud_done",
            title: "Privacidad Total",
            text: "Tus datos son tuyos. Todo se respalda directamente en tu Google Drive personal con la máxima seguridad."
        }
    ];
    
    const current = stories[currentStoryStep];
    if ($('storyContent')) {
        $('storyContent').innerHTML = `
            <span class="material-symbols-outlined story-icon">${current.icon}</span>
            <h3 style="margin-bottom:8px;">${current.title}</h3>
            <p style="font-size:0.9rem; color:#6b7280;">${current.text}</p>
        `;
    }
    
    for (let i = 0; i < 3; i++) {
        const fill = $(`story-fill-${i}`);
        if (fill) fill.style.width = i <= currentStoryStep ? '100%' : '0%';
    }
    
    if ($('btnNextStory')) $('btnNextStory').innerText = currentStoryStep === stories.length - 1 ? "Ingresar a Memora" : "Siguiente";
}

function siguienteStory() {
    const datosRaw = localStorage.getItem('memora_admin_user_data');
    const datos = datosRaw ? JSON.parse(datosRaw) : { nombreAdmin: 'Usuario' };
    
    if (currentStoryStep < 2) {
        currentStoryStep++;
        renderStoryStep(datos.nombreAdmin);
    } else {
        if ($('modalStoriesMemora')) $('modalStoriesMemora').style.display = 'none';
        desbloquearInterfazCompleta();
    }
}

function desbloquearInterfazCompleta() {
    if (document.querySelector('.main-content')) document.querySelector('.main-content').style.filter = 'none';
    if (document.querySelector('.bottom-nav')) document.querySelector('.bottom-nav').style.display = 'flex';
    cargarDatosUsuarioPerfil();
    navegarA('inicio');
}

/* ==========================================================================
   6. AUXILIARES DE VISTA Y CARDS (MULTICANAL V1.3.0)
   ========================================================================== */
function obtenerAvatarEIdentidad(r) {
    let badgeText = 'CN';
    let iconName = null;
    if (r.canal === 'WhatsApp') badgeText = 'WA';
    else if (r.canal === 'Instagram') badgeText = 'IG';
    else if (r.canal === 'Email') iconName = 'alternate_email';
    else if (r.identificador) iconName = 'badge';
    else iconName = 'person';
    
    let avatarInner = iconName ? `<span class="material-symbols-outlined">${iconName}</span>` : badgeText;
    let tituloTexto = (r.nombre && r.nombre.trim().length > 0) ? r.nombre : (r.contacto || r.identificador || 'Contacto Sin Nombre');
    
    return { avatarHTML: avatarInner, tituloHTML: `<span style="color:var(--text-primary); font-weight:600;">${tituloTexto}</span>` };
}

function obtenerClaseEstado(estado) {
    const mapa = {
        'Consulta nueva': 'tag-consulta-nueva',
        'Información enviada': 'tag-informacion-enviada',
        'Esperando cliente': 'tag-esperando-cliente',
        'Esperando respuesta interna': 'tag-esperando-respuesta-interna',
        'Cerrado': 'tag-cerrado',
        'Perdido': 'tag-perdido',
        'Archivado': 'tag-archivado'
    };
    return mapa[estado] || 'tag-consulta-nueva';
}

function obtenerTextoIdentificador(r) {
    if (!r.identificador || !r.identificador.trim()) return '';
    let val = r.identificador.trim();
    if (val.toLowerCase().startsWith('rut')) {
        return ` • RUT: ${val.replace(/rut/i, '').trim()}`;
    }
    return ` • Cliente / Socio: ${val}`;
}

function obtenerConfigVisibilidadCanales() {
    return localStorage.getItem('memora_modo_canales') || 'todos';
}

function guardarConfigVisibilidadCanales() {
    const val = $('cfgModoCanales')?.value || 'todos';
    localStorage.setItem('memora_modo_canales', val);
    mostrarAvisoMemora("Preferencia de visibilidad de canales actualizada.", "Configuración", "tune");
    render();
}

function construirBotonUnicoCanal(canal, contacto) {
    if (!contacto || !contacto.trim()) return '';
    const contactoLimpio = contacto.replace(/\s+/g, '');
    if (canal === 'WhatsApp') {
        const numWA = contactoLimpio.startsWith('+') ? contactoLimpio.replace('+', '') : `598${contactoLimpio.replace(/^0/, '')}`;
        return `<a href="https://wa.me/${numWA}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel btn-channel-wa">
            <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M12.031 2c-5.517 0-9.993 4.476-9.993 9.993 0 1.763.459 3.479 1.33 4.996l-1.417 5.176 5.297-1.389c1.464.798 3.119 1.217 4.783 1.217 5.517 0 9.993-4.476 9.993-9.993 0-5.517-4.476-9.993-9.993-9.993zm5.824 14.129c-.243.684-1.22 1.251-1.996 1.341-.532.062-1.226.111-3.558-.853-2.984-1.233-4.9-4.269-5.049-4.469-.148-.199-1.216-1.621-1.216-3.092 0-1.471.771-2.193 1.045-2.491.274-.298.599-.373.799-.373.199 0 .399.002.573.011.184.01.431-.07.674.513.243.583.823 2.012.897 2.16.074.149.124.323.025.522-.099.199-.149.323-.298.497-.149.174-.313.388-.447.522-.149.149-.305.311-.131.61.174.298.773 1.277 1.66 2.067 1.14 1.015 2.102 1.328 2.399 1.477.298.149.472.124.646-.074.174-.199.746-.87.945-1.168.199-.298.398-.248.671-.149.273.099 1.741.821 2.039.97.298.149.497.223.572.348.074.124.074.721-.169 1.405z"/></svg> WA</a>`;
    } else if (canal === 'Instagram') {
        const userInsta = contactoLimpio.replace('@', '');
        return `<a href="https://instagram.com/${userInsta}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel btn-channel-ins">
            <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> IG</a>`;
    } else if (canal === 'Facebook') {
        const userFB = contactoLimpio.replace('@', '');
        return `<a href="https://m.me/${userFB}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel" style="background-color:#1877F2; color:white;">
            <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg> FB</a>`;
    } else if (canal === 'Telegram') {
        const userTG = contactoLimpio.replace('@', '');
        return `<a href="https://t.me/${userTG}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel" style="background-color:#229ED9; color:white;">
            <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.197 1.006.129.832.941z"/></svg> TG</a>`;
    } else if (canal === 'Email') {
        return `<a href="mailto:${contacto}" onclick="event.stopPropagation();" class="btn-action-channel btn-channel-mail">
            <span class="material-symbols-outlined" style="font-size:0.9rem;">mail</span> Mail</a>`;
    }
    return '';
}

function obtenerBotonAccionCanal(r) {
    const modoVisibilidad = obtenerConfigVisibilidadCanales();
    let HTMLBotones = [];
    if (r.canal && r.contacto) {
        HTMLBotones.push(construirBotonUnicoCanal(r.canal, r.contacto));
    }
    if (modoVisibilidad !== 'principal' && r.canal2 && r.contacto2) {
        HTMLBotones.push(construirBotonUnicoCanal(r.canal2, r.contacto2));
    }
    if (modoVisibilidad === 'todos' && r.canal3 && r.contacto3) {
        HTMLBotones.push(construirBotonUnicoCanal(r.canal3, r.contacto3));
    }
    if (HTMLBotones.length === 0) {
        return `<button onclick="event.stopPropagation(); abrirFicha(${r.id});" class="btn-action-channel btn-channel-generic"><span class="material-symbols-outlined" style="font-size:1rem;">visibility</span> Ver</button>`;
    }
    return `<div class="channel-buttons-group" style="display:flex; gap:4px; align-items:center;">${HTMLBotones.join('')}</div>`;
}

function tarjetaEstetica(r) {
    const dCreacion = new Date(r.fecha);
    const dModif = new Date(r.ultimaModificacion || r.fecha);
    
    let fechaCreacionTexto = !isNaN(dCreacion.getTime()) 
        ? `${String(dCreacion.getDate()).padStart(2, '0')}/${String(dCreacion.getMonth() + 1).padStart(2, '0')}/${dCreacion.getFullYear()} ${String(dCreacion.getHours()).padStart(2, '0')}:${String(dCreacion.getMinutes()).padStart(2, '0')}` 
        : r.fecha;
        
    let fechaRevisionTexto = !isNaN(dModif.getTime()) 
    ? `${String(dModif.getDate()).padStart(2, '0')}/${String(dModif.getMonth() + 1).padStart(2, '0')}/${dModif.getFullYear()} ${String(dModif.getHours()).padStart(2, '0')}:${String(dModif.getMinutes()).padStart(2, '0')}` 
    : '-';

    const { avatarHTML, tituloHTML } = obtenerAvatarEIdentidad(r);
    const btnCanal = obtenerBotonAccionCanal(r);
    const textoId = obtenerTextoIdentificador(r);
    let comentariosActivos = (r.comentarios || []).filter(c => !c.eliminado);
    let ultimoComentario = comentariosActivos.length > 0 ? comentariosActivos[comentariosActivos.length - 1].texto : null;

    let esArchivado = r.estado === 'Archivado';

    let botonesAccionDerecha = esArchivado ? `
        <button class="btn-action-edit" style="background:#E5E7EB; color:#374151;" onclick="event.stopPropagation(); archivarCliente(${r.id});">Desarchivar</button>
        <button class="btn-action-edit" style="background:#FEE2E2; color:#DC2626;" onclick="event.stopPropagation(); eliminar(${r.id});">Eliminar</button>
    ` : `
        ${btnCanal}
        <button class="btn-action-edit" onclick="event.stopPropagation(); editar(${r.id});">Editar</button>
    `;

    return `
    <div class="card client-card" style="cursor:pointer;" onclick="abrirFicha(${r.id})">
        <div class="client-info">
            <div class="avatar avatar-blue">${avatarHTML}</div>
            <div class="client-details">
                <h4>${tituloHTML}</h4>
                <div class="client-sub">${r.canal} • ${r.contacto}${textoId}</div>
            </div>
        </div>
        
        <div>
            ${r.asunto ? `<div style="font-size: 0.8rem; font-weight:600; color:var(--primary-blue);">Asunto: ${r.asunto}</div>` : '<span style="color:gray; font-size:0.75rem;">Sin asunto</span>'}
            ${ultimoComentario ? `<div style="font-size: 0.73rem; color:#4B5563; margin-top:3px; background:#F3F4F6; padding:4px 8px; border-radius:6px; display:inline-block; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Último comentario: ${ultimoComentario}</div>` : ''}
        </div>
        
        <div class="tag-row"><span class="tag ${obtenerClaseEstado(r.estado)}">${r.estado}</span></div>
        
     <div class="time-ago">
    <span style="font-size:0.72rem; color:var(--text-secondary);">Creado: <strong>${fechaCreacionTexto}</strong></span><br>
    <span style="font-size:0.72rem; color:var(--text-secondary);">Última rev: <strong>${fechaRevisionTexto}</strong></span>
</div>

        
        <div style="display:flex; gap:6px; align-items:center; margin-top:8px;">
            ${botonesAccionDerecha}
        </div>
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
    let asunto = $('filtroAsunto')?.value.toLowerCase() || '';
    let ident = $('filtroId')?.value.toLowerCase() || '';
    let estado = $('filtroEstado')?.value || '';
    let com = $('filtroComentario')?.value.toLowerCase() || '';

    registrosUltimoFiltro = registros.filter(r => {
        let esArchiv = r.estado === 'Archivado';
        if (mostrandoArchivados) { if (!esArchiv) return false; } else { if (esArchiv) return false; }
        
        let matchBusqueda = !busqueda || JSON.stringify(r).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(busqueda);
        let matchNombre = !nombre || (r.nombre || '').toLowerCase().includes(nombre);
        let matchCanal = !canal || r.canal === canal || r.canal2 === canal || r.canal3 === canal;
        let matchDato = !dato || (r.contacto || '').toLowerCase().includes(dato) || (r.contacto2 || '').toLowerCase().includes(dato) || (r.contacto3 || '').toLowerCase().includes(dato);
        let matchAsunto = !asunto || (r.asunto || '').toLowerCase().includes(asunto);
        let matchIdent = !ident || (r.identificador || '').toLowerCase().includes(ident);
        let matchEstado = !estado || r.estado === estado;
        let matchCom = !com || JSON.stringify(r.comentarios || []).toLowerCase().includes(com);

        return matchBusqueda && matchNombre && matchCanal && matchDato && matchAsunto && matchIdent && matchEstado && matchCom;
    });

    if ($('listaRegistros')) $('listaRegistros').innerHTML = registrosUltimoFiltro.map(tarjetaEstetica).join('') || '<p style="text-align:center; padding:20px; color:var(--text-secondary);">No se encontraron registros.</p>';
    if ($('totalRegistrosTexto')) $('totalRegistrosTexto').innerText = `${registrosUltimoFiltro.length} registros ${mostrandoArchivados ? '(Archivados)' : ''}`;
    
    if ($('btnVerArchivados')) {
        $('btnVerArchivados').innerText = mostrandoArchivados ? 'Ver Activos' : 'Ver Archivados';
        $('btnVerArchivados').style.background = mostrandoArchivados ? '#E5E7EB' : '#F3F4F6';
    }
}

/* ==========================================================================
   7. LÓGICA DINÁMICA MULTICANAL Y FORMULARIO DE INICIO / MÓVIL
   ========================================================================== */
function agregarCampoCanalExtraInicio(canalVal = 'Instagram', contactoVal = '') {
    const contenedor = $('contenedorCanalesExtraInicio');
    if (!contenedor) return;
    
    const bloquesActuales = contenedor.querySelectorAll('.sub-canal-block').length;
    if (bloquesActuales >= 2) {
        mostrarToastPC("Máximo 3 canales alcanzado", "warning");
        return;
    }

    canalesExtraContadorInicio++;
    const idNum = canalesExtraContadorInicio;

    const div = document.createElement('div');
    div.className = 'sub-canal-block';
    div.id = `bloqueCanalExtra_${idNum}`;
    div.style.cssText = 'background:#F9FAFB; padding:8px 12px; border:1px solid #E5E7EB; border-radius:8px; position:relative;';
    div.innerHTML = `
        <button type="button" onclick="quitarCampoCanalExtraInicio(${idNum})" style="position:absolute; top:6px; right:8px; background:none; border:none; color:#DC2626; font-weight:700; font-size:0.75rem; cursor:pointer;">✕ Quitar</button>
        <div style="display:grid; grid-template-columns: 1fr 2fr; gap:8px; margin-top:12px;">
            <div>
                <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Canal Extra</label>
                <select id="canalExtra_${idNum}" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:0.85rem;">
                    <option value="Instagram" ${canalVal === 'Instagram' ? 'selected' : ''}>Instagram</option>
                    <option value="WhatsApp" ${canalVal === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option>
                    <option value="Email" ${canalVal === 'Email' ? 'selected' : ''}>Email</option>
                    <option value="Facebook" ${canalVal === 'Facebook' ? 'selected' : ''}>Facebook</option>
                    <option value="Telegram" ${canalVal === 'Telegram' ? 'selected' : ''}>Telegram</option>
                    <option value="Otro" ${canalVal === 'Otro' ? 'selected' : ''}>Otro</option>
                </select>
            </div>
            <div>
                <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Contacto / Usuario</label>
                <input type="text" id="contactoExtra_${idNum}" value="${contactoVal}" placeholder="Ej: @usuario / mail" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:0.85rem;">
            </div>
        </div>
    `;
    contenedor.appendChild(div);
}

function quitarCampoCanalExtraInicio(idNum) {
    const el = $(`bloqueCanalExtra_${idNum}`);
    if (el) el.remove();
}

/* LÓGICA AÑADIDA PARA 3 CANALES EN MÓVIL */
function agregarCampoCanalExtraMovil(canalVal = 'Instagram', contactoVal = '') {
    const contenedor = $('contenedorCanalesExtraMovil');
    if (!contenedor) return;
    
    const bloquesActuales = contenedor.querySelectorAll('.sub-canal-block-movil').length;
    if (bloquesActuales >= 2) {
        mostrarAvisoMemora("Máximo 3 canales alcanzado", "MEMORA", "warning");
        return;
    }

    canalesExtraContadorMovil++;
    const idNum = canalesExtraContadorMovil;

    const div = document.createElement('div');
    div.className = 'sub-canal-block-movil';
    div.id = `bloqueCanalExtraMovil_${idNum}`;
    div.style.cssText = 'background:#F9FAFB; padding:8px 12px; border:1px solid #E5E7EB; border-radius:8px; position:relative; margin-top:8px;';
    div.innerHTML = `
        <button type="button" onclick="quitarCampoCanalExtraMovil(${idNum})" style="position:absolute; top:6px; right:8px; background:none; border:none; color:#DC2626; font-weight:700; font-size:0.75rem; cursor:pointer;">✕ Quitar</button>
        <div style="display:grid; grid-template-columns: 1fr 2fr; gap:8px; margin-top:12px;">
            <div>
                <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Canal Extra</label>
                <select id="canalExtraMovil_${idNum}" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:0.85rem;">
                    <option value="Instagram" ${canalVal === 'Instagram' ? 'selected' : ''}>Instagram</option>
                    <option value="WhatsApp" ${canalVal === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option>
                    <option value="Email" ${canalVal === 'Email' ? 'selected' : ''}>Email</option>
                    <option value="Facebook" ${canalVal === 'Facebook' ? 'selected' : ''}>Facebook</option>
                    <option value="Telegram" ${canalVal === 'Telegram' ? 'selected' : ''}>Telegram</option>
                    <option value="Otro" ${canalVal === 'Otro' ? 'selected' : ''}>Otro</option>
                </select>
            </div>
            <div>
                <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Contacto / Usuario</label>
                <input type="text" id="contactoExtraMovil_${idNum}" value="${contactoVal}" placeholder="Ej: @usuario / mail" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:0.85rem;">
            </div>
        </div>
    `;
    contenedor.appendChild(div);
}

function quitarCampoCanalExtraMovil(idNum) {
    const el = $(`bloqueCanalExtraMovil_${idNum}`);
    if (el) el.remove();
}

function mostrarCanal() {
    let c = $('canal').value;
    let nombres = {
        WhatsApp: 'Teléfono / WhatsApp', Instagram: 'Usuario Instagram',
        Email: 'Correo electrónico', Facebook: 'Usuario Facebook',
        Telegram: 'Telegram', Otro: 'Contacto'
    };
    const estaBloqueado = editando !== null;
    
    $('campoCanal').style.position = 'relative';
    $('campoCanal').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <label style="font-size: 0.8rem; color: var(--text-secondary);">${nombres[c] || 'Contacto'}</label>
            <div id="btnAccionContactoContainer">
                ${estaBloqueado ? `<a href="#" onclick="activarEdicionContacto(); return false;" style="font-size:0.75rem; color:var(--primary-blue); font-weight:600; text-decoration:none;">[ Cambiar dato ]</a>` : ''}
            </div>
        </div>
        <input id="contacto" 
               oninput="buscarCoincidenciasPredictivas(this.value, 'contacto', 'dropContactoForm')" 
               autocomplete="off"
               ${estaBloqueado ? 'readonly style="width:100%; padding:10px; border-radius:8px; border:1px solid #d1d5db; background-color:#f3f4f6; color:#6b7280; font-weight:600;"' : 'style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;"'}
        >
        <div id="dropContactoForm" class="coincidencias-drop"></div>
    `;
}

function mostrarCanalInicio() {
    let c = $('canalInicio')?.value;
    let nombres = {
        WhatsApp: 'Teléfono / WhatsApp', Instagram: 'Usuario Instagram',
        Email: 'Correo electrónico', Facebook: 'Usuario Facebook',
        Telegram: 'Telegram', Otro: 'Contacto'
    };
    if ($('campoCanalInicio')) {
        let label = $('campoCanalInicio').querySelector('label');
        if (label) label.innerText = nombres[c] || 'Contacto';
    }
}

function activarEdicionContacto() {
    const input = $('contacto');
    if (!input) return;
    contactoOriginalBackup = input.value;
    input.removeAttribute('readonly');
    input.style.backgroundColor = '#ffffff';
    input.style.color = 'var(--text-primary)';
    input.style.border = '1.5px solid var(--primary-blue)';
    input.focus();
    $('btnAccionContactoContainer').innerHTML = `
        <a href="#" onclick="confirmarNuevoContacto(); return false;" style="font-size:0.75rem; color:#10B981; font-weight:700; margin-right:8px; text-decoration:none;">[ Confirmar ]</a>
        <a href="#" onclick="cancelarEdicionContacto(); return false;" style="font-size:0.75rem; color:#DC2626; font-weight:600; text-decoration:none;">[ Conservar original ]</a>
    `;
}

function activarEdicionContactoInicio() {
    const input = $('contactoInicio');
    if (!input) return;
    contactoOriginalBackup = input.value;
    input.removeAttribute('readonly');
    input.style.backgroundColor = '#ffffff';
    input.style.color = 'var(--text-primary)';
    input.style.border = '1.5px solid var(--primary-blue)';
    input.focus();
    $('btnAccionContactoContainerInicio').innerHTML = `
        <a href="#" onclick="confirmarNuevoContactoInicio(); return false;" style="font-size:0.75rem; color:#10B981; font-weight:700; margin-right:8px; text-decoration:none;">[ Confirmar ]</a>
        <a href="#" onclick="cancelarEdicionContactoInicio(); return false;" style="font-size:0.75rem; color:#DC2626; font-weight:600; text-decoration:none;">[ Conservar original ]</a>
    `;
}

function confirmarNuevoContacto() {
    const input = $('contacto');
    if (!input || !input.value.trim()) {
        mostrarAvisoMemora("El campo de contacto no puede quedar vacío.", "Dato Requerido", "warning");
        return;
    }
    bloquearInputContacto(input, 'btnAccionContactoContainer', 'activarEdicionContacto');
}

function confirmarNuevoContactoInicio() {
    const input = $('contactoInicio');
    if (!input || !input.value.trim()) {
        mostrarAvisoMemora("El campo de contacto no puede quedar vacío.", "Dato Requerido", "warning");
        return;
    }
    bloquearInputContacto(input, 'btnAccionContactoContainerInicio', 'activarEdicionContactoInicio');
}

function cancelarEdicionContacto() {
    const input = $('contacto');
    if (!input) return;
    input.value = contactoOriginalBackup;
    bloquearInputContacto(input, 'btnAccionContactoContainer', 'activarEdicionContacto');
}

function cancelarEdicionContactoInicio() {
    const input = $('contactoInicio');
    if (!input) return;
    input.value = contactoOriginalBackup;
    bloquearInputContacto(input, 'btnAccionContactoContainerInicio', 'activarEdicionContactoInicio');
}

function bloquearInputContacto(input, containerId, fnNombre) {
    input.setAttribute('readonly', 'true');
    input.style.backgroundColor = '#f3f4f6';
    input.style.color = '#6b7280';
    input.style.border = '1px solid #d1d5db';
    if ($(containerId)) {
        $(containerId).innerHTML = `
            <a href="#" onclick="${fnNombre}(); return false;" style="font-size:0.75rem; color:var(--primary-blue); font-weight:600; text-decoration:none;">[ Cambiar dato ]</a>
        `;
    }
}

function mostrarId() {
    let t = $('tipoId')?.value;
    if ($('campoId')) {
        $('campoId').innerHTML = (t === 'Ninguno' || !t) ? '' : `
            <label style="display:block; font-size:0.8rem; margin-bottom:4px; color:var(--text-secondary);">${t}</label>
            <input id="valorId" type="text" placeholder="Ingrese ${t}" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">
        `;
    }
}

function mostrarIdInicio() {
    let t = $('tipoIdInicio')?.value;
    if ($('campoIdInicio')) {
        $('campoIdInicio').innerHTML = (t === 'Ninguno' || !t) ? '' : `
            <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px; color:var(--text-secondary);">${t}</label>
            <input id="valorIdInicio" type="text" placeholder="Ingrese ${t}" style="width:100%; padding:12px; border-radius:8px; border:1px solid #ccc;">
        `;
    }
}

function agregarComentarioTemporalInicio() {
    let txt = $('comentarioInicio')?.value.trim();
    if (!txt) return;
    comentariosTemporalesInicio.push({
        texto: txt,
        fecha: fechaHoraTextoFormateada(),
        editado: null,
        eliminado: false
    });
    if ($('comentarioInicio')) $('comentarioInicio').value = '';
    renderComentariosTemporalesInicio();
}

function renderComentariosTemporalesInicio() {
    let cont = $('listaComentariosTemporalesInicio');
    if (!cont) return;
    if (comentariosTemporalesInicio.length === 0) {
        cont.innerHTML = '<p style="font-size:0.75rem; color:var(--text-secondary);">No hay comentarios adjuntos.</p>';
        return;
    }
    cont.innerHTML = comentariosTemporalesInicio.map((c, i) => `
        <div class="card" style="padding:10px; margin-top:6px; font-size:0.8rem; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.7rem; color:var(--text-secondary);">
                <span>Comentario del ${c.fecha} ${c.editado ? `<strong style="color:#D97706;">(Editado el ${c.editado})</strong>` : ''}</span>
                ${!c.eliminado ? `
                <div>
                    <a href="#" onclick="editarComentarioTemporalInicio(${i}); return false;" style="color:var(--primary-blue); font-weight:600; margin-right:8px; text-decoration:none;">Editar</a>
                    <a href="#" onclick="eliminarComentarioTemporalInicio(${i}); return false;" style="color:#DC2626; font-weight:600; text-decoration:none;">Eliminar</a>
                </div>` : ''}
            </div>
            <div style="font-weight:500; ${c.eliminado ? 'color:var(--text-secondary); font-style:italic;' : ''}">
                ${c.texto}
            </div>
        </div>
    `).join('');
}

function editarComentarioTemporalInicio(index) {
    let c = comentariosTemporalesInicio[index];
    if (!c) return;
    mostrarPromptMemora("Modifica el contenido del comentario:", c.texto, "Editar Comentario", (nuevoTexto) => {
        if (nuevoTexto !== null && nuevoTexto.trim() !== "") {
            comentariosTemporalesInicio[index].texto = nuevoTexto.trim();
            comentariosTemporalesInicio[index].editado = fechaHoraTextoFormateada();
            renderComentariosTemporalesInicio();
        }
    });
}

function eliminarComentarioTemporalInicio(index) {
    mostrarConfirmMemora("¿Deseas quitar este comentario?", "Eliminar Nota", "delete", "#DC2626", (confirmado) => {
        if (confirmado) {
            comentariosTemporalesInicio.splice(index, 1);
            renderComentariosTemporalesInicio();
        }
    });
}

function guardarDesdeInicio() {
    const contacto = $('contactoInicio')?.value.trim() || '';
    if (!contacto) {
        mostrarAvisoMemora('Debes ingresar el dato de contacto antes de guardar.', 'Error al cargar datos', 'error');
        return;
    }
    const contenedor = $('contenedorCanalesExtraInicio');
    const bloques = contenedor ? contenedor.querySelectorAll('.sub-canal-block') : [];
    
    let canal2 = '', contacto2 = '';
    let canal3 = '', contacto3 = '';

    if (bloques[0]) {
        canal2 = bloques[0].querySelector('select')?.value || '';
        contacto2 = bloques[0].querySelector('input')?.value.trim() || '';
    }
    if (bloques[1]) {
        canal3 = bloques[1].querySelector('select')?.value || '';
        contacto3 = bloques[1].querySelector('input')?.value.trim() || '';
    }

    let textoUltimo = $('comentarioInicio')?.value.trim();
    if (textoUltimo) {
        comentariosTemporalesInicio.push({
            texto: textoUltimo,
            fecha: fechaHoraTextoFormateada(),
            editado: null,
            eliminado: false
        });
    }

    let r = {
        id: editando || Date.now(),
        nombre: $('nombreInicio')?.value.trim() || '',
        canal: $('canalInicio')?.value || 'WhatsApp',
        contacto: contacto,
        canal2: canal2,
        contacto2: contacto2,
        canal3: canal3,
        contacto3: contacto3,
        asunto: $('asuntoInicio')?.value.trim() || '',
        identificador: $('valorIdInicio')?.value.trim() || '',
        estado: $('estadoInicio')?.value || 'Consulta nueva',
        comentarios: [...comentariosTemporalesInicio],
        fecha: editando ? (registros.find(x => x.id === editando)?.fecha || ahoraMemora().toISOString()) : ahoraMemora().toISOString(),
        ultimaModificacion: ahoraMemora().toISOString()
    };

    if (editando) {
        registros = registros.map(x => x.id === editando ? r : x);
    } else {
        registros.push(r);
    }

    guardarLocal();
    sincronizarAutoNube(r);
    limpiarCamposFormularioInicio();
    render();
    mostrarAvisoMemora(editando ? 'Registro actualizado exitosamente.' : 'Registro guardado exitosamente.', 'MEMORA', 'check_circle');
}

function limpiarCamposFormularioInicio() {
    ['nombreInicio', 'contactoInicio', 'asuntoInicio', 'valorIdInicio', 'comentarioInicio'].forEach(id => {
        if ($(id)) $(id).value = '';
    });
    if ($('tipoIdInicio')) $('tipoIdInicio').value = 'Ninguno';
    if ($('canalInicio')) $('canalInicio').value = 'WhatsApp';
    
    if ($('contenedorCanalesExtraInicio')) $('contenedorCanalesExtraInicio').innerHTML = '';
    editando = null;
    comentariosTemporalesInicio = [];
    renderComentariosTemporalesInicio();
    mostrarIdInicio();
    mostrarCanalInicio();

    if ($('contactoInicio')) {
        $('contactoInicio').removeAttribute('readonly');
        $('contactoInicio').style.backgroundColor = '#ffffff';
        $('contactoInicio').style.color = 'var(--text-primary)';
        $('contactoInicio').style.border = '1px solid #ccc';
    }
    if ($('btnAccionContactoContainerInicio')) $('btnAccionContactoContainerInicio').innerHTML = '';

    if ($('tituloFormularioInicio')) {
        $('tituloFormularioInicio').innerText = 'Nuevo Registro / Carga Directa';
    }
    
    if ($('contenedorBotonesInicio')) {
        $('contenedorBotonesInicio').innerHTML = `
            <button id="btnGuardarInicio" onclick="guardarDesdeInicio()" style="flex:2; background:var(--primary-blue); color:white; border:none; padding:14px; border-radius:10px; font-weight:700; cursor:pointer; font-size:0.95rem;">
                Guardar Registro
            </button>
            <button type="button" onclick="limpiarCamposFormularioInicio()" style="flex:1; background:#FEE2E2; color:#DC2626; border:none; padding:14px; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.9rem;">
                Limpiar Campos
            </button>
        `;
    }
}

function agregarComentarioFormulario() {
    let txt = $('comentario')?.value.trim();
    if (!txt) return;
    
    comentariosEdicionActual.push({
        texto: txt,
        fecha: fechaHoraTextoFormateada(),
        editado: null,
        eliminado: false
    });
    
    if ($('comentario')) $('comentario').value = '';
    renderListaComentariosEdicion();
}

function renderListaComentariosEdicion() {
    let container = $('listaComentariosEdicion');
    if (!container) return;
    if (comentariosEdicionActual.length === 0) {
        container.innerHTML = '<p style="font-size:0.75rem; color:var(--text-secondary);">No hay comentarios adjuntos.</p>';
        return;
    }
    container.innerHTML = comentariosEdicionActual.map((c, i) => `
        <div class="card" style="padding:10px; margin-top:6px; font-size:0.8rem; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.7rem; color:var(--text-secondary);">
                <span>Comentario del ${c.fecha} ${c.editado ? `<strong style="color:#D97706;">(Editado el ${c.editado})</strong>` : ''}</span>
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

function editarComentarioTexto(index) {
    let c = comentariosEdicionActual[index];
    if (!c) return;
    mostrarPromptMemora("Modifica el contenido del comentario:", c.texto, "Editar Comentario", (nuevoTexto) => {
        if (nuevoTexto !== null && nuevoTexto.trim() !== "") {
            comentariosEdicionActual[index].texto = nuevoTexto.trim();
            comentariosEdicionActual[index].editado = fechaHoraTextoFormateada();
            renderListaComentariosEdicion();
        }
    });
}

function borrarComentarioTexto(index) {
    mostrarConfirmMemora("¿Deseas quitar este comentario?", "Eliminar Nota", "delete", "#DC2626", (confirmado) => {
        if (confirmado) {
            comentariosEdicionActual.splice(index, 1);
            renderListaComentariosEdicion();
        }
    });
}

function prepararNuevoRegistro() {
    if (window.innerWidth >= 800) {
        navegarA('inicio');
        limpiarCamposFormularioInicio();
        setTimeout(() => {
            $('nombreInicio')?.focus();
            $('focoFormularioInicio')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } else {
        limpiar();
        navegarA('formulario');
    }
}

function guardar() {
    const contacto = $('contacto')?.value.trim() || '';
    if (!contacto) {
        mostrarAvisoMemora('Debes ingresar el dato de contacto antes de guardar.', 'Error al cargar datos', 'error');
        return;
    }
    
    // Extracción de canales extra (Móvil)
    const contenedor = $('contenedorCanalesExtraMovil');
    const bloques = contenedor ? contenedor.querySelectorAll('.sub-canal-block-movil') : [];
    
    let canal2 = '', contacto2 = '';
    let canal3 = '', contacto3 = '';

    if (bloques[0]) {
        canal2 = bloques[0].querySelector('select')?.value || '';
        contacto2 = bloques[0].querySelector('input')?.value.trim() || '';
    }
    if (bloques[1]) {
        canal3 = bloques[1].querySelector('select')?.value || '';
        contacto3 = bloques[1].querySelector('input')?.value.trim() || '';
    }

    let viejo = registros.find(r => r.id === editando);
    let comentariosConsolidados = viejo ? [...(viejo.comentarios || [])] : [];
    comentariosEdicionActual.forEach(nuevoC => {
        if (!comentariosConsolidados.some(c => c.texto === nuevoC.texto && c.fecha === nuevoC.fecha)) {
            comentariosConsolidados.push(nuevoC);
        }
    });

    let r = {
        id: editando || Date.now(),
        nombre: $('nombre')?.value ? $('nombre').value.trim() : '',
        canal: $('canal')?.value || 'WhatsApp',
        contacto,
        canal2,
        contacto2,
        canal3,
        contacto3,
        asunto: $('asunto')?.value.trim() || '',
        identificador: $('valorId')?.value || '',
        estado: $('estado')?.value || 'Consulta nueva',
        comentarios: comentariosConsolidados,
        fecha: viejo?.fecha || ahoraMemora().toISOString(),
        ultimaModificacion: ahoraMemora().toISOString()
    };

    if (viejo) registros = registros.map(x => x.id === r.id ? r : x);
    else registros.push(r);

    guardarLocal();
    sincronizarAutoNube(r);
    limpiar();
    navegarA('registros');
}

function editar(id) {
    let r = registros.find(x => x.id === id);
    if (!r) return;
    editando = id;
    const esPC = window.innerWidth >= 800;

    if (esPC) {
        if ($('nombreInicio')) $('nombreInicio').value = r.nombre || '';
        if ($('canalInicio')) $('canalInicio').value = r.canal || 'WhatsApp';
        mostrarCanalInicio();
        if ($('contactoInicio')) {
            $('contactoInicio').value = r.contacto || '';
            $('contactoInicio').setAttribute('readonly', 'true');
            $('contactoInicio').style.backgroundColor = '#f3f4f6';
            $('contactoInicio').style.color = '#6b7280';
            $('contactoInicio').style.border = '1px solid #d1d5db';
        }
        if ($('btnAccionContactoContainerInicio')) {
            $('btnAccionContactoContainerInicio').innerHTML = `
                <a href="#" onclick="activarEdicionContactoInicio(); return false;" style="font-size:0.75rem; color:var(--primary-blue); font-weight:600; text-decoration:none;">[ Cambiar dato ]</a>
            `;
        }

        if ($('contenedorCanalesExtraInicio')) $('contenedorCanalesExtraInicio').innerHTML = '';
        if (r.canal2 && r.contacto2) agregarCampoCanalExtraInicio(r.canal2, r.contacto2);
        if (r.canal3 && r.contacto3) agregarCampoCanalExtraInicio(r.canal3, r.contacto3);

        if ($('asuntoInicio')) $('asuntoInicio').value = r.asunto || '';
        if ($('estadoInicio')) $('estadoInicio').value = r.estado || 'Consulta nueva';
        if ($('tipoIdInicio')) $('tipoIdInicio').value = r.identificador ? (r.identificador.startsWith('RUT') ? 'RUT' : 'Nº de Cliente') : 'Ninguno';
        mostrarIdInicio();
        if ($('valorIdInicio')) $('valorIdInicio').value = r.identificador || '';

        comentariosTemporalesInicio = JSON.parse(JSON.stringify(r.comentarios || []));
        renderComentariosTemporalesInicio();

        if ($('tituloFormularioInicio')) {
            $('tituloFormularioInicio').innerText = `Editando Registro: ${r.nombre || r.contacto}`;
        }

        let esArchivado = r.estado === 'Archivado';
        if ($('contenedorBotonesInicio')) {
            $('contenedorBotonesInicio').innerHTML = `
                <button id="btnGuardarInicio" onclick="guardarDesdeInicio()" style="flex:2; background:var(--primary-blue); color:white; border:none; padding:14px; border-radius:10px; font-weight:700; cursor:pointer; font-size:0.95rem;">
                    Actualizar Registro
                </button>
                <button onclick="archivarCliente(${r.id})" style="flex:1; background:#E5E7EB; color:#374151; border:none; padding:14px; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.9rem;">
                    ${esArchivado ? 'Desarchivar' : 'Archivar'}
                </button>
                <button onclick="eliminar(${r.id})" style="flex:1; background:#FEE2E2; color:#DC2626; border:none; padding:14px; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.9rem;">
                    Eliminar
                </button>
                <button onclick="limpiarCamposFormularioInicio()" style="flex:1; background:#E5E7EB; color:#374151; border:none; padding:14px; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.9rem;">
                    Cancelar
                </button>
            `;
        }

        mostrarToastPC(`Datos cargados en Inicio. Ve a Inicio para modificar.`, "info");

    } else {
        if ($('nombre')) $('nombre').value = r.nombre || '';
        if ($('canal')) $('canal').value = r.canal || 'WhatsApp';
        mostrarCanal();
        if ($('contacto')) $('contacto').value = r.contacto || '';

        // Cargar canales extra en Móvil
        if ($('contenedorCanalesExtraMovil')) $('contenedorCanalesExtraMovil').innerHTML = '';
        if (r.canal2 && r.contacto2) agregarCampoCanalExtraMovil(r.canal2, r.contacto2);
        if (r.canal3 && r.contacto3) agregarCampoCanalExtraMovil(r.canal3, r.contacto3);

        if ($('asunto')) $('asunto').value = r.asunto || '';
        if ($('estado')) $('estado').value = r.estado || 'Consulta nueva';
        if ($('tipoId')) $('tipoId').value = r.identificador ? (r.identificador.startsWith('RUT') ? 'RUT' : 'Nº de Cliente') : 'Ninguno';
        mostrarId();
        if ($('valorId')) $('valorId').value = r.identificador || '';

        comentariosEdicionActual = JSON.parse(JSON.stringify(r.comentarios || []));
        renderListaComentariosEdicion();

        navegarA('formulario', 'Editar Cliente');
    }
}

function abrirFicha(id) {
    const esPC = window.innerWidth >= 800;
    if (esPC) {
        editar(id);
        return;
    }
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
                    ${r.canal2 && r.contacto2 ? `<p style="font-size: 0.75rem; color: var(--text-secondary);">${r.canal2} • ${r.contacto2}</p>` : ''}
                    ${r.canal3 && r.contacto3 ? `<p style="font-size: 0.75rem; color: var(--text-secondary);">${r.canal3} • ${r.contacto3}</p>` : ''}
                    ${r.asunto ? `<p style="font-size: 0.8rem; font-weight:600; color:var(--primary-blue); margin-top:2px;">Asunto: ${r.asunto}</p>` : ''}
                    ${r.identificador ? `<p style="font-size: 0.75rem; color: var(--text-secondary);">${obtenerTextoIdentificador(r)}</p>` : ''}
                    <div style="margin-top: 6px;"><span class="tag ${obtenerClaseEstado(r.estado)}">${r.estado}</span></div>
                </div>
            </div>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
            <button onclick="editar(${r.id})" style="flex: 1; background-color: var(--primary-blue); color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 600; cursor:pointer;">Editar</button>
            <button onclick="archivarCliente(${r.id})" style="flex: 1; background-color: #E5E7EB; color: #374151; border: none; padding: 12px; border-radius: 10px; font-weight: 600; cursor:pointer;">${r.estado === 'Archivado' ? 'Desarchivar' : 'Archivar'}</button>
            <button onclick="eliminar(${r.id})" style="flex: 1; background-color: #FEE2E2; color: #DC2626; border: none; padding: 12px; border-radius: 10px; font-weight: 600; cursor:pointer;">Eliminar</button>
        </div>
        
        <div class="section-header"><h3>Comentarios</h3></div>
        ${ultimoComentario ? `<div class="card" style="padding: 14px; margin-bottom: 12px; border-left: 4px solid var(--primary-blue);"><p style="font-size:0.9rem;">${ultimoComentario.texto}</p></div>` : '<p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom: 16px;">Sin comentarios.</p>'}
        ${historialComentarios.length > 0 ? historialComentarios.map(c => `<div class="card" style="padding:10px; margin-bottom:8px; background:#FAFAFA;"><p style="font-size:0.85rem;">${c.texto}</p></div>`).join('') : ''}
    `;
    $('contenidoFicha').innerHTML = html;
    navegarA('ficha');
}


/* ==========================================================================
   8. EXPORTACIÓN, MÉTRICAS Y AUXILIARES
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
        'Doc / RUT / Nº Cliente', 'Nombre del Cliente', 'Asunto / Motivo', 'Canal Principal', 'Teléfono / WhatsApp',
        'Usuario (@)', 'Correo Electrónico', 'Canal 2', 'Contacto 2', 'Canal 3', 'Contacto 3', 'Estado Actual', 'Último Comentario',
        'Total Comentarios', 'Fecha de Registro'
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
            r.identificador || 'N/A', r.nombre || 'Sin registrar', r.asunto || 'Sin asunto', r.canal || 'Otro',
            clasif.telefono, clasif.usuario, clasif.email, r.canal2 || '-', r.contacto2 || '-', r.canal3 || '-', r.contacto3 || '-', r.estado || 'Consulta nueva',
            ultimoCom, (r.comentarios || []).length, fechaCreacionTexto
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
        let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        let blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        let a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        mostrarAvisoMemora("Cargando la librería de Excel, reintenta en un instante...", "Exportación Excel", "schedule");
    }
}

function exportarPDFFiltrado() {
    let datosAExportar = registrosUltimoFiltro.length > 0 ? registrosUltimoFiltro : registros;
    let ventana = window.open('', '_blank');
    let contenido = `<html><head><title>Reporte MEMORA</title></head><body><h1>MEMORA - Reporte (${datosAExportar.length} Registros)</h1><p>Fecha: ${ahoraMemora().toLocaleString()}</p>`;
    datosAExportar.forEach(r => {
        contenido += `<hr><b>${r.nombre || r.contacto}</b><br>Asunto: ${r.asunto || 'N/A'}<br>Contacto Principal: ${r.canal} - ${r.contacto}<br>`;
        if (r.canal2 && r.contacto2) contenido += `Canal 2: ${r.canal2} - ${r.contacto2}<br>`;
        if (r.canal3 && r.contacto3) contenido += `Canal 3: ${r.canal3} - ${r.contacto3}<br>`;
        contenido += `Estado: ${r.estado}<br>`;
        contenido += `Comentarios:<br>${(r.comentarios || []).map(c => `- ${c.texto}`).join('<br>')}<br>`;
    });
    contenido += '</body></html>';
    ventana.document.write(contenido);
    ventana.print();
}

function exportarJSON() { descargar(JSON.stringify(registros, null, 2), 'memora.json', 'application/json'); }
function descargar(c, n, t) {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([c], { type: t }));
    a.download = n;
    a.click();
}

async function cargarDiagnosticoSistema() {
    const ua = navigator.userAgent;
    let dev = "Escritorio (PC/Mac)";
    if (/android/i.test(ua)) dev = "Android Mobile";
    else if (/iphone|ipad|ipod/i.test(ua)) dev = "iOS Mobile";
    
    let nav = "Navegador Web";
    if (ua.includes("Brave") || (navigator.brave && await navigator.brave.isBrave())) nav = "Brave Browser";
    else if (ua.includes("Chrome")) nav = "Google Chrome";
    else if (ua.includes("Firefox")) nav = "Mozilla Firefox";

    const storageBytes = new Blob([localStorage.getItem('memora_registros') || '']).size;

    if ($('sys-version')) $('sys-version').innerText = "v1.3.0";
    if ($('sys-device')) $('sys-device').innerText = dev;
    if ($('sys-browser')) $('sys-browser').innerText = nav;
    if ($('sys-storage')) $('sys-storage').innerText = `${(storageBytes / 1024).toFixed(2)} KB`;
    if ($('chkAutoArchivar')) $('chkAutoArchivar').checked = localStorage.getItem('memora_auto_archivar') === 'true';
    if ($('chkAutoNube')) $('chkAutoNube').checked = localStorage.getItem('memora_auto_nube') === 'true';
    if ($('cloudStatusText')) $('cloudStatusText').innerText = localStorage.getItem('memora_nube_conectado') === 'true' ? 'Conectado a Google Drive' : 'Sin vincular';
}

function cargarDatosUsuarioPerfil() {
    const datosRaw = localStorage.getItem('memora_admin_user_data');
    const datos = datosRaw ? JSON.parse(datosRaw) : { rolAdmin: 'Usuario Administrador', nombreAdmin: '', cedulaAdmin: '', empresaAdmin: '', whatsappAdmin: '' };
    
    if ($('saludo')) $('saludo').innerText = `¡Hola, ${datos.nombreAdmin ? datos.nombreAdmin.split(' ')[0] : 'Usuario'}!`;
    if ($('perfilRolAdmin')) $('perfilRolAdmin').innerText = datos.rolAdmin || 'Usuario Administrador';

    let htmlLista = '';
    if (datos.nombreAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">Nombre:</span> <span class="perfil-valor">${datos.nombreAdmin}</span></div>`;
    if (datos.cedulaAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">Documento / C.I.:</span> <span class="perfil-valor">${datos.cedulaAdmin}</span></div>`;
    if (datos.empresaAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">Empresa:</span> <span class="perfil-valor">${datos.empresaAdmin}</span></div>`;
    if (datos.whatsappAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">Contacto / WA:</span> <span class="perfil-valor">${datos.whatsappAdmin}</span></div>`;
    
    if ($('perfilDatosLista')) $('perfilDatosLista').innerHTML = htmlLista || '<p style="font-size:0.8rem; color:var(--text-secondary);">Sin datos adicionales cargados.</p>';

    const cfgSeg = obtenerConfigSeguimiento();
    if ($('cfgSegValor')) $('cfgSegValor').value = cfgSeg.valor;
    if ($('cfgSegUnidad')) $('cfgSegUnidad').value = cfgSeg.unidad;
    
    if ($('cfgModoCanales')) $('cfgModoCanales').value = obtenerConfigVisibilidadCanales();
}

function toggleModalConfigUser() {
    const modal = $('modalConfigAdmin');
    if (modal) modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}

function guardarDatosUsuarioAdmin() {
    const datos = {
        rolAdmin: $('cfgAdminRol')?.value.trim() || 'Usuario Administrador',
        nombreAdmin: $('cfgAdminNombre')?.value.trim() || '',
        cedulaAdmin: $('cfgAdminCedula')?.value.trim() || '',
        empresaAdmin: $('cfgAdminEmpresa')?.value.trim() || '',
        whatsappAdmin: $('cfgAdminWhatsapp')?.value.trim() || ''
    };
    if (!datos.nombreAdmin) {
        mostrarAvisoMemora("El nombre es requerido.", "Configuración", "warning");
        return;
    }
    localStorage.setItem('memora_admin_user_data', JSON.stringify(datos));
    toggleModalConfigUser();
    cargarDatosUsuarioPerfil();
    mostrarAvisoMemora("Datos de perfil guardados.", "Configuración", "check_circle");
}

function eliminar(id) {
    mostrarConfirmMemora("¿Es seguro de eliminar este registro permanentemente?", "Eliminar Cliente", "delete", "#DC2626", (confirmado) => {
        if (confirmado) {
            // 1. Filtrar y eliminar de la memoria
            registros = registros.filter(x => x.id !== id);
            guardarLocal();
            
            // 2. Limpiar estados y formularios activos
            limpiar();
            limpiarCamposFormularioInicio();
            
            // 3. Renderizar y redirigir inmediatamente a Registros
            render();
            navegarA('registros');
            
            // 4. Feedback visual de confirmación
            mostrarAvisoMemora("El registro ha sido eliminado correctamente.", "MEMORA", "delete");
        }
    });
}


function archivarCliente(id) {
    let r = registros.find(x => x.id === id);
    if (!r) return;
    r.estado = r.estado === 'Archivado' ? 'Consulta nueva' : 'Archivado';
    r.ultimaModificacion = ahoraMemora().toISOString();
    guardarLocal();
    limpiarCamposFormularioInicio();
    render();
}

function alternarVistaArchivados() {
    mostrandoArchivados = !mostrandoArchivados;
    if ($('filtroEstado')) $('filtroEstado').value = '';
    render();
}

function guardarLocal() { localStorage.setItem('memora_registros', JSON.stringify(registros)); }

// 1. Limpia las variables de edición y fuerza el estado base a "Consulta nueva"
function limpiar() {
    editando = null;

    if ($('nombre')) $('nombre').value = '';
    if ($('contacto')) $('contacto').value = '';
    if ($('asunto')) $('asunto').value = '';
    if ($('canal')) $('canal').value = 'WhatsApp';
    
    // Forzar el estado por defecto
    if ($('estado')) $('estado').value = 'Consulta nueva';

    // Limpiar campos de canales secundarios si existen
    if ($('canal2')) $('canal2').value = '';
    if ($('contacto2')) $('contacto2').value = '';
    if ($('canal3')) $('canal3').value = '';
    if ($('contacto3')) $('contacto3').value = '';
}

// 2. Limpia el formulario rápido de la pantalla de Inicio y resetea el selector de estado
function limpiarCamposFormularioInicio() {
    if ($('nombreInicio')) $('nombreInicio').value = '';
    if ($('contactoInicio')) $('contactoInicio').value = '';
    if ($('asuntoInicio')) $('asuntoInicio').value = '';
    if ($('canalInicio')) $('canalInicio').value = 'WhatsApp';
    
    // Forzar siempre 'Consulta nueva' para el siguiente cliente
    if ($('estadoInicio')) $('estadoInicio').value = 'Consulta nueva';
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

    let conteoCanales = {};
    registros.forEach(r => {
        if (r.canal) conteoCanales[r.canal] = (conteoCanales[r.canal] || 0) + 1;
        if (r.canal2) conteoCanales[r.canal2] = (conteoCanales[r.canal2] || 0) + 1;
        if (r.canal3) conteoCanales[r.canal3] = (conteoCanales[r.canal3] || 0) + 1;
    });

    let topCanal = '-';
    let max = 0;
    for (let c in conteoCanales) {
        if (conteoCanales[c] > max) {
            max = conteoCanales[c];
            topCanal = c;
        }
    }

    if ($('dash-activos')) $('dash-activos').innerText = activos;
    if ($('dash-mes')) $('dash-mes').innerText = creadosMes;
    if ($('dash-canal')) $('dash-canal').innerText = topCanal;
}

function filtrarPorEstadoKPI(est) {
    mostrandoArchivados = (est === 'Archivado');
    if ($('filtroEstado')) $('filtroEstado').value = est === 'Archivado' ? '' : est;
    navegarA('registros', est);
}

function toggleFiltroAvanzado() {
    const f = document.getElementById('filtroAvanzado');
    if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function guardarConfigAutoArchivar() {
    const valor = $('chkAutoArchivar')?.checked ?? false;
    localStorage.setItem('memora_auto_archivar', valor);
    render();
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

function forzarLimpiezaCachePWA() {
    if ('caches' in window) {
        caches.keys().then(names => {
            for (let name of names) caches.delete(name);
        });
        mostrarAvisoMemora("Caché borrada con éxito. Recargando aplicación...", "Caché PWA", "refresh", () => {
            window.location.reload(true);
        });
    }
}

function cargarModoDemoSiAplica() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true') {
        const datosLocales = localStorage.getItem('memora_registros');
        if (!datosLocales || JSON.parse(datosLocales).length === 0) {
            const registrosDemo = [
                {
                    id: 101,
                    nombre: "Carlos López",
                    canal: "WhatsApp",
                    contacto: "099123456",
                    canal2: "Instagram",
                    contacto2: "@carloslopez_uy",
                    asunto: "Consulta por kit de cámaras",
                    identificador: "RUT 219998880011",
                    estado: "Esperando cliente",
                    comentarios: [{ texto: "Presupuesto enviado por WhatsApp.", fecha: "01/09/2026 10:30", editado: null, eliminado: false }],
                    fecha: new Date(Date.now() - (4 * 24 * 60 * 60 * 1000)).toISOString(),
                    ultimaModificacion: new Date(Date.now() - (4 * 24 * 60 * 60 * 1000)).toISOString()
                },
                {
                    id: 102,
                    nombre: "Mariana Gómez",
                    canal: "Instagram",
                    contacto: "@marianag_design",
                    canal2: "Email",
                    contacto2: "mariana@design.com",
                    asunto: "Diseño de renders 3D",
                    identificador: "Nº Cliente 452",
                    estado: "Cerrado",
                    comentarios: [{ texto: "Pago recibido correctamente.", fecha: "02/09/2026 16:15", editado: null, eliminado: false }],
                    fecha: new Date().toISOString(),
                    ultimaModificacion: new Date().toISOString()
                }
            ];
            localStorage.setItem('memora_registros', JSON.stringify(registrosDemo));
            localStorage.setItem('memora_profile_completed', 'true');
            localStorage.setItem('memora_admin_user_data', JSON.stringify({
                rolAdmin: 'Tester Demo',
                nombreAdmin: 'Usuario Demo',
                empresaAdmin: 'Mi Empresa'
            }));
            registros = registrosDemo;
        }
        mostrarBannerDemoSuperior();
    }
}

function mostrarBannerDemoSuperior() {
    if (document.getElementById('bannerModoDemo')) return;
    const banner = document.createElement('div');
    banner.id = 'bannerModoDemo';
    banner.style.cssText = 'background:#004F87; color:white; text-align:center; padding:8px 12px; font-size:0.8rem; font-weight:600; position:sticky; top:0; z-index:999; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);';
    
    banner.innerHTML = `
        <span>⚡ Estás probando el Modo Demo Sandbox</span>
        <button type="button" id="btnIrALandingDemo" style="background:#18a957; color:white; padding:5px 12px; border-radius:6px; border:none; text-decoration:none; font-size:0.75rem; font-weight:700; cursor:pointer;">
            Solicitar Licencia
        </button>
    `;
    document.body.prepend(banner);
    document.getElementById('btnIrALandingDemo').addEventListener('click', function(e) {
        e.preventDefault();
        window.top.location.href = "https://memora-landing-two.vercel.app/";
    });
}

document.addEventListener('DOMContentLoaded', () => {
    iniciarRelojHeader();
    cargarModoDemoSiAplica();
    if ($('estado')) $('estado').innerHTML = estados.map(e => `<option>${e}</option>`).join('');
    if ($('filtroEstado')) $('filtroEstado').innerHTML = '<option value="">Todos los estados</option>' + estados.map(e => `<option>${e}</option>`).join('');
    mostrarCanal();
    comprobarEstadoAccesoEInicial();
    render();
    setTimeout(inicializarGoogleDriveAPI, 1000);
});
