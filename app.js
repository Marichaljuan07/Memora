/* ==========================================================================
   MEMORA CRM - CORE LOGIC (v1.2.0-libre DEFINITIVO)
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
let comentariosTemporalesInicio = [];
let registrosUltimoFiltro = [];
let mostrandoArchivados = false;
let contactoOriginalBackup = "";
let currentStoryStep = 0;

const $ = id => document.getElementById(id);

function ahoraMemora() { return new Date(); }

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
            let diasAtraso = Math.floor(horasTranscurridas / 24);
            let textoAtraso = config.unidad === 'horas' ? `${Math.floor(horasTranscurridas)} hs de atraso` : `${diasAtraso} día(s) de atraso`;
            
            let dCreacion = new Date(r.fecha);
            let dModif = new Date(r.ultimaModificacion || r.fecha);
            
            let fechaCreacionTexto = !isNaN(dCreacion.getTime()) 
                ? `${String(dCreacion.getDate()).padStart(2, '0')}/${String(dCreacion.getMonth() + 1).padStart(2, '0')}/${dCreacion.getFullYear()}` 
                : r.fecha;
            let fechaRevisionTexto = !isNaN(dModif.getTime()) 
                ? `${String(dModif.getDate()).padStart(2, '0')}/${String(dModif.getMonth() + 1).padStart(2, '0')}/${dModif.getFullYear()}` 
                : '-';
            let { avatarHTML, tituloHTML } = obtenerAvatarEIdentidad(r);
            let btnCanal = obtenerBotonAccionCanal(r);

            let accionClick = esPC ? `editar(${r.id})` : `abrirFicha(${r.id})`;

            return `
            <div class="card client-card" onclick="${accionClick}" style="cursor:pointer;">
                <div class="client-info">
                    <div class="avatar avatar-blue">${avatarHTML}</div>
                    <div class="client-details">
                        <h4>${tituloHTML}</h4>
                        <div class="client-sub">${r.canal} • ${r.contacto}</div>
                    </div>
                </div>
                <div>${r.asunto ? `<span style="font-size:0.8rem; font-weight:600; color:var(--primary-blue);">Asunto: ${r.asunto}</span>` : '-'}</div>
                <div class="tag-row"><span class="tag ${obtenerClaseEstado(r.estado)}">${r.estado}</span></div>
                <div style="font-size:0.75rem;">
                    <span style="color:var(--text-secondary);">Creado: <strong>${fechaCreacionTexto}</strong></span><br>
                    <span style="color:gray;">Última rev: ${fechaRevisionTexto}</span><br>
                    <strong style="color:#C2410C;">${textoAtraso}</strong><br>
                </div>
                <div style="display:flex; gap:6px; align-items:center; margin-top:8px;">
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
                    <strong>${campo === 'nombre' ? 'Cliente' : r.canal} ${datoCoincidente}</strong>
                </div>
                <div class="drop-item-sub">Ya existe · ${asuntoTexto}</div>
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
   5. NAVEGACIÓN Y RUTEO SEGURO
   ========================================================================== */
