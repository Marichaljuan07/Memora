/* ==========================================================================
   MEMORA CRM - CORE LOGIC (v1.4.3)
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

const CANALES_DISPONIBLES = ["WhatsApp", "Instagram", "Email", "LinkedIn", "Facebook", "Telegram"];
const MEMORA_VERSION = "1.4.3";
const MEMORA_THEME_KEY = "memora_tema";
const PREFIJOS_WHATSAPP = [
    { codigo: "+598", etiqueta: "UY +598" },
    { codigo: "+549", etiqueta: "AR móvil +549" },
    { codigo: "+54", etiqueta: "AR +54" },
    { codigo: "+55", etiqueta: "BR +55" },
    { codigo: "+595", etiqueta: "PY +595" },
    { codigo: "+56", etiqueta: "CL +56" },
    { codigo: "+591", etiqueta: "BO +591" },
    { codigo: "+51", etiqueta: "PE +51" },
    { codigo: "+57", etiqueta: "CO +57" },
    { codigo: "+593", etiqueta: "EC +593" },
    { codigo: "+58", etiqueta: "VE +58" },
    { codigo: "+52", etiqueta: "MX +52" },
    { codigo: "+506", etiqueta: "CR +506" },
    { codigo: "+507", etiqueta: "PA +507" },
    { codigo: "+502", etiqueta: "GT +502" },
    { codigo: "+503", etiqueta: "SV +503" },
    { codigo: "+504", etiqueta: "HN +504" },
    { codigo: "+505", etiqueta: "NI +505" },
    { codigo: "+1", etiqueta: "US/CA +1" },
    { codigo: "+34", etiqueta: "ES +34" },
    { codigo: "+39", etiqueta: "IT +39" },
    { codigo: "+33", etiqueta: "FR +33" },
    { codigo: "+44", etiqueta: "UK +44" },
    { codigo: "+49", etiqueta: "DE +49" },
    { codigo: "+351", etiqueta: "PT +351" }
];

// ==========================================
// DETECCIÓN AUTOMÁTICA DE ENTORNO (DEMO vs PRO)
// ==========================================
// Si la URL contiene 'demo', activa el modo Demo. 
// Si es 'app.memoraapp.net' o localhost/producción, se comporta como PRO.
const MODO_DEMO = window.location.hostname.includes('demo');
const LIMITE_REGISTROS_DEMO = 15;


function validarCupoDemo() {
    const banner = document.getElementById('bannerModoDemo');
    
    // Si no es demo, ocultamos el banner completamente
    if (!MODO_DEMO) {
        if (banner) banner.style.display = 'none';
        return true;
    }

    // Si es demo, mostramos el banner y aplicamos la lógica
    if (banner) banner.style.display = 'block';

    const activos = registros.filter(r => r.estado !== 'Archivado').length;
    const elemContador = document.getElementById('contadorCupoDemo');
    if (elemContador) elemContador.innerText = activos;

    if (activos >= LIMITE_REGISTROS_DEMO) {
        mostrarAvisoMemora(
            `Has alcanzado el límite de ${LIMITE_REGISTROS_DEMO} registros activos de la versión Demo.\n\nTe redirigiremos a la web para adquirir MEMORA PRO sin límites.`,
            "Límite Demo Alcanzado ⚡", 
            "warning",
            () => {
                window.open('https://memoraapp.net', '_blank');
            }
        );
        return false;
    }
    return true;
}


function solicitarLicenciaPro() {
    window.open('https://memoraapp.net', '_blank');
}

let registros = JSON.parse(localStorage.getItem('memora_registros') || '[]');
let editando = null;
let comentariosEdicionActual = [];
let comentariosTemporalesInicio = [];
let registrosUltimoFiltro = [];
let mostrandoArchivados = false;
let contactoOriginalBackup = "";
let prefijoOriginalBackup = "+598";
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

function selloArchivoMemora(d = ahoraMemora()) {
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${anio}${mes}${dia}_${hora}${min}`;
}

function obtenerSaludoPorHora(d = ahoraMemora()) {
    const hora = d.getHours();
    if (hora >= 5 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 20) return 'Buenas tardes';
    return 'Buenas noches';
}

function actualizarSaludoDinamico(d = ahoraMemora()) {
    const datosRaw = localStorage.getItem('memora_admin_user_data');
    const datos = datosRaw ? JSON.parse(datosRaw) : { nombreAdmin: '' };
    const primerNombre = datos.nombreAdmin ? datos.nombreAdmin.trim().split(/\s+/)[0] : 'Usuario';
    if ($('saludo')) $('saludo').innerText = `${obtenerSaludoPorHora(d)}, ${primerNombre}`;
}

function aplicarTemaMemora(tema, persistir = false) {
    const temaFinal = tema === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', temaFinal);
    if (persistir) localStorage.setItem(MEMORA_THEME_KEY, temaFinal);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', temaFinal === 'dark' ? '#0B1220' : '#004F87');
    actualizarControlTemaMemora();
}

function inicializarTemaMemora() {
    aplicarTemaMemora(localStorage.getItem(MEMORA_THEME_KEY) || 'light', false);
}

function alternarModoOscuro() {
    const actual = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    aplicarTemaMemora(actual === 'dark' ? 'light' : 'dark', true);
}

function actualizarControlTemaMemora() {
    const oscuro = document.documentElement.getAttribute('data-theme') === 'dark';
    if ($('temaMemoraIcono')) $('temaMemoraIcono').innerText = oscuro ? 'light_mode' : 'dark_mode';
    if ($('temaMemoraTexto')) $('temaMemoraTexto').innerText = oscuro ? 'Usar modo claro' : 'Usar modo oscuro';
    if ($('temaMemoraEstado')) $('temaMemoraEstado').innerText = oscuro ? 'Modo oscuro activo' : 'Modo claro activo';
}

function opcionesPrefijosWhatsAppHTML(prefijoSeleccionado = '+598') {
    return PREFIJOS_WHATSAPP.map(p => `<option value="${p.codigo}" ${p.codigo === prefijoSeleccionado ? 'selected' : ''}>${p.etiqueta}</option>`).join('');
}

function separarNumeroWhatsapp(valor = '') {
    const original = String(valor || '').trim();
    const digitos = original.replace(/\D/g, '');
    if (!digitos) return { prefijo: '+598', numero: '' };

    const candidatos = [...PREFIJOS_WHATSAPP].sort((a, b) => b.codigo.length - a.codigo.length);
    if (original.startsWith('+')) {
        const encontrado = candidatos.find(p => digitos.startsWith(p.codigo.replace(/\D/g, '')));
        if (encontrado) {
            const prefDigits = encontrado.codigo.replace(/\D/g, '');
            return { prefijo: encontrado.codigo, numero: digitos.slice(prefDigits.length) };
        }
    }

    return { prefijo: '+598', numero: original };
}

function normalizarNumeroWhatsapp(valor = '', prefijo = '+598') {
    const original = String(valor || '').trim();
    if (!original) return '';

    const digitos = original.replace(/\D/g, '');
    if (!digitos) return '';
    if (original.startsWith('+')) return `+${digitos}`;

    const prefDigits = String(prefijo || '+598').replace(/\D/g, '') || '598';
    if (digitos.startsWith(prefDigits) && digitos.length > prefDigits.length + 5) return `+${digitos}`;

    const numeroLocal = digitos.replace(/^0+/, '');
    return `+${prefDigits}${numeroLocal}`;
}

function normalizarContactoSegunCanal(canal, contacto, prefijo = '+598') {
    return canal === 'WhatsApp' ? normalizarNumeroWhatsapp(contacto, prefijo) : String(contacto || '').trim();
}

function cargarContactoEnFormulario(sufijo = '', canal = 'WhatsApp', valor = '') {
    const input = $(`contacto${sufijo}`);
    if (!input) return;

    if (canal === 'WhatsApp') {
        const partes = separarNumeroWhatsapp(valor);
        const prefijo = $(`prefijoWhatsapp${sufijo}`);
        if (prefijo) {
            if (!prefijo.options.length) prefijo.innerHTML = opcionesPrefijosWhatsAppHTML(partes.prefijo);
            prefijo.value = partes.prefijo;
        }
        input.value = partes.numero;
    } else {
        input.value = valor || '';
    }
}

function actualizarPrefijoCanalExtra(selectCanal, valorInicial = null) {
    if (!selectCanal) return;
    const bloque = selectCanal.closest('.sub-canal-block, .sub-canal-block-movil');
    if (!bloque) return;

    const prefijo = bloque.querySelector('.wa-prefix-extra');
    const input = bloque.querySelector('input');
    if (!prefijo || !input) return;

    if (!prefijo.options.length) prefijo.innerHTML = opcionesPrefijosWhatsAppHTML('+598');
    const esWhatsapp = selectCanal.value === 'WhatsApp';
    prefijo.style.display = esWhatsapp ? 'block' : 'none';
    input.inputMode = esWhatsapp ? 'tel' : 'text';

    if (valorInicial !== null) {
        if (esWhatsapp) {
            const partes = separarNumeroWhatsapp(valorInicial);
            prefijo.value = partes.prefijo;
            input.value = partes.numero;
        } else {
            input.value = valorInicial || '';
        }
    }
}

function obtenerUltimaRevisionEfectiva(r) {
    return r.ultimaRevision || r.ultimaModificacion || r.fecha;
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
   2. GOOGLE DRIVE API v3 (BLOQUEADO EN MODO DEMO)
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
    if (MODO_DEMO) {
        mostrarAvisoMemora(
            "El respaldo automático en la nube (Google Drive) es una función exclusiva de MEMORA PRO.\n\nObtén la versión completa para sincronizar tus datos.",
            "Función PRO 🔒",
            "warning",
            () => {
                window.open('https://memoraapp.net', '_blank');
            }
        );
        return;
    }

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
    if (MODO_DEMO) {
        mostrarAvisoMemora(
            "El respaldo en la nube es una función exclusiva de MEMORA PRO.",
            "Función PRO 🔒",
            "warning",
            () => window.open('https://memoraapp.net', '_blank')
        );
        return;
    }

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
    if (MODO_DEMO) {
        mostrarAvisoMemora(
            "La restauración desde la nube es una función exclusiva de MEMORA PRO.",
            "Función PRO 🔒",
            "warning",
            () => window.open('https://memoraapp.net', '_blank')
        );
        return;
    }

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

        mostrarConfirmMemora(