function iniciarRelojHeader() {
    function actualizar() {
        const d = ahoraMemora();
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        if ($('relojHeader')) $('relojHeader').innerText = `${diasSemana[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
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
    
    const secTarget = $(`sec-${pantalla}`);
    if (secTarget) secTarget.style.display = 'block';

    if ($('btnHeaderBack')) {
        $('btnHeaderBack').style.display = (pantalla === 'formulario' || pantalla === 'ficha') ? 'block' : 'none';
    }

    if ($(`nav-${pantalla}`)) $(`nav-${pantalla}`).classList.add('active');

    try {
        if (pantalla === 'perfil') { 
            cargarDiagnosticoSistema(); 
            cargarDatosUsuarioPerfil(); 
        }
        render();
    } catch (err) {
        console.error("Error al renderizar pestaña:", err);
    }
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
    const main = document.querySelector('.main-content');
    const nav = document.querySelector('.bottom-nav');
    
    if (main) {
        main.style.filter = 'none';
        main.style.display = 'block';
    }
    if (nav) {
        nav.style.display = 'flex';
    }
    
    cargarDatosUsuarioPerfil();
    if ($('sec-inicio')?.style.display !== 'none' || $('sec-registros')?.style.display !== 'none' || $('sec-perfil')?.style.display !== 'none') {
        // Mantiene la vista activa
    } else {
        navegarA('inicio');
    }
}

/* ==========================================================================
   6. AUXILIARES DE VISTA Y CARDS
   ========================================================================== */
function obtenerAvatarEIdentidad(r) {
    let badgeText = 'CN';
    let iconName = null;
    if (r.canal === 'WhatsApp') badgeText = 'WP';
    else if (r.canal === 'Instagram') badgeText = 'INS';
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

function obtenerBotonAccionCanal(r) {
    const contactoLimpio = (r.contacto || '').replace(/\s+/g, '');
    
    if (r.canal === 'WhatsApp') {
        const numWA = contactoLimpio.startsWith('+') ? contactoLimpio.replace('+', '') : `598${contactoLimpio.replace(/^0/, '')}`;
        return `<a href="https://wa.me/${numWA}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel btn-channel-wa"><span class="material-symbols-outlined" style="font-size:1rem;">chat</span> WhatsApp</a>`;
    } 
    else if (r.canal === 'Instagram') {
        const userInsta = contactoLimpio.replace('@', '');
        return `<a href="https://instagram.com/${userInsta}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel btn-channel-ins"><span class="material-symbols-outlined" style="font-size:1rem;">photo_camera</span> Instagram</a>`;
    } 
    else if (r.canal === 'Facebook') {
        const userFB = contactoLimpio.replace('@', '');
        return `<a href="https://m.me/${userFB}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel" style="background-color:#1877F2; color:white; border:none; padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:1rem;">forum</span> Facebook</a>`;
    } 
    else if (r.canal === 'Telegram') {
        const userTG = contactoLimpio.replace('@', '');
        return `<a href="https://t.me/${userTG}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel" style="background-color:#229ED9; color:white; border:none; padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:1rem;">send</span> Telegram</a>`;
    } 
    else if (r.canal === 'Email') {
        return `<a href="mailto:${r.contacto}" onclick="event.stopPropagation();" class="btn-action-channel btn-channel-mail"><span class="material-symbols-outlined" style="font-size:1rem;">mail</span> Email</a>`;
    }
    
    return `<button onclick="event.stopPropagation(); abrirFicha(${r.id});" class="btn-action-channel btn-channel-generic"><span class="material-symbols-outlined" style="font-size:1rem;">visibility</span> Ver</button>`;
}

function tarjetaEstetica(r) {
    const dCreacion = new Date(r.fecha);
    const dModif = new Date(r.ultimaModificacion || r.fecha);
    
    let fechaCreacionTexto = !isNaN(dCreacion.getTime()) 
        ? `${String(dCreacion.getDate()).padStart(2, '0')}/${String(dCreacion.getMonth() + 1).padStart(2, '0')}/${dCreacion.getFullYear()} ${String(dCreacion.getHours()).padStart(2, '0')}:${String(dCreacion.getMinutes()).padStart(2, '0')}` 
        : r.fecha;
        
    let fechaRevisionTexto = !isNaN(dModif.getTime()) 
        ? `${String(dModif.getDate()).padStart(2, '0')}/${String(dModif.getMonth() + 1).padStart(2, '0')}/${dModif.getFullYear()}` 
        : '-';
    
    const { avatarHTML, tituloHTML } = obtenerAvatarEIdentidad(r);
    const btnCanal = obtenerBotonAccionCanal(r);
    const textoId = obtenerTextoIdentificador(r);
    let comentariosActivos = (r.comentarios || []).filter(c => !c.eliminado);
    let ultimoComentario = comentariosActivos.length > 0 ? comentariosActivos[comentariosActivos.length - 1].texto : null;

    const esPC = window.innerWidth >= 800;
    let accionClick = esPC ? `editar(${r.id})` : `abrirFicha(${r.id})`;

    return `
    <div class="card client-card" style="cursor:pointer;" onclick="${accionClick}">
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
            <span style="font-size:0.68rem; color:gray;">Última rev: ${fechaRevisionTexto}</span>
        </div>
        
        <div style="display:flex; gap:6px; align-items:center; margin-top:8px;">
            ${btnCanal}
            <button class="btn-action-edit" onclick="event.stopPropagation(); editar(${r.id});">Editar</button>
        </div>
    </div>`;
}

function render() {
    try {
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
            let matchCanal = !canal || r.canal === canal;
            let matchDato = !dato || (r.contacto || '').toLowerCase().includes(dato);
            let matchAsunto = !asunto || (r.asunto || '').toLowerCase().includes(asunto);
            let matchIdent = !ident || (r.identificador || '').toLowerCase().includes(ident);
            let matchEstado = !estado || r.estado === estado;
            let matchCom = !com || JSON.stringify(r.comentarios || []).toLowerCase().includes(com);

            return matchBusqueda && matchNombre && matchCanal && matchDato && matchAsunto && matchIdent && matchEstado && matchCom;
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
    } catch (err) {
        console.error("Error dentro de render():", err);
    }
}

/* ==========================================================================
   7. FORMULARIO, CONTROL DE CAMBIO DE DATO Y EDICIÓN (PC Y MÓVIL)
   ========================================================================== */
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

// --- COMENTARIOS TEMPORALES EN PC CON EDITAR Y ELIMINAR ---
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
    limpiarInicio();
    render();
    mostrarAvisoMemora(editando ? 'Registro actualizado exitosamente.' : 'Registro guardado exitosamente.', 'MEMORA', 'check_circle');
}

function limpiarInicio() {
    ['nombreInicio', 'contactoInicio', 'asuntoInicio', 'valorIdInicio', 'comentarioInicio'].forEach(id => {
        if ($(id)) $(id).value = '';
    });
    if ($('tipoIdInicio')) $('tipoIdInicio').value = 'Ninguno';
    if ($('canalInicio')) $('canalInicio').value = 'WhatsApp';
    
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
            <button onclick="limpiarInicio()" style="flex:1; background:#E5E7EB; color:#374151; border:none; padding:14px; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.95rem;">
                Limpiar
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

function prepararNuevoRegistro() {
    if (window.innerWidth >= 800) {
        navegarA('inicio');
        limpiarInicio();
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

        if ($('asuntoInicio')) $('asuntoInicio').value = r.asunto || '';
        if ($('estadoInicio')) $('estadoInicio').value = r.estado || 'Consulta nueva';
        
        if ($('tipoIdInicio')) $('tipoIdInicio').value = r.identificador ? (r.identificador.startsWith('RUT') ? 'RUT' : 'N° de Cliente') : 'Ninguno';
        mostrarIdInicio();
        if ($('valorIdInicio')) $('valorIdInicio').value = r.identificador || '';

        comentariosTemporalesInicio = JSON.parse(JSON.stringify(r.comentarios || []));
        renderComentariosTemporalesInicio();

        navegarA('inicio');

        if ($('tituloFormularioInicio')) {
            $('tituloFormularioInicio').innerText = `✏️ Editando Registro: ${r.nombre || r.contacto}`;
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
                <button onclick="limpiarInicio()" style="flex:1; background:#E5E7EB; color:#374151; border:none; padding:14px; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.9rem;">
                    Cancelar
                </button>
            `;
        }

        setTimeout(() => {
            $('focoFormularioInicio')?.scrollIntoView({ behavior: 'smooth' });
            mostrarAvisoMemora(`Datos de "${r.nombre || r.contacto}" cargados en el formulario de Inicio para su edición.`, "MEMORA PC", "edit");
        }, 150);

    } else {
        if ($('nombre')) $('nombre').value = r.nombre || '';
        if ($('canal')) $('canal').value = r.canal;
        mostrarCanal();
        if ($('contacto')) $('contacto').value = r.contacto || '';
        if ($('asunto')) $('asunto').value = r.asunto || '';
        if ($('estado')) $('estado').value = r.estado;
        if ($('tipoId')) $('tipoId').value = r.identificador ? (r.identificador.startsWith('RUT') ? 'RUT' : 'N° de Cliente') : 'Ninguno';
        mostrarId();
        if ($('valorId')) $('valorId').value = r.identificador || '';
        
        comentariosEdicionActual = JSON.parse(JSON.stringify(r.comentarios || []));
        renderListaComentariosEdicion();
        navegarA('formulario');
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
                    ${r.asunto ? `<p style="font-size: 0.8rem; font-weight:600; color:var(--primary-blue); margin-top:2px;">Asunto: ${r.asunto}</p>` : ''}
                    ${r.identificador ? `<p style="font-size: 0.75rem; color: var(--text-secondary);">${obtenerTextoIdentificador(r)}</p>` : ''}
                    <div style="margin-top: 6px;"><span class="tag ${obtenerClaseEstado(r.estado)}">${r.estado}</span></div>
                </div>
            </div>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <button onclick="editar(${r.id})" style="flex: 1; background-color: var(--primary-blue); color: white; border: none; padding: 10px; border-radius: 10px; font-weight: 600; cursor:pointer;">Editar</button>
            <button onclick="archivarCliente(${r.id})" style="flex: 1; background-color: #E5E7EB; color: #374151; border: none; padding: 10px; border-radius: 10px; font-weight: 600; cursor:pointer;">${r.estado === 'Archivado' ? 'Desarchivar' : 'Archivar'}</button>
            <button onclick="eliminar(${r.id})" style="flex: 1; background-color: #FEE2E2; color: #DC2626; border: none; padding: 10px; border-radius: 10px; font-weight: 600; cursor:pointer;">Eliminar</button>
        </div>
        <div class="section-header"><h3>Comentarios</h3></div>
        ${ultimoComentario ? `<div class="card" style="padding: 14px; margin-bottom: 12px; border-left: 4px solid var(--primary-blue);"><p style="font-size:0.9rem;">${ultimoComentario.texto}</p></div>` : '<p style="font-size:0.85rem; color:var(--text-secondary);">Sin comentarios.</p>'}
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
        'Doc / RUT / N° Cliente', 'Nombre del Cliente', 'Asunto / Motivo', 'Canal', 'Teléfono / WhatsApp',
        'Usuario (@)', 'Correo Electrónico', 'Estado Actual', 'Último Comentario',
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
            clasif.telefono, clasif.usuario, clasif.email, r.estado || 'Consulta nueva',
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
        contenido += `<hr><b>${r.nombre || r.contacto}</b><br>Asunto: ${r.asunto || 'N/A'}<br>Contacto: ${r.canal} - ${r.contacto}<br>Estado: ${r.estado}<br>`;
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
    
    if ($('sys-version')) $('sys-version').innerText = "v1.2.0-libre";
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
}

function toggleModalConfigUser() {
    const modal = $('modalConfigAdmin');
    if (modal) modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}

function eliminar(id) {
    mostrarConfirmMemora("¿Es seguro de eliminar este registro permanentemente?", "Eliminar Cliente", "delete", "#DC2626", (confirmado) => {
        if (confirmado) {
            registros = registros.filter(x => x.id !== id);
            guardarLocal();
            limpiarInicio();
            navegarA('registros');
        }
    });
}

function archivarCliente(id) {
    let r = registros.find(x => x.id === id);
    if (!r) return;
    r.estado = r.estado === 'Archivado' ? 'Consulta nueva' : 'Archivado';
    r.ultimaModificacion = ahoraMemora().toISOString();
    guardarLocal();
    limpiarInicio();
    navegarA('registros');
}

function alternarVistaArchivados() {
    mostrandoArchivados = !mostrandoArchivados;
    if ($('filtroEstado')) $('filtroEstado').value = '';
    render();
}

function guardarLocal() { localStorage.setItem('memora_registros', JSON.stringify(registros)); }

function limpiar() {
    ['nombre', 'contacto', 'asunto', 'valorId', 'comentario'].forEach(x => { if ($(x)) $(x).value = ''; });
    editando = null;
    comentariosEdicionActual = [];
    renderListaComentariosEdicion();
    mostrarCanal();
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
                    asunto: "Diseño de renders 3D",
                    identificador: "N° Cliente 452",
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
        <a href="./#contacto" style="background:#0EA5E9; color:white; padding:5px 12px; border-radius:6px; text-decoration:none; font-size:0.75rem; font-weight:700;">Solicitar Licencia</a>
    `;
    document.body.prepend(banner);
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
