/* ==========================================================================
   MEMORA CRM - CORE LOGIC (v1.5.0 ESTABLE)
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
const MEMORA_VERSION = "1.5.0";
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
    if (MODO_DEMO) {
        mostrarAvisoMemora(
            "El auto-guardado en la nube es una función exclusiva de MEMORA PRO.",
            "Función PRO 🔒",
            "warning",
            () => window.open('https://memoraapp.net', '_blank')
        );
        if ($('chkAutoNube')) $('chkAutoNube').checked = false;
        return;
    }
    const val = $('chkAutoNube')?.checked ?? false;
    localStorage.setItem('memora_auto_nube', val);
}

function sincronizarAutoNube(r) {
    if (!MODO_DEMO && localStorage.getItem('memora_nube_conectado') === 'true' && localStorage.getItem('memora_auto_nube') === 'true') {
        subirRespaldoADrive();
    }
}

/* ==========================================================================
   3. SEGUIMIENTO PERSONALIZADO Y REVISIÓN
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
        return `⚠️ ${hs} hs de atraso`;
    }
    let dias = Math.floor(hs / 24);
    let hsRestantes = hs % 24;
    
    if (hsRestantes === 0) {
        return `⚠️ ${dias} día(s) de atraso`;
    }
    return `⚠️ ${dias} día(s) y ${hsRestantes} hs de atraso`;
}

function marcarComoRevisado(id, event = null) {
    if (event) event.stopPropagation();
    let r = registros.find(x => x.id === id);
    if (!r) return;

    r.ultimaRevision = ahoraMemora().toISOString();
    guardarLocal();
    sincronizarAutoNube(r);
    render();
    mostrarAvisoMemora("Seguimiento actualizado. Registro marcado como revisado.", "Revisión", "check_circle");
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
        let refFecha = new Date(obtenerUltimaRevisionEfectiva(r));
        let horasTranscurridas = (ahora - refFecha) / (1000 * 60 * 60);
        return horasTranscurridas >= horasLimite && r.estado !== "Cerrado" && r.estado !== "Perdido" && r.estado !== "Archivado";
    });
    
    if ($('contadorSeguimiento')) $('contadorSeguimiento').innerText = lista.length;
    if ($('contenedorSeguimiento')) {
        const esPC = window.innerWidth >= 800;
        $('contenedorSeguimiento').innerHTML = lista.map(r => {
            let refFecha = new Date(obtenerUltimaRevisionEfectiva(r));
            let horasTranscurridas = (ahora - refFecha) / (1000 * 60 * 60);
            let textoAtraso = formatearTiempoAtraso(horasTranscurridas);
            
            let esUrgenciaCritica = horasTranscurridas >= (horasLimite * 2);
            let colorChipBg = esUrgenciaCritica ? '#FEE2E2' : '#FEF3C7';
            let colorChipText = esUrgenciaCritica ? '#991B1B' : '#92400E';

            let dCreacion = new Date(r.fecha);
            let dRev = new Date(obtenerUltimaRevisionEfectiva(r));
            
            let fechaCreacionTexto = !isNaN(dCreacion.getTime()) 
                ? `${String(dCreacion.getDate()).padStart(2, '0')}/${String(dCreacion.getMonth() + 1).padStart(2, '0')}/${dCreacion.getFullYear()} ${String(dCreacion.getHours()).padStart(2, '0')}:${String(dCreacion.getMinutes()).padStart(2, '0')}`
                : r.fecha;
                
            let fechaRevisionTexto = !isNaN(dRev.getTime()) 
                ? `${String(dRev.getDate()).padStart(2, '0')}/${String(dRev.getMonth() + 1).padStart(2, '0')}/${dRev.getFullYear()} ${String(dRev.getHours()).padStart(2, '0')}:${String(dRev.getMinutes()).padStart(2, '0')}`
                : '-';

            let { avatarHTML, tituloHTML } = obtenerAvatarEIdentidad(r);
            let btnCanal = obtenerBotonAccionCanal(r);
            let accionClick = esPC ? `editar(${r.id})` : `abrirFicha(${r.id})`;

            return `
            <div class="card client-card" onclick="${accionClick}" style="cursor:pointer; background:#ffffff; padding: 12px 14px; margin-bottom: 8px;">
                <div class="client-info">
                    <div class="avatar avatar-blue">${avatarHTML}</div>
                    <div class="client-details">
                        <h4>${tituloHTML}</h4>
                        <div class="client-sub">${r.canal} • ${r.contacto}</div>
                    </div>
                </div>
                <div>${r.asunto ? `<span style="font-size:0.8rem; font-weight:600; color:var(--primary-blue);">${traducirCadenaMemora('Asunto:')} ${r.asunto}</span>` : '-'}</div>
                <div class="tag-row" style="margin-top:4px; margin-bottom:4px;"><span class="tag ${obtenerClaseEstado(r.estado)}">${r.estado}</span></div>
                <div style="margin-top: 4px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="display:inline-block; background:${colorChipBg}; color:${colorChipText}; font-size:0.72rem; font-weight:700; padding:2px 6px; border-radius:6px;">
                        ${textoAtraso}
                    </span>
                    <button class="btn-action-edit" style="background:#E0F2FE; color:#0284C7; font-size:0.72rem; padding:4px 8px;" onclick="marcarComoRevisado(${r.id}, event)">
                        ✔ Revisado
                    </button>
                </div>
                <div class="card-footer-row" style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:6px;">
                    <div class="channel-action-area" style="display:flex; gap:6px; align-items:center;">
                        ${btnCanal}
                    </div>
                    <div class="time-ago" style="font-size:0.70rem; color:var(--text-secondary); text-align:right; line-height:1.2;">
                        <span>Creado: <strong>${fechaCreacionTexto}</strong></span><br>
                        <span>Última rev: <strong>${fechaRevisionTexto}</strong></span>
                    </div>
                </div>
            </div>`;
        }).join('') || `<p style="font-size:0.8rem; color:var(--text-secondary);">${traducirCadenaMemora('Sin seguimientos pendientes.')}</p>`;
    }
}

/* ==========================================================================
   4. CANALES ÚNICOS Y BÚSQUEDA PREDICTIVA UNIFICADA
   ========================================================================== */
function obtenerCanalesUtilizadosEnFormulario(sufijo = '') {
    let usados = [];
    const canalPrincipal = $(`canal${sufijo}`)?.value;
    if (canalPrincipal) usados.push(canalPrincipal);

    const contenedorId = sufijo ? `contenedorCanalesExtra${sufijo}` : 'contenedorCanalesExtraMovil';
    const contenedor = $(contenedorId);
    if (contenedor) {
        contenedor.querySelectorAll('.sub-canal-select').forEach(sel => {
            if (sel.value) usados.push(sel.value);
        });
    }
    return usados;
}

function actualizarOpcionesCanales(sufijo = '') {
    const canalPrincipalEl = $(`canal${sufijo}`);
    if (!canalPrincipalEl) return;

    const canalPrincipalVal = canalPrincipalEl.value || 'WhatsApp';
    const usados = obtenerCanalesUtilizadosEnFormulario(sufijo);

    if (!canalPrincipalEl.innerHTML || canalPrincipalEl.children.length === 0) {
        canalPrincipalEl.innerHTML = CANALES_DISPONIBLES.map(c => `<option value="${c}">${c}</option>`).join('');
        canalPrincipalEl.value = canalPrincipalVal;
    }

    const contenedorId = sufijo ? `contenedorCanalesExtra${sufijo}` : 'contenedorCanalesExtraMovil';
    const contenedor = $(contenedorId);
    if (!contenedor) return;

    contenedor.querySelectorAll('.sub-canal-select').forEach(sel => {
        const valActual = sel.value;
        const opcionesValidas = CANALES_DISPONIBLES.filter(c => c === valActual || !usados.includes(c));
        sel.innerHTML = opcionesValidas.map(c => `<option value="${c}" ${c === valActual ? 'selected' : ''}>${c}</option>`).join('');
    });
}

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
        let datoCoincidente = campo === 'nombre' ? (r.nombre || traducirCadenaMemora('Sin nombre')) : (r.contacto || traducirCadenaMemora('Sin contacto'));
        let asuntoTexto = r.asunto
            ? `${textoIdiomaMemora150('Último registro:','Latest record:','Último registro:')} ${r.asunto}`
            : traducirCadenaMemora('Sin asunto registrado');

        return `
            <div class="drop-item-card" onclick="seleccionarCoincidencia(${r.id}, '${contenedorDropId}')">
                <div class="drop-item-header">
                    <strong>${campo === 'nombre' ? traducirCadenaMemora('Cliente') : r.canal}: ${datoCoincidente}</strong>
                </div>
                <div class="drop-item-sub">${textoIdiomaMemora150('Ya existe','Already exists','Já existe')} • ${asuntoTexto}</div>
                <div class="drop-item-badge ${obtenerClaseEstado(r.estado)}">${traducirCadenaMemora(r.estado)}</div>
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
    actualizarSaludoDinamico();
    setInterval(actualizar, 1000);
    setInterval(() => actualizarSaludoDinamico(), 60000);
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
    
    if (document.querySelector('.bottom-nav')) {
        document.querySelector('.bottom-nav').style.display = 'flex';
    }

    if (!perfilCompleto) {
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
    const stories = [
        {
            icon: "waving_hand",
            title: "Bienvenido a Memora",
            text: "Memora te ayuda a organizar clientes, conversaciones y seguimientos para que no dependas de acordarte de todo."
        },
        {
            icon: "person_add",
            title: "Todo empieza con un registro",
            text: "Guardá a cada cliente con su motivo de contacto, estado, comentarios y los canales por donde hablás con él: WhatsApp, Instagram, LinkedIn y más."
        },
        {
            icon: "schedule",
            title: "Sabé a quién volver a contactar",
            text: "Definí cuánto tiempo puede pasar sin actividad. Cuando un registro supera ese plazo, Memora lo muestra en Seguimiento Requerido."
        },
        {
            icon: "check_circle",
            title: "¿Todo sigue igual? Marcá Revisado",
            text: "Si revisaste un caso y todavía no cambió nada, marcá Revisado. Memora registra la revisión y vuelve a programar el seguimiento sin modificar la información del cliente."
        },
        {
            icon: "chat",
            title: "Volvé a la conversación en un toque",
            text: "Usá los botones de cada canal para retomar el contacto directamente. En WhatsApp, Memora puede dejar preparado el mensaje para continuar la conversación."
        },
        {
            icon: "cloud_done",
            title: "Tus datos siguen siendo tuyos",
            text: "Podés respaldar tu información en Google Drive y exportar tus registros a Excel, PDF o JSON cuando lo necesites."
        }
    ];

    const current = stories[currentStoryStep] || stories[0];
    if ($('storyContent')) {
        $('storyContent').innerHTML = `
            <span class="material-symbols-outlined story-icon">${current.icon}</span>
            <h3 style="margin-bottom:8px;">${current.title}</h3>
            <p style="font-size:0.9rem; color:#6b7280; line-height:1.4;">${current.text}</p>
        `;
    }

    const barContainer = document.querySelector('.stories-progress-bar');
    if (barContainer) {
        barContainer.innerHTML = stories.map((_, i) => `
            <div class="story-segment"><div id="story-fill-${i}" class="story-segment-fill" style="width: ${i <= currentStoryStep ? '100%' : '0%'};"></div></div>
        `).join('');
    }

    if ($('btnNextStory')) $('btnNextStory').innerText = currentStoryStep === stories.length - 1 ? "Ingresar a Memora" : "Siguiente";
}

function siguienteStory() {
    const datosRaw = localStorage.getItem('memora_admin_user_data');
    const datos = datosRaw ? JSON.parse(datosRaw) : { nombreAdmin: 'Usuario' };

    if (currentStoryStep < 5) {
        currentStoryStep++;
        renderStoryStep(datos.nombreAdmin);
    } else {
        if ($('modalStoriesMemora')) $('modalStoriesMemora').style.display = 'none';
        desbloquearInterfazCompleta();
    }
}

function desbloquearInterfazCompleta() {
    if (document.querySelector('.main-content')) document.querySelector('.main-content').style.filter = 'none';

    const nav = document.querySelector('.bottom-nav');
    if (nav) {
        nav.style.display = 'flex';
        nav.style.visibility = 'visible';
        nav.style.opacity = '1';
        nav.style.zIndex = '99999';
    }

    cargarDatosUsuarioPerfil();
    navegarA('inicio');
}

/* ==========================================================================
   6. AUXILIARES DE VISTA Y CARDS
   ========================================================================== */
function obtenerAvatarEIdentidad(r) {
    let badgeText = 'CN';
    let iconName = null;

    if (r.canal === 'WhatsApp') badgeText = 'WA';
    else if (r.canal === 'Instagram') badgeText = 'IG';
    else if (r.canal === 'Email') iconName = 'alternate_email';
    else if (r.canal === 'LinkedIn') iconName = 'badge';
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
    let tipo = r.tipoIdentificador || (val.toLowerCase().startsWith('rut') ? 'RUT' : 'Nº de Cliente');
    let limpio = val.replace(/^(rut|nº de cliente|cliente|socio):?\s*/i, '');
    return ` • ${tipo}: ${limpio}`;
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

function construirBotonUnicoCanal(canal, contacto, nombreCliente = "", asuntoConsulta = "") {
    if (!contacto || !contacto.trim()) return '';
    const contactoLimpio = contacto.replace(/\s+/g, '');
    const primerNombre = nombreCliente ? nombreCliente.split(' ')[0] : '';
    const textoMensaje = encodeURIComponent(`Hola ${primerNombre}, te escribo respecto a tu consulta: ${asuntoConsulta || 'información general'}.`);

    if (canal === 'WhatsApp') {
        const numWA = contactoLimpio.startsWith('+') ? contactoLimpio.replace(/\D/g, '') : normalizarNumeroWhatsapp(contactoLimpio, '+598').replace(/\D/g, '');
        return `<a href="https://wa.me/${numWA}?text=${textoMensaje}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel btn-channel-wa">
            <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M12.031 2c-5.517 0-9.993 4.476-9.993 9.993 0 1.763.459 3.479 1.33 4.996l-1.417 5.176 5.297-1.389c1.464.798 3.119 1.217 4.783 1.217 5.517 0 9.993-4.476 9.993-9.993 0-5.517-4.476-9.993-9.993-9.993zm5.824 14.129c-.243.684-1.22 1.251-1.996 1.341-.532.062-1.226.111-3.558-.853-2.984-1.233-4.9-4.269-5.049-4.469-.148-.199-1.216-1.621-1.216-3.092 0-1.471.771-2.193 1.045-2.491.274-.298.599-.373.799-.373.199 0 .399.002.573.011.184.01.431-.07.674.513.243.583.823 2.012.897 2.16.074.149.124.323.025.522-.099.199-.149.323-.298.497-.149.174-.313.388-.447.522-.149.149-.305.311-.131.61.174.298.773 1.277 1.66 2.067 1.14 1.015 2.102 1.328 2.399 1.477.298.149.472.124.646-.074.174-.199.746-.87.945-1.168.199-.298.398-.248.671-.149.273.099 1.741.821 2.039.97.298.149.497.223.572.348.074.124.074.721-.169 1.405z"/></svg> WA</a>`;
    } else if (canal === 'Instagram') {
        const userInsta = contactoLimpio.replace('@', '');
        return `<a href="https://instagram.com/${userInsta}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel btn-channel-ins">
            <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> IG</a>`;
    } else if (canal === 'LinkedIn') {
        let urlLK = contacto.startsWith('http') ? contacto : `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(contacto)}`;
        return `<a href="${urlLK}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel" style="background-color:#0A66C2; color:white;">
            <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg> LK</a>`;
    } else if (canal === 'Facebook') {
        const userFB = contactoLimpio.replace('@', '');
        return `<a href="https://m.me/${userFB}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel" style="background-color:#1877F2; color:white;">
            <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg> FB</a>`;
    } else if (canal === 'Telegram') {
        const userTG = contactoLimpio.replace('@', '');
        return `<a href="https://t.me/${userTG}" target="_blank" onclick="event.stopPropagation();" class="btn-action-channel" style="background-color:#229ED9; color:white;">
            <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.197 1.006.129.832.941z"/></svg> TG</a>`;
    } else if (canal === 'Email') {
        const asuntoMail = encodeURIComponent(`Seguimiento: ${asuntoConsulta || 'Consulta MEMORA'}`);
        return `<a href="mailto:${contacto}?subject=${asuntoMail}&body=${textoMensaje}" onclick="event.stopPropagation();" class="btn-action-channel btn-channel-mail">
            <span class="material-symbols-outlined" style="font-size:0.9rem;">mail</span> Mail</a>`;
    }
    return '';
}

function obtenerBotonAccionCanal(r) {
    const modoVisibilidad = obtenerConfigVisibilidadCanales();
    let HTMLBotones = [];
    let canalesUsados = new Set();

    if (r.canal && r.contacto) {
        HTMLBotones.push(construirBotonUnicoCanal(r.canal, r.contacto, r.nombre, r.asunto));
        canalesUsados.add(r.canal.toLowerCase());
    }
    
    if (modoVisibilidad !== 'principal' && r.canal2 && r.contacto2 && !canalesUsados.has(r.canal2.toLowerCase())) {
        HTMLBotones.push(construirBotonUnicoCanal(r.canal2, r.contacto2, r.nombre, r.asunto));
        canalesUsados.add(r.canal2.toLowerCase());
    }
    
    if (modoVisibilidad === 'todos' && r.canal3 && r.contacto3 && !canalesUsados.has(r.canal3.toLowerCase())) {
        HTMLBotones.push(construirBotonUnicoCanal(r.canal3, r.contacto3, r.nombre, r.asunto));
        canalesUsados.add(r.canal3.toLowerCase());
    }

    if (HTMLBotones.length === 0) {
        return `<button onclick="event.stopPropagation(); abrirFicha(${r.id});" class="btn-action-channel btn-channel-generic"><span class="material-symbols-outlined" style="font-size:1rem;">visibility</span> Ver</button>`;
    }

    return `<div class="channel-buttons-group" style="display:flex; gap:4px; align-items:center;">${HTMLBotones.join('')}</div>`;
}

function tarjetaEstetica(r) {
    const dCreacion = new Date(r.fecha);
    const dRev = new Date(obtenerUltimaRevisionEfectiva(r));
    
    let fechaCreacionTexto = !isNaN(dCreacion.getTime()) 
        ? `${String(dCreacion.getDate()).padStart(2, '0')}/${String(dCreacion.getMonth() + 1).padStart(2, '0')}/${dCreacion.getFullYear()} ${String(dCreacion.getHours()).padStart(2, '0')}:${String(dCreacion.getMinutes()).padStart(2, '0')}`
        : r.fecha;
        
    let fechaRevisionTexto = !isNaN(dRev.getTime()) 
        ? `${String(dRev.getDate()).padStart(2, '0')}/${String(dRev.getMonth() + 1).padStart(2, '0')}/${dRev.getFullYear()} ${String(dRev.getHours()).padStart(2, '0')}:${String(dRev.getMinutes()).padStart(2, '0')}`
        : '-';

    const { avatarHTML, tituloHTML } = obtenerAvatarEIdentidad(r);
    const btnCanal = obtenerBotonAccionCanal(r);
    const textoId = obtenerTextoIdentificador(r);

    let comentariosActivos = (r.comentarios || []).filter(c => !c.eliminado);
    let ultimoComentario = comentariosActivos.length > 0 ? comentariosActivos[comentariosActivos.length - 1].texto : null;

    let esArchivado = r.estado === 'Archivado';

    let contenidoBotonera = esArchivado ? `
        <button class="btn-action-edit" style="background:#E5E7EB; color:#374151;" onclick="event.stopPropagation(); archivarCliente(${r.id});">Desarchivar</button>
        <button class="btn-action-edit" style="background:#FEE2E2; color:#DC2626;" onclick="event.stopPropagation(); eliminar(${r.id});">Eliminar</button>
    ` : `${btnCanal}`;

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
            ${r.asunto ? `<div style="font-size: 0.8rem; font-weight:600; color:var(--primary-blue);">${traducirCadenaMemora('Asunto:')} ${r.asunto}</div>` : ''}
            ${ultimoComentario ? `<div style="font-size: 0.73rem; color:#4B5563; margin-top:3px; background:#F3F4F6; padding:3px 6px; border-radius:6px; display:inline-block; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${textoIdiomaMemora150('Último comentario:','Latest comment:','Último comentário:')} ${ultimoComentario}</div>` : ''}
        </div>
        
        <div class="tag-row"><span class="tag ${obtenerClaseEstado(r.estado)}">${r.estado}</span></div>
        
        <div class="card-footer-row" style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:6px;">
            <div class="channel-action-area" style="display:flex; gap:6px; align-items:center;">
                ${contenidoBotonera}
            </div>
            <div class="time-ago" style="font-size:0.72rem; color:var(--text-secondary); text-align:right; line-height:1.2;">
                <span>Creado: <strong>${fechaCreacionTexto}</strong></span><br>
                <span>Última rev: <strong>${fechaRevisionTexto}</strong></span>
            </div>
        </div>
    </div>`;
}

function render() {
    validarCupoDemo();
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
   7. LÓGICA DINÁMICA MULTICANAL
   ========================================================================== */
function agregarCampoCanalExtraInicio(canalVal = '', contactoVal = '') {
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
        <button type="button" onclick="quitarCampoCanalExtraInicio(${idNum})" style="position:absolute; top:6px; right:8px; background:none; border:none; color:#DC2626; font-weight:700; font-size:0.75rem; cursor:pointer;">✖ Quitar</button>
        <div style="display:grid; grid-template-columns: 1fr 2fr; gap:8px; margin-top:12px;">
            <div>
                <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Canal Extra</label>
                <select id="canalExtra_${idNum}" class="sub-canal-select" onchange="actualizarOpcionesCanales('Inicio'); actualizarPrefijoCanalExtra(this);" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:0.85rem;"></select>
            </div>
            <div>
                <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Contacto / Usuario</label>
                <div class="whatsapp-phone-row whatsapp-phone-row-extra">
                    <select id="prefijoExtra_${idNum}" class="wa-prefix-select wa-prefix-extra" aria-label="Prefijo de WhatsApp"></select>
                    <input type="text" id="contactoExtra_${idNum}" value="${contactoVal}" placeholder="Ej: @usuario / mail / url" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:0.85rem;">
                </div>
            </div>
        </div>
    `;

    contenedor.appendChild(div);
    actualizarOpcionesCanales('Inicio');

    const sel = $(`canalExtra_${idNum}`);
    if (sel) {
        if (canalVal && Array.from(sel.options).some(opt => opt.value === canalVal)) {
            sel.value = canalVal;
        }
        actualizarOpcionesCanales('Inicio');
        actualizarPrefijoCanalExtra(sel, contactoVal);
    }
}

function quitarCampoCanalExtraInicio(idNum) {
    const el = $(`bloqueCanalExtra_${idNum}`);
    if (el) el.remove();
    actualizarOpcionesCanales('Inicio');
}

function agregarCampoCanalExtraMovil(canalVal = '', contactoVal = '') {
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
        <button type="button" onclick="quitarCampoCanalExtraMovil(${idNum})" style="position:absolute; top:6px; right:8px; background:none; border:none; color:#DC2626; font-weight:700; font-size:0.75rem; cursor:pointer;">✖ Quitar</button>
        <div style="display:grid; grid-template-columns: 1fr 2fr; gap:8px; margin-top:12px;">
            <div>
                <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Canal Extra</label>
                <select id="canalExtraMovil_${idNum}" class="sub-canal-select" onchange="actualizarOpcionesCanales(''); actualizarPrefijoCanalExtra(this);" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:0.85rem;"></select>
            </div>
            <div>
                <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Contacto / Usuario</label>
                <div class="whatsapp-phone-row whatsapp-phone-row-extra">
                    <select id="prefijoExtraMovil_${idNum}" class="wa-prefix-select wa-prefix-extra" aria-label="Prefijo de WhatsApp"></select>
                    <input type="text" id="contactoExtraMovil_${idNum}" value="${contactoVal}" placeholder="Ej: @usuario / mail / url" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:0.85rem;">
                </div>
            </div>
        </div>
    `;

    contenedor.appendChild(div);
    actualizarOpcionesCanales('');

    const sel = $(`canalExtraMovil_${idNum}`);
    if (sel) {
        if (canalVal && Array.from(sel.options).some(opt => opt.value === canalVal)) {
            sel.value = canalVal;
        }
        actualizarOpcionesCanales('');
        actualizarPrefijoCanalExtra(sel, contactoVal);
    }
}

function quitarCampoCanalExtraMovil(idNum) {
    const el = $(`bloqueCanalExtraMovil_${idNum}`);
    if (el) el.remove();
    actualizarOpcionesCanales('');
}

function mostrarCanal() {
    let selectCanal = $('canal');
    let c = selectCanal ? selectCanal.value : 'WhatsApp';

    let nombres = {
        WhatsApp: 'Teléfono / WhatsApp',
        Instagram: 'Usuario Instagram (@)',
        Email: 'Correo electrónico / Mail',
        LinkedIn: 'Perfil LinkedIn (URL o Nombre)',
        Facebook: 'Usuario Facebook',
        Telegram: 'Telegram'
    };

    let placeholders = {
        WhatsApp: 'Ej: 99 777 777',
        Instagram: 'Ej: @usuario',
        Email: 'Ej: cliente@correo.com',
        LinkedIn: 'Ej: linkedin.com/in/usuario',
        Facebook: 'Ej: nombre.usuario',
        Telegram: 'Ej: @usuario'
    };

    const estaBloqueado = editando !== null;
    const campo = $('campoCanal');
    if (!campo) return;

    const inputContacto = `
        <input id="contacto"
               type="text"
               ${c === 'WhatsApp' ? 'inputmode="tel"' : ''}
               placeholder="${placeholders[c] || 'Ingrese contacto'}"
               oninput="buscarCoincidenciasPredictivas(this.value, 'contacto', 'dropContactoForm')"
               autocomplete="off"
               ${estaBloqueado ? 'readonly style="width:100%; padding:10px; border-radius:8px; border:1px solid #d1d5db; background-color:#f3f4f6; color:#6b7280; font-weight:600;"' : 'style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;"'}
        >`;

    campo.style.position = 'relative';
    campo.style.marginTop = '4px';
    campo.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <label style="font-size: 0.8rem; color: var(--text-secondary);">${nombres[c] || 'Contacto'}</label>
            <div id="btnAccionContactoContainer">
                ${estaBloqueado ? `<a href="#" onclick="activarEdicionContacto(); return false;" style="font-size:0.75rem; color:var(--primary-blue); font-weight:600; text-decoration:none;">[ Cambiar dato ]</a>` : ''}
            </div>
        </div>
        ${c === 'WhatsApp' ? `
            <div class="whatsapp-phone-row">
                <select id="prefijoWhatsapp" class="wa-prefix-select" aria-label="Prefijo de WhatsApp" ${estaBloqueado ? 'disabled' : ''}>${opcionesPrefijosWhatsAppHTML('+598')}</select>
                ${inputContacto}
            </div>` : inputContacto}
        <div id="dropContactoForm" class="coincidencias-drop"></div>
    `;

    if (typeof validarCampoEnTiempoReal === 'function') {
        validarCampoEnTiempoReal();
    }
}

function mostrarCanalInicio() {
    let selectCanal = $('canalInicio');
    let c = selectCanal ? selectCanal.value : 'WhatsApp';

    let nombres = {
        WhatsApp: 'Teléfono / WhatsApp',
        Instagram: 'Usuario Instagram (@)',
        Email: 'Correo electrónico / Mail',
        LinkedIn: 'Perfil LinkedIn (URL o Nombre)',
        Facebook: 'Usuario Facebook',
        Telegram: 'Telegram'
    };

    let placeholders = {
        WhatsApp: 'Ej: 099 777 777',
        Instagram: 'Ej: @usuario',
        Email: 'Ej: cliente@correo.com',
        LinkedIn: 'Ej: linkedin.com/in/usuario',
        Facebook: 'Ej: nombre.usuario',
        Telegram: 'Ej: @usuario'
    };

    if ($('campoCanalInicio')) {
        let label = $('campoCanalInicio').querySelector('label');
        if (label) label.innerText = nombres[c] || 'Contacto';
        
        let input = $('contactoInicio');
        const prefijo = $('prefijoWhatsappInicio');
        if (input) {
            input.placeholder = placeholders[c] || 'Ingrese contacto';
            input.inputMode = c === 'WhatsApp' ? 'tel' : 'text';
        }
        if (prefijo) {
            if (!prefijo.options.length) prefijo.innerHTML = opcionesPrefijosWhatsAppHTML('+598');
            prefijo.style.display = c === 'WhatsApp' ? 'block' : 'none';
        }
    }

    if (typeof validarCampoEnTiempoReal === 'function') {
        validarCampoEnTiempoReal('Inicio');
    }
}

function activarEdicionContacto() {
    const input = $('contacto');
    if (!input) return;

    contactoOriginalBackup = input.value;
    const prefijo = $('prefijoWhatsapp');
    prefijoOriginalBackup = prefijo?.value || '+598';
    if (prefijo) prefijo.removeAttribute('disabled');
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
    const prefijo = $('prefijoWhatsappInicio');
    prefijoOriginalBackup = prefijo?.value || '+598';
    if (prefijo) prefijo.removeAttribute('disabled');
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
    if ($('prefijoWhatsapp')) $('prefijoWhatsapp').value = prefijoOriginalBackup;
    bloquearInputContacto(input, 'btnAccionContactoContainer', 'activarEdicionContacto');
}

function cancelarEdicionContactoInicio() {
    const input = $('contactoInicio');
    if (!input) return;
    input.value = contactoOriginalBackup;
    if ($('prefijoWhatsappInicio')) $('prefijoWhatsappInicio').value = prefijoOriginalBackup;
    bloquearInputContacto(input, 'btnAccionContactoContainerInicio', 'activarEdicionContactoInicio');
}

function bloquearInputContacto(input, containerId, fnNombre) {
    input.setAttribute('readonly', 'true');
    const prefijoId = input.id === 'contactoInicio' ? 'prefijoWhatsappInicio' : 'prefijoWhatsapp';
    if ($(prefijoId)) $(prefijoId).setAttribute('disabled', 'true');
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
        cont.innerHTML = `<p style="font-size:0.75rem; color:var(--text-secondary);">${traducirCadenaMemora('No hay comentarios adjuntos.')}</p>`;
        return;
    }
    cont.innerHTML = comentariosTemporalesInicio.map((c, i) => `
        <div class="card" style="padding:10px; margin-top:6px; font-size:0.8rem; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.7rem; color:var(--text-secondary);">
                <span>${traducirCadenaMemora('Comentario del')} ${c.fecha} ${c.editado ? `<strong style="color:#D97706;">(${traducirCadenaMemora('Editado el')} ${c.editado})</strong>` : ''}</span>
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

/* ==========================================================================
   VALIDACIÓN PREVIA REAL AL GUARDADO
   ========================================================================== */
function validarFormularioAntesDeGuardar(sufijo = '') {
    const focoEnInput = id => {
        const el = $(id);
        if (el) {
            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const nombreEl = $(`nombre${sufijo}`);
    if (nombreEl) {
        const val = nombreEl.value.trim();
        if (val.length > 0 && (val.length < 3 || /[0-9]/.test(val))) {
            mostrarErrorCampo(nombreEl.id, `err_${nombreEl.id}`, "Ingrese un nombre real (mínimo 3 letras, sin números).", true);
            focoEnInput(nombreEl.id);
            return false;
        }
    }

    const canalEl = $(`canal${sufijo}`);
    const contactoEl = $(`contacto${sufijo}`);
    if (contactoEl) {
        const canal = canalEl ? canalEl.value : 'WhatsApp';
        const valor = contactoEl.value.trim();
        if (!valor) {
            mostrarErrorCampo(contactoEl.id, `err_${contactoEl.id}`, "El campo de contacto no puede quedar vacío.", true);
            focoEnInput(contactoEl.id);
            return false;
        }

        let esInvalido = false;
        let mensaje = "";
        if (canal === 'WhatsApp') {
            const numLimpio = valor.replace(/\D/g, '');
            esInvalido = numLimpio.length < 8 || numLimpio.length > 15 || /[a-zA-Z]/.test(valor);
            mensaje = "Ingrese un número de celular válido (mínimo 8 dígitos).";
        } else if (canal === 'Email') {
            esInvalido = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
            mensaje = "Ingrese un correo electrónico válido.";
        } else if (['Instagram', 'Telegram', 'LinkedIn', 'Facebook'].includes(canal)) {
            esInvalido = valor.replace('@', '').length < 3;
            mensaje = "Ingrese un usuario/perfil válido (mínimo 3 caracteres).";
        }

        if (esInvalido) {
            mostrarErrorCampo(contactoEl.id, `err_${contactoEl.id}`, mensaje, true);
            focoEnInput(contactoEl.id);
            return false;
        }
    }

    const contenedorId = sufijo ? `contenedorCanalesExtra${sufijo}` : 'contenedorCanalesExtraMovil';
    const contenedor = $(contenedorId);
    if (contenedor) {
        let esInvalidoExtra = false;
        contenedor.querySelectorAll('.sub-canal-block, .sub-canal-block-movil').forEach(bloque => {
            const sel = bloque.querySelector('select');
            const inp = bloque.querySelector('input');
            if (sel && inp) {
                const cVal = sel.value;
                const vVal = inp.value.trim();
                if (vVal) {
                    if (cVal === 'WhatsApp' && (vVal.replace(/\D/g, '').length < 8 || /[a-zA-Z]/.test(vVal))) {
                        esInvalidoExtra = true;
                        mostrarErrorCampo(inp.id || 'extra_inp', `err_${inp.id}`, "Teléfono extra inválido.", true);
                    } else if (cVal === 'Email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vVal)) {
                        esInvalidoExtra = true;
                        mostrarErrorCampo(inp.id || 'extra_inp', `err_${inp.id}`, "Correo extra inválido.", true);
                    }
                }
            }
        });
        if (esInvalidoExtra) return false;
    }

    const usados = obtenerCanalesUtilizadosEnFormulario(sufijo);
    const duplicados = usados.filter((item, index) => usados.indexOf(item) !== index);
    if (duplicados.length > 0) {
        mostrarAvisoMemora(`No puedes repetir el mismo canal (${duplicados[0]}) más de una vez por cliente.`, "Canales Duplicados", "warning");
        return false;
    }

    const asuntoEl = $(`asunto${sufijo}`);
    if (asuntoEl) {
        const val = asuntoEl.value.trim();
        if (val.length > 0 && val.length < 3) {
            mostrarErrorCampo(asuntoEl.id, `err_${asuntoEl.id}`, "Describe un asunto válido (mínimo 3 caracteres).", true);
            focoEnInput(asuntoEl.id);
            return false;
        }
    }

    return true;
}

function evaluarCambiosEnRegistro(original, nuevo) {
    if (!original) return true;
    const jsonOrig = JSON.stringify({
        nombre: original.nombre || '', canal: original.canal || '', contacto: original.contacto || '',
        canal2: original.canal2 || '', contacto2: original.contacto2 || '', canal3: original.canal3 || '', contacto3: original.contacto3 || '',
        asunto: original.asunto || '', tipoIdentificador: original.tipoIdentificador || 'Ninguno', identificador: original.identificador || '',
        estado: original.estado || '', comentarios: original.comentarios || []
    });
    const jsonNuevo = JSON.stringify({
        nombre: nuevo.nombre || '', canal: nuevo.canal || '', contacto: nuevo.contacto || '',
        canal2: nuevo.canal2 || '', contacto2: nuevo.contacto2 || '', canal3: nuevo.canal3 || '', contacto3: nuevo.contacto3 || '',
        asunto: nuevo.asunto || '', tipoIdentificador: nuevo.tipoIdentificador || 'Ninguno', identificador: nuevo.identificador || '',
        estado: nuevo.estado || '', comentarios: nuevo.comentarios || []
    });
    return jsonOrig !== jsonNuevo;
}

function guardarDesdeInicio() {
    // 🛑 FRENO DE MANO PARA VERSIÓN DEMO
    if (!validarCupoDemo()) return;

    if (!validarFormularioAntesDeGuardar('Inicio')) return;

    const contacto = normalizarContactoSegunCanal($('canalInicio')?.value || 'WhatsApp', $('contactoInicio')?.value || '', $('prefijoWhatsappInicio')?.value || '+598');
    const contenedor = $('contenedorCanalesExtraInicio');
    const bloques = contenedor ? contenedor.querySelectorAll('.sub-canal-block') : [];
    
    let canal2 = '', contacto2 = '';
    let canal3 = '', contacto3 = '';
    if (bloques[0]) {
        canal2 = bloques[0].querySelector('.sub-canal-select')?.value || '';
        contacto2 = normalizarContactoSegunCanal(canal2, bloques[0].querySelector('input')?.value || '', bloques[0].querySelector('.wa-prefix-extra')?.value || '+598');
    }
    if (bloques[1]) {
        canal3 = bloques[1].querySelector('.sub-canal-select')?.value || '';
        contacto3 = normalizarContactoSegunCanal(canal3, bloques[1].querySelector('input')?.value || '', bloques[1].querySelector('.wa-prefix-extra')?.value || '+598');
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

    const registroOriginal = editando ? registros.find(x => x.id === editando) : null;
    let tipoIdCapturado = $('tipoIdInicio')?.value || 'Ninguno';
    let valIdCapturado = $('valorIdInicio')?.value.trim() || '';

    let rProvisorio = {
        id: editando || Date.now(),
        nombre: $('nombreInicio')?.value.trim() || '',
        canal: $('canalInicio')?.value || 'WhatsApp',
        contacto: contacto,
        canal2: canal2,
        contacto2: contacto2,
        canal3: canal3,
        contacto3: contacto3,
        asunto: $('asuntoInicio')?.value.trim() || '',
        tipoIdentificador: tipoIdCapturado,
        identificador: valIdCapturado,
        estado: $('estadoInicio')?.value || 'Consulta nueva',
        comentarios: editando ? [...comentariosTemporalesInicio] : [...comentariosTemporalesInicio],
        fecha: registroOriginal ? registroOriginal.fecha : ahoraMemora().toISOString(),
        ultimaModificacion: registroOriginal ? registroOriginal.ultimaModificacion : ahoraMemora().toISOString(),
        ultimaRevision: registroOriginal ? obtenerUltimaRevisionEfectiva(registroOriginal) : ahoraMemora().toISOString()
    };

    if (editando && registroOriginal) {
        const hubocambios = evaluarCambiosEnRegistro(registroOriginal, rProvisorio);
        if (!hubocambios) {
            limpiarCamposFormularioInicio();
            render();
            mostrarAvisoMemora("Registro actualizado sin cambios. El seguimiento no fue modificado.", "MEMORA", "info");
            return;
        }
        const ahoraISO = ahoraMemora().toISOString();
        rProvisorio.ultimaModificacion = ahoraISO;
        rProvisorio.ultimaRevision = ahoraISO;
        registros = registros.map(x => x.id === editando ? rProvisorio : x);
    } else {
        registros.unshift(rProvisorio);
    }

    guardarLocal();
    sincronizarAutoNube(rProvisorio);
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
    if ($('estadoInicio')) $('estadoInicio').value = 'Consulta nueva';
    if ($('contenedorCanalesExtraInicio')) $('contenedorCanalesExtraInicio').innerHTML = '';

    editando = null;
    comentariosTemporalesInicio = [];
    contactoOriginalBackup = '';
    prefijoOriginalBackup = '+598';

    renderComentariosTemporalesInicio();
    mostrarIdInicio();
    actualizarOpcionesCanales('Inicio');
    mostrarCanalInicio();

    if ($('contactoInicio')) {
        $('contactoInicio').value = '';
        $('contactoInicio').removeAttribute('readonly');
        $('contactoInicio').style.backgroundColor = '#ffffff';
        $('contactoInicio').style.color = 'var(--text-primary)';
        $('contactoInicio').style.border = '1px solid #ccc';
    }

    if ($('prefijoWhatsappInicio')) {
        $('prefijoWhatsappInicio').value = '+598';
        $('prefijoWhatsappInicio').removeAttribute('disabled');
    }

    if ($('btnAccionContactoContainerInicio')) {
        $('btnAccionContactoContainerInicio').innerHTML = '';
    }

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
        container.innerHTML = `<p style="font-size:0.75rem; color:var(--text-secondary);">${traducirCadenaMemora('No hay comentarios adjuntos.')}</p>`;
        return;
    }
    container.innerHTML = comentariosEdicionActual.map((c, i) => `
        <div class="card" style="padding:10px; margin-top:6px; font-size:0.8rem; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.7rem; color:var(--text-secondary);">
                <span>${traducirCadenaMemora('Comentario del')} ${c.fecha} ${c.editado ? `<strong style="color:#D97706;">(${traducirCadenaMemora('Editado el')} ${c.editado})</strong>` : ''}</span>
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
    // 🛑 FRENO DE MANO PARA VERSIÓN DEMO
    if (!validarCupoDemo()) return;

    if (!validarFormularioAntesDeGuardar('')) return;

    const contacto = normalizarContactoSegunCanal($('canal')?.value || 'WhatsApp', $('contacto')?.value || '', $('prefijoWhatsapp')?.value || '+598');
    const contenedor = $('contenedorCanalesExtraMovil');
    const bloques = contenedor ? contenedor.querySelectorAll('.sub-canal-block-movil') : [];
    
    let canal2 = '', contacto2 = '';
    let canal3 = '', contacto3 = '';
    if (bloques[0]) {
        canal2 = bloques[0].querySelector('.sub-canal-select')?.value || '';
        contacto2 = normalizarContactoSegunCanal(canal2, bloques[0].querySelector('input')?.value || '', bloques[0].querySelector('.wa-prefix-extra')?.value || '+598');
    }
    if (bloques[1]) {
        canal3 = bloques[1].querySelector('.sub-canal-select')?.value || '';
        contacto3 = normalizarContactoSegunCanal(canal3, bloques[1].querySelector('input')?.value || '', bloques[1].querySelector('.wa-prefix-extra')?.value || '+598');
    }

    let textoUltimo = $('comentario')?.value.trim();
    if (textoUltimo) {
        comentariosEdicionActual.push({
            texto: textoUltimo,
            fecha: fechaHoraTextoFormateada(),
            editado: null,
            eliminado: false
        });
    }

    const registroOriginal = editando ? registros.find(x => x.id === editando) : null;
    let tipoIdCapturado = $('tipoId')?.value || 'Ninguno';
    let valIdCapturado = $('valorId')?.value.trim() || '';

    let rProvisorio = {
        id: editando || Date.now(),
        nombre: $('nombre')?.value ? $('nombre').value.trim() : '',
        canal: $('canal')?.value || 'WhatsApp',
        contacto,
        canal2,
        contacto2,
        canal3,
        contacto3,
        asunto: $('asunto')?.value.trim() || '',
        tipoIdentificador: tipoIdCapturado,
        identificador: valIdCapturado,
        estado: $('estado')?.value || 'Consulta nueva',
        comentarios: [...comentariosEdicionActual],
        fecha: registroOriginal ? registroOriginal.fecha : ahoraMemora().toISOString(),
        ultimaModificacion: registroOriginal ? registroOriginal.ultimaModificacion : ahoraMemora().toISOString(),
        ultimaRevision: registroOriginal ? obtenerUltimaRevisionEfectiva(registroOriginal) : ahoraMemora().toISOString()
    };

    if (editando && registroOriginal) {
        const hubocambios = evaluarCambiosEnRegistro(registroOriginal, rProvisorio);
        if (!hubocambios) {
            limpiar();
            navegarA('registros');
            mostrarAvisoMemora("Registro actualizado sin cambios. El seguimiento no fue modificado.", "MEMORA", "info");
            return;
        }
        const ahoraISO = ahoraMemora().toISOString();
        rProvisorio.ultimaModificacion = ahoraISO;
        rProvisorio.ultimaRevision = ahoraISO;
        registros = registros.map(x => x.id === editando ? rProvisorio : x);
    } else {
        registros.unshift(rProvisorio);
    }

    guardarLocal();
    sincronizarAutoNube(rProvisorio);
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
        actualizarOpcionesCanales('Inicio');
        mostrarCanalInicio();

        if ($('contactoInicio')) {
            cargarContactoEnFormulario('Inicio', r.canal || 'WhatsApp', r.contacto || '');
            $('contactoInicio').setAttribute('readonly', 'true');
            if ($('prefijoWhatsappInicio')) $('prefijoWhatsappInicio').setAttribute('disabled', 'true');
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
        
        let tId = r.tipoIdentificador || (r.identificador ? (r.identificador.startsWith('RUT') ? 'RUT' : 'Nº de Cliente') : 'Ninguno');
        if ($('tipoIdInicio')) $('tipoIdInicio').value = tId;
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
        actualizarOpcionesCanales('');
        mostrarCanal();
        if ($('contacto')) {
            cargarContactoEnFormulario('', r.canal || 'WhatsApp', r.contacto || '');
            if ($('prefijoWhatsapp')) $('prefijoWhatsapp').setAttribute('disabled', 'true');
        }
        
        if ($('contenedorCanalesExtraMovil')) $('contenedorCanalesExtraMovil').innerHTML = '';
        if (r.canal2 && r.contacto2) agregarCampoCanalExtraMovil(r.canal2, r.contacto2);
        if (r.canal3 && r.contacto3) agregarCampoCanalExtraMovil(r.canal3, r.contacto3);

        if ($('asunto')) $('asunto').value = r.asunto || '';
        if ($('estado')) $('estado').value = r.estado || 'Consulta nueva';

        let tId = r.tipoIdentificador || (r.identificador ? (r.identificador.startsWith('RUT') ? 'RUT' : 'Nº de Cliente') : 'Ninguno');
        if ($('tipoId')) $('tipoId').value = tId;
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
                    ${r.asunto ? `<p style="font-size: 0.8rem; font-weight:600; color:var(--primary-blue); margin-top:2px;">${traducirCadenaMemora('Asunto:')} ${r.asunto}</p>` : ''}
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
        
        <div class="section-header"><h3>${traducirCadenaMemora('Comentarios')}</h3></div>
        ${ultimoComentario ? `<div class="card" style="padding: 14px; margin-bottom: 12px; border-left: 4px solid var(--primary-blue);"><p style="font-size:0.9rem;">${ultimoComentario.texto}</p></div>` : `<p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom: 16px;">${traducirCadenaMemora('Sin comentarios.')}</p>`}
        ${historialComentarios.length > 0 ? historialComentarios.map(c => `<div class="card" style="padding:10px; margin-bottom:8px; background:#FAFAFA;"><p style="font-size:0.85rem;">${c.texto}</p></div>`).join('') : ''}
    `;

    $('contenidoFicha').innerHTML = html;
    navegarA('ficha');
}

/* ==========================================================================
   8. EXPORTACIÓN, MÉTRICAS Y AUXILIARES
   ========================================================================== */

function obtenerEtiquetaFiltroExportacion() {
    let estadoFiltro = $('filtroEstado')?.value || $('screenTitle')?.innerText || 'Todos';
    if (!estadoFiltro || estadoFiltro === 'Inicio' || estadoFiltro === 'Perfil') return 'Todos';
    return estadoFiltro;
}

function nombreFiltroSeguroMemora(valor = 'Todos') {
    const limpio = String(valor || 'Todos')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return limpio || 'Todos';
}

function clasificarContactoExportacion(canal, contacto) {
    const val = String(contacto || '').trim();
    if (!val) return { telefono: '-', usuario: '-', email: '-', otro: '-' };

    const cLower = String(canal || '').toLowerCase();

    if (cLower === 'whatsapp' || (/^[0-9+\s\-()]{7,}$/.test(val) && !val.includes('@'))) {
        return { telefono: val, usuario: '-', email: '-', otro: '-' };
    }

    if (cLower === 'email' || (val.includes('@') && val.includes('.'))) {
        return { telefono: '-', usuario: '-', email: val, otro: '-' };
    }

    if (
        cLower === 'instagram' ||
        cLower === 'linkedin' ||
        cLower === 'facebook' ||
        cLower === 'telegram' ||
        val.startsWith('@')
    ) {
        return { telefono: '-', usuario: val, email: '-', otro: '-' };
    }

    return { telefono: '-', usuario: '-', email: '-', otro: val };
}

function construirFilasExportacionMemora(datosAExportar) {
    const filas = [[
        'Tipo Doc / ID',
        'Doc / RUT / Nº Cliente',
        'Nombre del Cliente',
        'Asunto / Motivo',
        'Canal Principal',
        'Teléfono / WhatsApp',
        'Usuario (@)',
        'Correo Electrónico',
        'Canal 2',
        'Contacto 2',
        'Canal 3',
        'Contacto 3',
        'Estado Actual',
        'Último Comentario',
        'Total Comentarios',
        'Fecha de Registro',
        'Última Revisión'
    ]];

    datosAExportar.forEach(r => {
        const comentariosActivos = (r.comentarios || []).filter(c => !c.eliminado);
        const ultimoCom = comentariosActivos.length > 0
            ? String(comentariosActivos[comentariosActivos.length - 1].texto || '').replace(/[\r\n]+/g, ' ')
            : 'Sin comentarios';

        const d = new Date(r.fecha);
        const dRev = new Date(obtenerUltimaRevisionEfectiva(r));
        const fechaCreacionTexto = isNaN(d.getTime()) ? (r.fecha || '-') : fechaHoraTextoFormateada(d);
        const fechaRevTexto = isNaN(dRev.getTime()) ? '-' : fechaHoraTextoFormateada(dRev);
        const clasif = clasificarContactoExportacion(r.canal, r.contacto);

        filas.push([
            r.tipoIdentificador || 'Ninguno',
            r.identificador || 'N/A',
            r.nombre || 'Sin registrar',
            r.asunto || 'Sin asunto',
            r.canal || 'Contacto',
            clasif.telefono,
            clasif.usuario,
            clasif.email,
            r.canal2 || '-',
            r.contacto2 || '-',
            r.canal3 || '-',
            r.contacto3 || '-',
            r.estado || 'Consulta nueva',
            ultimoCom,
            comentariosActivos.length,
            fechaCreacionTexto,
            fechaRevTexto
        ]);
    });

    return filas;
}

/* =========================
   XLSX REAL - PC + ANDROID
   ========================= */

function escaparXMLMemora(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function columnaExcelXLSX(indice) {
    let n = indice + 1;
    let col = '';

    while (n > 0) {
        const resto = (n - 1) % 26;
        col = String.fromCharCode(65 + resto) + col;
        n = Math.floor((n - 1) / 26);
    }

    return col;
}

function celdaTextoXLSX(ref, valor, estilo = 0) {
    const styleAttr = estilo ? ` s="${estilo}"` : '';
    return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${escaparXMLMemora(valor)}</t></is></c>`;
}

function celdaNumeroXLSX(ref, valor, estilo = 0) {
    const numero = Number(valor);
    const styleAttr = estilo ? ` s="${estilo}"` : '';
    return `<c r="${ref}"${styleAttr}><v>${Number.isFinite(numero) ? numero : 0}</v></c>`;
}

function construirEstilosXLSXMemora() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="5">
        <font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
        <font><b/><sz val="16"/><color rgb="FF004F87"/><name val="Calibri"/><family val="2"/></font>
        <font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/><family val="2"/></font>
        <font><b/><sz val="10"/><color rgb="FF374151"/><name val="Calibri"/><family val="2"/></font>
        <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
    </fonts>

    <fills count="4">
        <fill><patternFill patternType="none"/></fill>
        <fill><patternFill patternType="gray125"/></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FF004F87"/><bgColor indexed="64"/></patternFill></fill>
    </fills>

    <borders count="3">
        <border><left/><right/><top/><bottom/><diagonal/></border>
        <border>
            <left/><right/><top/>
            <bottom style="thin"><color rgb="FFE5E7EB"/></bottom>
            <diagonal/>
        </border>
        <border>
            <left style="thin"><color rgb="FFE5E7EB"/></left>
            <right style="thin"><color rgb="FFE5E7EB"/></right>
            <top style="thin"><color rgb="FFE5E7EB"/></top>
            <bottom style="thin"><color rgb="FFE5E7EB"/></bottom>
            <diagonal/>
        </border>
    </borders>

    <cellStyleXfs count="1">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
    </cellStyleXfs>

    <cellXfs count="8">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
        <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
        <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
        <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
        <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
        <xf numFmtId="0" fontId="4" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
        <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
        <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    </cellXfs>

    <cellStyles count="1">
        <cellStyle name="Normal" xfId="0" builtinId="0"/>
    </cellStyles>
</styleSheet>`;
}

function construirHojaXLSXMemora(datosAExportar, filtro, fechaExportacion = ahoraMemora()) {
    const filasDatos = construirFilasExportacionMemora(datosAExportar);
    const encabezados = filasDatos[0];
    const registros = filasDatos.slice(1);
    const totalColumnas = encabezados.length;
    const ultimaColumna = columnaExcelXLSX(totalColumnas - 1);

    const anchos = [
        16, 20, 24, 24, 18, 20, 16, 25, 17,
        20, 17, 20, 18, 34, 16, 20, 20
    ];

    const columnasXML = anchos
        .slice(0, totalColumnas)
        .map((ancho, i) => `<col min="${i + 1}" max="${i + 1}" width="${ancho}" customWidth="1"/>`)
        .join('');

    const filasXML = [];

    filasXML.push(
        `<row r="1" ht="27" customHeight="1">${celdaTextoXLSX('A1', 'MEMORA - Reporte de clientes', 1)}</row>`
    );

    filasXML.push(
        `<row r="2" ht="20" customHeight="1">${celdaTextoXLSX('A2', 'Relaciones que avanzan', 2)}</row>`
    );

    filasXML.push(`<row r="3" ht="8" customHeight="1"></row>`);

    filasXML.push(
        `<row r="4" ht="22" customHeight="1">` +
        celdaTextoXLSX('A4', 'Exportado el', 3) +
        celdaTextoXLSX('B4', fechaHoraTextoFormateada(fechaExportacion), 4) +
        celdaTextoXLSX('E4', 'Vista / filtro', 3) +
        celdaTextoXLSX('F4', filtro, 4) +
        celdaTextoXLSX('I4', 'Total', 3) +
        celdaNumeroXLSX('J4', datosAExportar.length, 4) +
        `</row>`
    );

    filasXML.push(`<row r="5" ht="8" customHeight="1"></row>`);

    filasXML.push(
        `<row r="6" ht="36" customHeight="1">` +
        encabezados.map((titulo, i) => celdaTextoXLSX(`${columnaExcelXLSX(i)}6`, titulo, 5)).join('') +
        `</row>`
    );

    registros.forEach((fila, idx) => {
        const numeroFila = 7 + idx;
        const celdas = fila.map((valor, colIdx) => {
            const ref = `${columnaExcelXLSX(colIdx)}${numeroFila}`;
            if (colIdx === 14 && String(valor).trim() !== '-' && valor !== '') {
                return celdaNumeroXLSX(ref, valor, 7);
            }
            return celdaTextoXLSX(ref, valor, colIdx === 14 ? 7 : 6);
        }).join('');

        filasXML.push(`<row r="${numeroFila}" customFormat="1">${celdas}</row>`);
    });

    if (!registros.length) {
        filasXML.push(
            `<row r="7">${celdaTextoXLSX('A7', 'No hay registros para exportar en la vista actual.', 6)}</row>`
        );
    }

    const ultimaFilaDatos = registros.length ? 6 + registros.length : 7;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <dimension ref="A1:${ultimaColumna}${ultimaFilaDatos}"/>
    <sheetViews>
        <sheetView workbookViewId="0">
            <pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/>
            <selection pane="bottomLeft" activeCell="A7" sqref="A7"/>
        </sheetView>
    </sheetViews>
    <sheetFormatPr defaultRowHeight="15"/>
    <cols>${columnasXML}</cols>
    <sheetData>${filasXML.join('')}</sheetData>
    <mergeCells count="4">
        <mergeCell ref="A1:${ultimaColumna}1"/>
        <mergeCell ref="A2:${ultimaColumna}2"/>
        <mergeCell ref="B4:D4"/>
        <mergeCell ref="F4:H4"/>
    </mergeCells>
    <autoFilter ref="A6:${ultimaColumna}${ultimaFilaDatos}"/>
    <pageMargins left="0.35" right="0.35" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
</worksheet>`;
}

function crc32Memora(bytes) {
    let crc = 0xFFFFFFFF;

    for (let i = 0; i < bytes.length; i++) {
        crc ^= bytes[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
        }
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function escribirUint16LE(valor) {
    const buffer = new Uint8Array(2);
    new DataView(buffer.buffer).setUint16(0, valor, true);
    return buffer;
}

function escribirUint32LE(valor) {
    const buffer = new Uint8Array(4);
    new DataView(buffer.buffer).setUint32(0, valor >>> 0, true);
    return buffer;
}

function fechaDosXLSX(fecha = new Date()) {
    const anio = Math.max(1980, fecha.getFullYear());

    return {
        time: (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | Math.floor(fecha.getSeconds() / 2),
        date: ((anio - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate()
    };
}

function concatenarUint8Memora(partes) {
    const total = partes.reduce((suma, parte) => suma + parte.length, 0);
    const resultado = new Uint8Array(total);
    let offset = 0;

    partes.forEach(parte => {
        resultado.set(parte, offset);
        offset += parte.length;
    });

    return resultado;
}

function crearZipXLSXMemora(archivos, fecha = new Date()) {
    const encoder = new TextEncoder();
    const archivosLocales = [];
    const directorioCentral = [];
    const fechaDos = fechaDosXLSX(fecha);
    let offset = 0;

    Object.entries(archivos).forEach(([nombre, contenido]) => {
        const nombreBytes = encoder.encode(nombre);
        const datos = contenido instanceof Uint8Array ? contenido : encoder.encode(contenido);
        const crc = crc32Memora(datos);

        const archivoLocal = concatenarUint8Memora([
            escribirUint32LE(0x04034b50),
            escribirUint16LE(20),
            escribirUint16LE(0x0800),
            escribirUint16LE(0),
            escribirUint16LE(fechaDos.time),
            escribirUint16LE(fechaDos.date),
            escribirUint32LE(crc),
            escribirUint32LE(datos.length),
            escribirUint32LE(datos.length),
            escribirUint16LE(nombreBytes.length),
            escribirUint16LE(0),
            nombreBytes,
            datos
        ]);

        archivosLocales.push(archivoLocal);

        const central = concatenarUint8Memora([
            escribirUint32LE(0x02014b50),
            escribirUint16LE(20),
            escribirUint16LE(20),
            escribirUint16LE(0x0800),
            escribirUint16LE(0),
            escribirUint16LE(fechaDos.time),
            escribirUint16LE(fechaDos.date),
            escribirUint32LE(crc),
            escribirUint32LE(datos.length),
            escribirUint32LE(datos.length),
            escribirUint16LE(nombreBytes.length),
            escribirUint16LE(0),
            escribirUint16LE(0),
            escribirUint16LE(0),
            escribirUint16LE(0),
            escribirUint32LE(0),
            escribirUint32LE(offset),
            nombreBytes
        ]);

        directorioCentral.push(central);
        offset += archivoLocal.length;
    });

    const centralBytes = concatenarUint8Memora(directorioCentral);

    const finZip = concatenarUint8Memora([
        escribirUint32LE(0x06054b50),
        escribirUint16LE(0),
        escribirUint16LE(0),
        escribirUint16LE(directorioCentral.length),
        escribirUint16LE(directorioCentral.length),
        escribirUint32LE(centralBytes.length),
        escribirUint32LE(offset),
        escribirUint16LE(0)
    ]);

    return concatenarUint8Memora([
        ...archivosLocales,
        centralBytes,
        finZip
    ]);
}

function construirXLSXMemora(datosAExportar, filtro, fechaExportacion = ahoraMemora()) {
    const archivos = {
        '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,

        '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,

        'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets>
        <sheet name="Registros" sheetId="1" r:id="rId1"/>
    </sheets>
</workbook>`,

        'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,

        'xl/styles.xml': construirEstilosXLSXMemora(),
        'xl/worksheets/sheet1.xml': construirHojaXLSXMemora(datosAExportar, filtro, fechaExportacion)
    };

    return crearZipXLSXMemora(archivos, fechaExportacion);
}

function exportarExcelFiltrado() {
    const datosAExportar = registrosUltimoFiltro;

    if (!datosAExportar || datosAExportar.length === 0) {
        mostrarAvisoMemora(
            'No hay registros para exportar en la vista o filtro actual.',
            'Exportación Excel',
            'warning'
        );
        return;
    }

    try {
        const fechaExportacion = ahoraMemora();
        const filtro = obtenerEtiquetaFiltroExportacion();
        const nombreArchivo = `MEMORA_Reporte_Clientes_${nombreFiltroSeguroMemora(filtro)}_${selloArchivoMemora(fechaExportacion)}.xlsx`;
        const excelBytes = construirXLSXMemora(datosAExportar, filtro, fechaExportacion);

        descargarBlob(
            new Blob(
                [excelBytes],
                { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
            ),
            nombreArchivo
        );
    } catch (error) {
        console.error('Error al generar XLSX Memora:', error);
        mostrarAvisoMemora(
            'No se pudo generar el archivo Excel. Intenta nuevamente.',
            'Exportación Excel',
            'error'
        );
    }
}

// Compatibilidad con cualquier botón o llamada antigua que aún use el nombre CSV.
function exportarCSVFiltrado() {
    return exportarExcelFiltrado();
}

function normalizarTextoPDFMemora(valor) {
    return String(valor ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/[–—]/g, '-')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/•/g, '-')
        .replace(/\u00A0/g, ' ');
}

function textoAHexWinAnsiMemora(valor) {
    const texto = normalizarTextoPDFMemora(valor);
    let hex = '';
    for (const ch of texto) {
        let code = ch.charCodeAt(0);
        if (code > 255) code = 63;
        hex += code.toString(16).padStart(2, '0').toUpperCase();
    }
    return hex;
}

function escaparNumeroPDFMemora(n) {
    return Number(n).toFixed(2).replace(/\.00$/, '');
}

function estimarAnchoTextoPDFMemora(texto, tam = 9, negrita = false) {
    const base = negrita ? 0.54 : 0.49;
    return normalizarTextoPDFMemora(texto).length * tam * base;
}

function comandoTextoPDFMemora(x, y, texto, tam = 9, negrita = false, color = '0.12 0.16 0.22') {
    return `${color} rg\nBT /${negrita ? 'F2' : 'F1'} ${escaparNumeroPDFMemora(tam)} Tf 1 0 0 1 ${escaparNumeroPDFMemora(x)} ${escaparNumeroPDFMemora(y)} Tm <${textoAHexWinAnsiMemora(texto)}> Tj ET\n`;
}

function comandoLineaPDFMemora(x1, y1, x2, y2, color = '0.78 0.82 0.87', grosor = 0.8) {
    return `${color} RG\n${escaparNumeroPDFMemora(grosor)} w\n${escaparNumeroPDFMemora(x1)} ${escaparNumeroPDFMemora(y1)} m ${escaparNumeroPDFMemora(x2)} ${escaparNumeroPDFMemora(y2)} l S\n`;
}

function comandoRectPDFMemora(x, y, w, h, fill = null, stroke = '0.86 0.89 0.93', grosor = 0.8) {
    let out = '';
    if (fill) out += `${fill} rg\n`;
    out += `${stroke} RG\n${escaparNumeroPDFMemora(grosor)} w\n${escaparNumeroPDFMemora(x)} ${escaparNumeroPDFMemora(y)} ${escaparNumeroPDFMemora(w)} ${escaparNumeroPDFMemora(h)} re `;
    out += fill ? 'B\n' : 'S\n';
    return out;
}

function envolverTextoPDFMemora(texto, maxChars = 86) {
    const parrafos = normalizarTextoPDFMemora(texto).split('\n');
    const lineas = [];
    parrafos.forEach(parrafo => {
        const palabras = parrafo.trim().split(/\s+/).filter(Boolean);
        if (!palabras.length) {
            lineas.push('');
            return;
        }
        let actual = '';
        palabras.forEach(palabra => {
            const candidato = actual ? `${actual} ${palabra}` : palabra;
            if (candidato.length <= maxChars) {
                actual = candidato;
            } else {
                if (actual) lineas.push(actual);
                if (palabra.length > maxChars) {
                    let resto = palabra;
                    while (resto.length > maxChars) {
                        lineas.push(resto.slice(0, maxChars));
                        resto = resto.slice(maxChars);
                    }
                    actual = resto;
                } else {
                    actual = palabra;
                }
            }
        });
        if (actual) lineas.push(actual);
    });
    return lineas;
}

function truncarTextoPDFMemora(valor, limite = 240) {
    const texto = normalizarTextoPDFMemora(valor).replace(/[\r\n]+/g, ' ').trim();
    if (texto.length <= limite) return texto;
    return `${texto.slice(0, limite - 3).trim()}...`;
}

function resumirRegistroPDFMemora(r, indice) {
    const nombre = (r.nombre || '').trim() || (r.contacto || '').trim() || `Registro ${indice + 1}`;
    const estado = (r.estado || 'Consulta nueva').trim();
    const fechaRevision = new Date(obtenerUltimaRevisionEfectiva(r));
    const fechaRevisionTexto = isNaN(fechaRevision.getTime()) ? '-' : fechaHoraTextoFormateada(fechaRevision);
    const canalPrincipal = `${r.canal || 'Contacto'} (${r.contacto || '-'})`;
    const asunto = r.asunto || 'Sin asunto';
    const comentarios = (r.comentarios || []).filter(c => !c.eliminado);
    const ultimoComentario = comentarios.length
        ? truncarTextoPDFMemora(comentarios[comentarios.length - 1].texto || '', 260)
        : 'Sin comentarios';
    const extras = [];
    if (r.canal2 && r.contacto2) extras.push(`${r.canal2} (${r.contacto2})`);
    if (r.canal3 && r.contacto3) extras.push(`${r.canal3} (${r.contacto3})`);
    const identificador = r.identificador ? `${r.tipoIdentificador || 'ID'}: ${r.identificador}` : '';
    return {
        nombre,
        estado,
        resumen: `Canal: ${canalPrincipal} | Asunto: ${asunto} | Rev: ${fechaRevisionTexto}`,
        extras: extras.length ? `Canales extra: ${extras.join(' | ')}` : '',
        identificador,
        nota: `Note: ${ultimoComentario}`
    };
}

function construirPDFMemora(datosAExportar, filtro, fechaExportacion = ahoraMemora()) {
    const ancho = 595.28;
    const alto = 841.89;
    const margenX = 46;
    const margenInferior = 70;
    const anchoUtil = ancho - margenX * 2;
    const paginas = [];
    let comandos = '';
    let y = 0;

    const dibujarEncabezado = () => {
        comandos += comandoTextoPDFMemora(margenX, 764, 'MEMORA - Reporte de Registros', 16, true, '0 0.31 0.53');
        comandos += comandoTextoPDFMemora(margenX, 748, 'Relaciones que avanzan', 9.5, false, '0.35 0.39 0.45');
        comandos += comandoTextoPDFMemora(455, 764, `Total: ${datosAExportar.length} registro${datosAExportar.length === 1 ? '' : 's'}`, 9, false, '0.2 0.23 0.27');
        comandos += comandoTextoPDFMemora(426, 748, `Emisión: ${fechaHoraTextoFormateada(fechaExportacion)}`, 9, false, '0.2 0.23 0.27');
        comandos += comandoLineaPDFMemora(margenX, 736, ancho - margenX, 736, '0 0.31 0.53', 1);
        comandos += comandoTextoPDFMemora(margenX, 722, `Vista activa: ${filtro}`, 8.5, false, '0.45 0.5 0.56');
        y = 704;
    };

    const nuevaPagina = () => {
        if (comandos) paginas.push(comandos);
        comandos = '';
        dibujarEncabezado();
    };

    const calcularAlturaBloque = (registroResumen) => {
        const lineasResumen = envolverTextoPDFMemora(registroResumen.resumen, 78);
        const lineasExtras = registroResumen.extras ? envolverTextoPDFMemora(registroResumen.extras, 78) : [];
        const lineasId = registroResumen.identificador ? envolverTextoPDFMemora(registroResumen.identificador, 78) : [];
        const lineasNota = envolverTextoPDFMemora(registroResumen.nota, 86);
        const totalLineas = lineasResumen.length + lineasExtras.length + lineasId.length + lineasNota.length;
        return { lineasResumen, lineasExtras, lineasId, lineasNota, alto: 34 + totalLineas * 12 + 14 };
    };

    const renderizarBloque = (registroResumen, cacheBloque) => {
        const boxHeight = cacheBloque.alto;
        const boxBottom = y - boxHeight;
        comandos += comandoRectPDFMemora(margenX, boxBottom, anchoUtil, boxHeight, '0.995 0.996 0.998', '0.86 0.89 0.93', 0.9);
        let lineaY = y - 18;
        comandos += comandoTextoPDFMemora(margenX + 9, lineaY, registroResumen.nombre, 11.5, true, '0 0.31 0.53');
        const anchoEstado = estimarAnchoTextoPDFMemora(registroResumen.estado, 8.5, false);
        comandos += comandoTextoPDFMemora(ancho - margenX - 10 - anchoEstado, lineaY, registroResumen.estado, 8.5, false, '0.2 0.23 0.27');
        lineaY -= 18;
        cacheBloque.lineasResumen.forEach(linea => {
            comandos += comandoTextoPDFMemora(margenX + 9, lineaY, linea, 8.7, false, '0.26 0.29 0.34');
            lineaY -= 12;
        });
        cacheBloque.lineasExtras.forEach(linea => {
            comandos += comandoTextoPDFMemora(margenX + 9, lineaY, linea, 8.3, false, '0.32 0.36 0.41');
            lineaY -= 11;
        });
        cacheBloque.lineasId.forEach(linea => {
            comandos += comandoTextoPDFMemora(margenX + 9, lineaY, linea, 8.3, false, '0.32 0.36 0.41');
            lineaY -= 11;
        });
        cacheBloque.lineasNota.forEach(linea => {
            comandos += comandoTextoPDFMemora(margenX + 9, lineaY, linea, 8.2, false, '0.38 0.43 0.5');
            lineaY -= 11;
        });
        y = boxBottom - 14;
    };

    nuevaPagina();
    if (!datosAExportar.length) {
        comandos += comandoTextoPDFMemora(margenX, y, 'No hay registros para exportar en la vista actual.', 10, false, '0.38 0.43 0.5');
        y -= 18;
    }

    datosAExportar.forEach((r, index) => {
        const resumen = resumirRegistroPDFMemora(r, index);
        const bloque = calcularAlturaBloque(resumen);
        if (y - bloque.alto < margenInferior) nuevaPagina();
        renderizarBloque(resumen, bloque);
    });

    if (comandos) paginas.push(comandos);

    const totalPaginas = paginas.length;
    paginas.forEach((contenido, idx) => {
        let footer = '';
        footer += comandoLineaPDFMemora(margenX, 54, ancho - margenX, 54, '0.86 0.89 0.93', 0.8);
        footer += comandoTextoPDFMemora(margenX, 39, `Generado con Memora PRO el ${fechaHoraTextoFormateada(fechaExportacion)} hs.`, 7.6, false, '0.43 0.47 0.53');
        footer += comandoTextoPDFMemora(480, 39, `Página ${idx + 1} de ${totalPaginas}`, 7.6, false, '0.43 0.47 0.53');
        paginas[idx] = contenido + footer;
    });

    const objetos = [];
    const pageObjNums = [];
    const contentObjNums = [];
    const firstPageObj = 5;

    paginas.forEach((_, i) => {
        pageObjNums.push(firstPageObj + i * 2);
        contentObjNums.push(firstPageObj + i * 2 + 1);
    });

    objetos[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objetos[2] = `<< /Type /Pages /Count ${paginas.length} /Kids [${pageObjNums.map(n => `${n} 0 R`).join(' ')}] >>`;
    objetos[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objetos[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

    paginas.forEach((stream, i) => {
        const pageNum = pageObjNums[i];
        const contentNum = contentObjNums[i];
        objetos[pageNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ancho} ${alto}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`;
        objetos[contentNum] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
    });

    let pdf = '%PDF-1.4\n%MEMORA\n';
    const offsets = [0];
    const maxObj = objetos.length - 1;
    for (let i = 1; i <= maxObj; i++) {
        offsets[i] = pdf.length;
        pdf += `${i} 0 obj\n${objetos[i]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${maxObj + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= maxObj; i++) {
        pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new TextEncoder().encode(pdf);
}

function exportarPDFFiltrado() {
    const datosAExportar = registrosUltimoFiltro;
    if (datosAExportar.length === 0) {
        mostrarAvisoMemora('No hay registros para exportar en la vista o filtro actual.', 'Exportación PDF', 'warning');
        return;
    }

    try {
        const fechaExportacion = ahoraMemora();
        const filtro = obtenerEtiquetaFiltroExportacion();
        const pdfBytes = construirPDFMemora(datosAExportar, filtro, fechaExportacion);
        const nombreArchivo = `MEMORA_Reporte_Clientes_${nombreFiltroSeguroMemora(filtro)}_${selloArchivoMemora(fechaExportacion)}.pdf`;
        descargarBlob(new Blob([pdfBytes], { type: 'application/pdf' }), nombreArchivo);
    } catch (error) {
        console.error('Error al generar PDF Memora:', error);
        mostrarAvisoMemora('No se pudo generar el PDF. Intenta nuevamente.', 'Exportación PDF', 'error');
    }
}


function exportarJSON() {
    descargar(JSON.stringify(registros, null, 2), 'memora_completo.json', 'application/json');
}

function descargarBlob(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function descargar(contenido, nombre, tipo) {
    descargarBlob(new Blob([contenido], { type: tipo }), nombre);
}

async function cargarDiagnosticoSistema() {
    const ua = navigator.userAgent;
    let dev = "Escritorio (PC/Mac)";
    if (/android/i.test(ua)) dev = "Android Mobile";
    else if (/iphone|ipad|ipod/i.test(ua)) dev = "iOS Mobile";
    
    let nav = "Navegador Web";
    if (ua.includes("SamsungBrowser")) nav = "Samsung Internet";
    else if (ua.includes("Edg/")) nav = "Microsoft Edge";
    else if (ua.includes("OPR/") || ua.includes("Opera")) nav = "Opera Browser";
    else if (ua.includes("Chrome") && !ua.includes("Edg/") && !ua.includes("OPR/")) nav = "Google Chrome";
    else if (ua.includes("Firefox")) nav = "Mozilla Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) nav = "Apple Safari";

    const storageBytes = new Blob([localStorage.getItem('memora_registros') || '']).size;

    if ($('sys-version')) $('sys-version').innerText = `v${MEMORA_VERSION}`;
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

    actualizarSaludoDinamico();
    if ($('perfilRolAdmin')) $('perfilRolAdmin').innerText = datos.rolAdmin || 'Usuario Administrador';

    let htmlLista = '';
    if (datos.nombreAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">${traducirCadenaMemora('Nombre:')}</span> <span class="perfil-valor">${datos.nombreAdmin}</span></div>`;
    if (datos.cedulaAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">${traducirCadenaMemora('Documento / C.I.:')}</span> <span class="perfil-valor">${datos.cedulaAdmin}</span></div>`;
    if (datos.empresaAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">${traducirCadenaMemora('Empresa:')}</span> <span class="perfil-valor">${datos.empresaAdmin}</span></div>`;
    if (datos.whatsappAdmin) htmlLista += `<div class="perfil-campo-linea"><span class="perfil-label">${traducirCadenaMemora('Contacto / WA:')}</span> <span class="perfil-valor">${datos.whatsappAdmin}</span></div>`;

    if ($('perfilDatosLista')) $('perfilDatosLista').innerHTML = htmlLista || `<p style="font-size:0.8rem; color:var(--text-secondary);">${traducirCadenaMemora('Sin datos adicionales cargados.')}</p>`;

    if ($('cfgAdminRol')) $('cfgAdminRol').value = datos.rolAdmin || 'Usuario Administrador';
    if ($('cfgAdminNombre')) $('cfgAdminNombre').value = datos.nombreAdmin || '';
    if ($('cfgAdminCedula')) $('cfgAdminCedula').value = datos.cedulaAdmin || '';
    if ($('cfgAdminEmpresa')) $('cfgAdminEmpresa').value = datos.empresaAdmin || '';
    if ($('cfgAdminWhatsapp')) $('cfgAdminWhatsapp').value = datos.whatsappAdmin || '';

    const cfgSeg = obtenerConfigSeguimiento();
    if ($('cfgSegValor')) $('cfgSegValor').value = cfgSeg.valor;
    if ($('cfgSegUnidad')) $('cfgSegUnidad').value = cfgSeg.unidad;

    if ($('cfgModoCanales')) $('cfgModoCanales').value = obtenerConfigVisibilidadCanales();
    actualizarControlTemaMemora();
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
            registros = registros.filter(x => x.id !== id);
            guardarLocal();
            limpiar();
            limpiarCamposFormularioInicio();
            render();
            navegarA('registros');
            mostrarAvisoMemora("El registro ha sido eliminado correctamente.", "MEMORA", "delete");
        }
    });
}

function archivarCliente(id) {
    let r = registros.find(x => x.id === id);
    if (!r) return;

    const ahoraISO = ahoraMemora().toISOString();
    r.estado = r.estado === 'Archivado' ? 'Consulta nueva' : 'Archivado';
    r.ultimaModificacion = ahoraISO;
    r.ultimaRevision = ahoraISO;

    guardarLocal();
    sincronizarAutoNube(r);
    limpiarCamposFormularioInicio();
    render();

    if ($('sec-ficha').style.display !== 'none') {
        navegarA('registros');
    }
}

function alternarVistaArchivados() {
    mostrandoArchivados = !mostrandoArchivados;
    if ($('filtroEstado')) $('filtroEstado').value = '';
    render();
}

function guardarLocal() { localStorage.setItem('memora_registros', JSON.stringify(registros)); }

function limpiar() {
    // Un registro nuevo nunca debe heredar el estado protegido de una edición anterior.
    editando = null;
    comentariosEdicionActual = [];
    contactoOriginalBackup = '';
    prefijoOriginalBackup = '+598';

    if ($('nombre')) $('nombre').value = '';
    if ($('asunto')) $('asunto').value = '';
    if ($('canal')) $('canal').value = 'WhatsApp';
    if ($('estado')) $('estado').value = 'Consulta nueva';
    if ($('tipoId')) $('tipoId').value = 'Ninguno';
    if ($('comentario')) $('comentario').value = '';

    if ($('listaComentariosEdicion')) {
        $('listaComentariosEdicion').innerHTML = `<p style="font-size:0.75rem; color:var(--text-secondary);">${traducirCadenaMemora('No hay comentarios adjuntos.')}</p>`;
    }

    if ($('contenedorCanalesExtraMovil')) {
        $('contenedorCanalesExtraMovil').innerHTML = '';
    }

    mostrarId();
    actualizarOpcionesCanales('');

    // Reconstruye el campo principal con editando === null.
    // Así desaparecen "Cambiar dato / Conservar original" y readonly/disabled.
    mostrarCanal();

    if ($('contacto')) {
        $('contacto').value = '';
        $('contacto').removeAttribute('readonly');
        $('contacto').style.backgroundColor = '#ffffff';
        $('contacto').style.color = 'var(--text-primary)';
        $('contacto').style.border = '1px solid #ccc';
    }

    if ($('prefijoWhatsapp')) {
        $('prefijoWhatsapp').value = '+598';
        $('prefijoWhatsapp').removeAttribute('disabled');
    }

    if ($('btnAccionContactoContainer')) {
        $('btnAccionContactoContainer').innerHTML = '';
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
            let refFecha = new Date(obtenerUltimaRevisionEfectiva(r));
            let dias = Math.floor((ahora - refFecha) / (1000 * 60 * 60 * 24));
            if (dias >= 30) {
                r.estado = 'Archivado';
                r.ultimaModificacion = ahora.toISOString();
                r.ultimaRevision = ahora.toISOString();
                modificado = true;
            }
        }
    });

    if (modificado) guardarLocal();
}

function forzarLimpiezaCachePWA() {
    if ('serviceWorker' in navigator) {
        // 1. Unregister todos los Service Workers activos
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.unregister();
            }
        });
    }

    if ('caches' in window) {
        // 2. Borrar todas las llaves de caché guardadas por la PWA
        caches.keys().then(names => {
            for (let name of names) {
                caches.delete(name);
            }
        });
    }

    // 3. Notificar y recargar la aplicación desde el servidor (no la caché)
    mostrarAvisoMemora(
        "Caché borrada y Service Worker reiniciado. Recargando aplicación...", 
        "Caché PWA", 
        "refresh", 
        () => {
            window.location.reload(true);
        }
    );
}


/* ==========================================================================
   VALIDACIÓN EN TIEMPO REAL
   ========================================================================== */
function mostrarErrorCampo(inputId, errorId, mensaje, esInvalido) {
    const input = $(inputId);
    if (!input) return;

    let msgEl = $(errorId);
    if (!msgEl) {
        msgEl = document.createElement('small');
        msgEl.id = errorId;
        msgEl.style.color = '#EF4444';
        msgEl.style.fontSize = '0.75rem';
        msgEl.style.fontWeight = '600';
        msgEl.style.display = 'none';
        msgEl.style.marginTop = '4px';
        input.parentNode.appendChild(msgEl);
    }

    if (esInvalido) {
        input.style.border = '1.5px solid #EF4444';
        input.style.backgroundColor = '#FEF2F2';
        msgEl.innerText = `  ${mensaje}`;
        msgEl.style.display = 'block';
    } else {
        input.style.border = '1px solid #ccc';
        input.style.backgroundColor = '#ffffff';
        msgEl.style.display = 'none';
    }
}

function validarCampoEnTiempoReal(sufijo = '') {
    const nombreEl = $(`nombre${sufijo}`);
    const canalEl = $(`canal${sufijo}`);
    const contactoEl = $(`contacto${sufijo}`);
    const asuntoEl = $(`asunto${sufijo}`);

    if (nombreEl) {
        const validarNombre = () => {
            let val = nombreEl.value.trim();
            let esInvalido = val.length > 0 && (val.length < 3 || /[0-9]/.test(val));
            mostrarErrorCampo(nombreEl.id, `err_${nombreEl.id}`, "Ingrese un nombre real (mínimo 3 letras, sin números).", esInvalido);
        };
        nombreEl.oninput = validarNombre;
        nombreEl.onkeyup = validarNombre;
        nombreEl.onblur = validarNombre;
    }

    if (contactoEl) {
        const validarContacto = () => {
            let canal = canalEl ? canalEl.value : 'WhatsApp';
            let valor = contactoEl.value.trim();
            let esInvalido = false;
            let mensajeError = "";

            if (valor.length === 0) {
                mostrarErrorCampo(contactoEl.id, `err_${contactoEl.id}`, "", false);
                return;
            }

            if (canal === 'WhatsApp') {
                const numLimpio = valor.replace(/\D/g, '');
                esInvalido = numLimpio.length < 8 || numLimpio.length > 15 || /[a-zA-Z]/.test(valor);
                mensajeError = "Ingrese un número de celular válido (mínimo 8 dígitos).";
            } else if (canal === 'Email') {
                esInvalido = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
                mensajeError = "Ingrese un correo electrónico válido.";
            } else if (['Instagram', 'Telegram', 'LinkedIn', 'Facebook'].includes(canal)) {
                esInvalido = valor.replace('@', '').length < 3;
                mensajeError = "Ingrese un usuario válido (mínimo 3 caracteres).";
            }

            mostrarErrorCampo(contactoEl.id, `err_${contactoEl.id}`, mensajeError, esInvalido);
        };
        contactoEl.oninput = () => {
            buscarCoincidenciasPredictivas(contactoEl.value, 'contacto', sufijo ? `dropContacto${sufijo}` : 'dropContactoForm');
            validarContacto();
        };
        contactoEl.onkeyup = validarContacto;
        contactoEl.onblur = validarContacto;
    }

    if (asuntoEl) {
        const validarAsunto = () => {
            let val = asuntoEl.value.trim();
            let esInvalido = val.length > 0 && val.length < 3;
            mostrarErrorCampo(asuntoEl.id, `err_${asuntoEl.id}`, "Describe un asunto válido (mínimo 3 caracteres).", esInvalido);
        };
        asuntoEl.oninput = validarAsunto;
        asuntoEl.onkeyup = validarAsunto;
        asuntoEl.onblur = validarAsunto;
    }
}

/* ==========================================================================
   INICIALIZACIÓN DEL SISTEMA
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    inicializarTemaMemora();
    iniciarRelojHeader();
    if ($('estado')) $('estado').innerHTML = estados.map(e => `<option>${e}</option>`).join('');
    if ($('filtroEstado')) $('filtroEstado').innerHTML = '<option value="">Todos los estados</option>' + estados.map(e => `<option>${e}</option>`).join('');

    actualizarOpcionesCanales('');
    actualizarOpcionesCanales('Inicio');

    const selectCanalMovil = $('canal');
    if (selectCanalMovil) {
        selectCanalMovil.addEventListener('change', () => {
            actualizarOpcionesCanales('');
            mostrarCanal();
        });
    }

    const selectCanalPC = $('canalInicio');
    if (selectCanalPC) {
        selectCanalPC.addEventListener('change', () => {
            actualizarOpcionesCanales('Inicio');
            mostrarCanalInicio();
        });
    }

    mostrarCanal();
    if (typeof mostrarCanalInicio === 'function') mostrarCanalInicio();

    comprobarEstadoAccesoEInicial();
    render();
    setTimeout(inicializarGoogleDriveAPI, 1000);
});

/* ==========================================================================
   INSTRUCTIVO Y STORIES INTERACTIVAS
   ========================================================================== */
function toggleGuiaUsoMemora() {
    const cont = document.getElementById('contenedorGuiaUso');
    const arrow = document.getElementById('iconGuiaArrow');
    if (!cont) return;

    const estaOculto = cont.style.display === 'none';
    cont.style.display = estaOculto ? 'block' : 'none';
    if (arrow) arrow.innerText = estaOculto ? 'expand_less' : 'expand_more';
}

function reproducirTourBienvenida() {
    const datosRaw = localStorage.getItem('memora_admin_user_data');
    const datos = datosRaw ? JSON.parse(datosRaw) : { nombreAdmin: 'Usuario' };
    iniciarStoriesBienvenida(datos.nombreAdmin);
}


/* ==========================================================================
   1.5.0 — CAPA ADITIVA
   Idiomas + validación reforzada + detección de duplicados + Hard Reset.
   Esta sección se apoya sobre la lógica 1.4.3 sin cambiar su diseño ni
   sustituir sus funciones de registros, seguimiento, exportación o Drive.
   ========================================================================== */

const MEMORA_IDIOMA_KEY = 'memora_idioma';
const MEMORA_IDIOMAS_SOPORTADOS = ['es', 'en', 'pt'];
const MEMORA_IDIOMAS_SELECCIONABLES = ['auto', ...MEMORA_IDIOMAS_SOPORTADOS];

function detectarIdiomaSistemaMemora() {
    const candidatos = Array.isArray(navigator.languages) && navigator.languages.length
        ? navigator.languages
        : [navigator.language || 'es'];

    for (const candidato of candidatos) {
        const base = String(candidato || '').toLowerCase().split('-')[0];
        if (MEMORA_IDIOMAS_SOPORTADOS.includes(base)) return base;
    }

    // Si el dispositivo usa un idioma todavía no soportado, Memora vuelve a español.
    return 'es';
}

let preferenciaIdiomaMemora = (() => {
    const guardado = localStorage.getItem(MEMORA_IDIOMA_KEY);
    return MEMORA_IDIOMAS_SELECCIONABLES.includes(guardado) ? guardado : 'auto';
})();

let idiomaMemoraActual = preferenciaIdiomaMemora === 'auto'
    ? detectarIdiomaSistemaMemora()
    : preferenciaIdiomaMemora;

const MEMORA_TRADUCCIONES = {
    en: {
        'Inicio': 'Home',
        'Registros': 'Records',
        'Perfil': 'Profile',
        'Perfil y Configuración': 'Profile and Settings',
        'Ajustes de usuario, empresa y seguimiento.': 'User, company and follow-up settings.',
        'Usuario Administrador': 'Administrator User',
        'Permiso de Sistema': 'System Permission',
        'Configurar': 'Configure',
        'Configurar Perfil de Usuario y Empresa': 'Configure User and Company Profile',
        'Rol / Tipo de Permiso': 'Role / Permission Type',
        'Nombre Completo (* Requerido)': 'Full Name (* Required)',
        'Cédula / Documento / RUT': 'ID / Document / Tax ID',
        'Nombre de la Empresa': 'Company Name',
        'Teléfono / WhatsApp': 'Phone / WhatsApp',
        'Guardar Datos': 'Save Data',
        'Cancelar': 'Cancel',
        'Seguimiento Personalizado': 'Custom Follow-up',
        'Configura el tiempo máximo de inactividad antes de requerir seguimiento:': 'Set the maximum inactivity time before follow-up is required:',
        'Día(s)': 'Day(s)',
        'Hora(s)': 'Hour(s)',
        'Aplicar': 'Apply',
        'Visualización de Canales': 'Channel Display',
        'Elige cuántos botones de canal deseas ver directamente en las tarjetas de clientes:': 'Choose how many channel buttons you want to see directly on customer cards:',
        'Ver todos los canales configurados (Hasta 3)': 'Show all configured channels (Up to 3)',
        'Ver máximo 2 canales (Principal y Secundario)': 'Show up to 2 channels (Primary and Secondary)',
        'Ver solo Canal Principal': 'Show Primary Channel only',
        'Apariencia': 'Appearance',
        'Tema de Memora': 'Memora Theme',
        'Modo claro activo': 'Light mode active',
        'Modo oscuro activo': 'Dark mode active',
        'Usar modo oscuro': 'Use dark mode',
        'Usar modo claro': 'Use light mode',
        'Idioma': 'Language',
        'Idioma de Memora': 'Memora language',
        'Automático (idioma del dispositivo)': 'Automatic (device language)',
        'Cambia los títulos, formularios y mensajes principales sin modificar tus datos guardados.': 'Changes main titles, forms and messages without modifying your saved data.',
        'Automático usa el idioma del dispositivo; también podés elegir uno manualmente sin modificar tus datos guardados.': 'Automatic uses the device language; you can also choose one manually without changing your saved data.',
        'Español': 'Spanish',
        'Inglés': 'English',
        'Portugués': 'Portuguese',
        'Respaldo en la Nube (Google Drive)': 'Cloud Backup (Google Drive)',
        'Sin vincular': 'Not linked',
        'Conectar': 'Connect',
        'Guardar en Nube': 'Save to Cloud',
        'Restaurar desde Nube': 'Restore from Cloud',
        'Auto-guardar al modificar': 'Auto-save after changes',
        'Diagnóstico del Sistema': 'System Diagnostics',
        'Limpiar Caché PWA': 'Clear PWA Cache',
        'Versión de App': 'App Version',
        'Dispositivo': 'Device',
        'Navegador': 'Browser',
        'Almacenamiento Local': 'Local Storage',
        'Reglas Automáticas': 'Automatic Rules',
        'Auto-archivar clientes inactivos': 'Auto-archive inactive customers',
        "Archivar clientes en 'Cerrado' o 'Perdido' tras 30 días.": "Archive customers in 'Closed' or 'Lost' after 30 days.",
        'Exportación Inteligente': 'Smart Export',
        'Exportar Excel (.xlsx)': 'Export Excel (.xlsx)',
        'Exportar PDF (Vista activa)': 'Export PDF (Active view)',
        'Exportar JSON Completo': 'Export Full JSON',
        'Ayuda': 'Help',
        '¿Cómo empiezo?': 'How do I start?',
        'Descargar manual completo': 'Download full manual',
        'Volver a ver bienvenida': 'Replay welcome tour',
        'Zona de seguridad': 'Safety Zone',
        'Restablecer Memora': 'Reset Memora',
        'Borra todos los datos locales y configuraciones de este dispositivo. Requiere una confirmación escrita.': 'Deletes all local data and settings from this device. Written confirmation is required.',
        'Borrar todos los datos': 'Delete all data',
        'Consulta nueva': 'New inquiry',
        'Información enviada': 'Information sent',
        'Esperando cliente': 'Waiting for customer',
        'Esperando respuesta interna': 'Waiting for internal response',
        'Cerrado': 'Closed',
        'Perdido': 'Lost',
        'Archivado': 'Archived',
        'Resumen y métricas de tu gestión.': 'Summary and metrics of your activity.',
        'Rendimiento General': 'Overall Performance',
        'Activos': 'Active',
        'Este Mes': 'This Month',
        'Top Canal': 'Top Channel',
        'Seguimiento Requerido': 'Follow-up Required',
        'Ver todos >': 'View all >',
        'Nuevo Registro / Carga Directa': 'New Record / Quick Entry',
        'Nombre Completo (Opcional)': 'Full Name (Optional)',
        'Canal Principal': 'Primary Channel',
        'Agregar otro canal (IG, Mail, LK, FB, TG)': 'Add another channel (IG, Mail, LK, FB, TG)',
        'Asunto / Motivo de la Consulta': 'Subject / Reason for Contact',
        'Tipo de Documento / Identificador': 'Document / Identifier Type',
        'Ninguno': 'None',
        'Nº de Cliente': 'Customer No.',
        'Estado': 'Status',
        'Comentarios / Notas': 'Comments / Notes',
        '+ Agregar': '+ Add',
        'Guardar Registro': 'Save Record',
        'Limpiar Campos': 'Clear Fields',
        'Consulta y busca todos tus clientes.': 'Browse and search all your customers.',
        'Filtros detallados:': 'Detailed filters:',
        'Todos los canales': 'All channels',
        'Todos los estados': 'All statuses',
        'Nuevo registro': 'New record',
        'Aceptar': 'Accept',
        'Editar dato': 'Edit data',
        'Guardar': 'Save',
        '[ Cambiar dato ]': '[ Change data ]',
        '[ Confirmar ]': '[ Confirm ]',
        '[ Conservar original ]': '[ Keep original ]',
        'No hay comentarios adjuntos.': 'No comments attached.',
        'Sin seguimientos pendientes.': 'No pending follow-ups.',
        'Revisado': 'Reviewed',
        'Desarchivar': 'Unarchive',
        'Archivar': 'Archive',
        'Eliminar': 'Delete',
        'Actualizar Registro': 'Update Record',
        'Nombre:': 'Name:',
        'Documento / C.I.:': 'Document / ID:',
        'Empresa:': 'Company:',
        'Contacto / WA:': 'Contact / WA:',
        'Sin datos adicionales cargados.': 'No additional data loaded.',
        'Online': 'Online'
    },
    pt: {
        'Inicio': 'Início',
        'Registros': 'Registros',
        'Perfil': 'Perfil',
        'Perfil y Configuración': 'Perfil e Configurações',
        'Ajustes de usuario, empresa y seguimiento.': 'Configurações de usuário, empresa e acompanhamento.',
        'Usuario Administrador': 'Usuário Administrador',
        'Permiso de Sistema': 'Permissão do Sistema',
        'Configurar': 'Configurar',
        'Configurar Perfil de Usuario y Empresa': 'Configurar Perfil de Usuário e Empresa',
        'Rol / Tipo de Permiso': 'Função / Tipo de Permissão',
        'Nombre Completo (* Requerido)': 'Nome Completo (* Obrigatório)',
        'Cédula / Documento / RUT': 'Documento / Identificação Fiscal',
        'Nombre de la Empresa': 'Nome da Empresa',
        'Teléfono / WhatsApp': 'Telefone / WhatsApp',
        'Guardar Datos': 'Salvar Dados',
        'Cancelar': 'Cancelar',
        'Seguimiento Personalizado': 'Acompanhamento Personalizado',
        'Configura el tiempo máximo de inactividad antes de requerir seguimiento:': 'Defina o tempo máximo de inatividade antes de exigir acompanhamento:',
        'Día(s)': 'Dia(s)',
        'Hora(s)': 'Hora(s)',
        'Aplicar': 'Aplicar',
        'Visualización de Canales': 'Visualização de Canais',
        'Elige cuántos botones de canal deseas ver directamente en las tarjetas de clientes:': 'Escolha quantos botões de canal deseja ver diretamente nos cartões dos clientes:',
        'Ver todos los canales configurados (Hasta 3)': 'Ver todos os canais configurados (Até 3)',
        'Ver máximo 2 canales (Principal y Secundario)': 'Ver no máximo 2 canais (Principal e Secundário)',
        'Ver solo Canal Principal': 'Ver apenas o Canal Principal',
        'Apariencia': 'Aparência',
        'Tema de Memora': 'Tema do Memora',
        'Modo claro activo': 'Modo claro ativo',
        'Modo oscuro activo': 'Modo escuro ativo',
        'Usar modo oscuro': 'Usar modo escuro',
        'Usar modo claro': 'Usar modo claro',
        'Idioma': 'Idioma',
        'Idioma de Memora': 'Idioma do Memora',
        'Automático (idioma del dispositivo)': 'Automático (idioma do dispositivo)',
        'Cambia los títulos, formularios y mensajes principales sin modificar tus datos guardados.': 'Altera os principais títulos, formulários e mensagens sem modificar os dados salvos.',
        'Automático usa el idioma del dispositivo; también podés elegir uno manualmente sin modificar tus datos guardados.': 'Automático usa o idioma do dispositivo; você também pode escolher um idioma manualmente sem alterar os dados salvos.',
        'Español': 'Espanhol',
        'Inglés': 'Inglês',
        'Portugués': 'Português',
        'Respaldo en la Nube (Google Drive)': 'Backup na Nuvem (Google Drive)',
        'Sin vincular': 'Não vinculado',
        'Conectar': 'Conectar',
        'Guardar en Nube': 'Salvar na Nuvem',
        'Restaurar desde Nube': 'Restaurar da Nuvem',
        'Auto-guardar al modificar': 'Salvar automaticamente ao modificar',
        'Diagnóstico del Sistema': 'Diagnóstico do Sistema',
        'Limpiar Caché PWA': 'Limpar Cache PWA',
        'Versión de App': 'Versão do App',
        'Dispositivo': 'Dispositivo',
        'Navegador': 'Navegador',
        'Almacenamiento Local': 'Armazenamento Local',
        'Reglas Automáticas': 'Regras Automáticas',
        'Auto-archivar clientes inactivos': 'Arquivar automaticamente clientes inativos',
        "Archivar clientes en 'Cerrado' o 'Perdido' tras 30 días.": "Arquivar clientes em 'Fechado' ou 'Perdido' após 30 dias.",
        'Exportación Inteligente': 'Exportação Inteligente',
        'Exportar Excel (.xlsx)': 'Exportar Excel (.xlsx)',
        'Exportar PDF (Vista activa)': 'Exportar PDF (Vista ativa)',
        'Exportar JSON Completo': 'Exportar JSON Completo',
        'Ayuda': 'Ajuda',
        '¿Cómo empiezo?': 'Como começar?',
        'Descargar manual completo': 'Baixar manual completo',
        'Volver a ver bienvenida': 'Ver boas-vindas novamente',
        'Zona de seguridad': 'Zona de Segurança',
        'Restablecer Memora': 'Redefinir Memora',
        'Borra todos los datos locales y configuraciones de este dispositivo. Requiere una confirmación escrita.': 'Apaga todos os dados locais e configurações deste dispositivo. Exige confirmação por escrito.',
        'Borrar todos los datos': 'Apagar todos os dados',
        'Consulta nueva': 'Nova consulta',
        'Información enviada': 'Informação enviada',
        'Esperando cliente': 'Aguardando cliente',
        'Esperando respuesta interna': 'Aguardando resposta interna',
        'Cerrado': 'Fechado',
        'Perdido': 'Perdido',
        'Archivado': 'Arquivado',
        'Resumen y métricas de tu gestión.': 'Resumo e métricas da sua gestão.',
        'Rendimiento General': 'Desempenho Geral',
        'Activos': 'Ativos',
        'Este Mes': 'Este Mês',
        'Top Canal': 'Canal Principal',
        'Seguimiento Requerido': 'Acompanhamento Necessário',
        'Ver todos >': 'Ver todos >',
        'Nuevo Registro / Carga Directa': 'Novo Registro / Entrada Rápida',
        'Nombre Completo (Opcional)': 'Nome Completo (Opcional)',
        'Canal Principal': 'Canal Principal',
        'Agregar otro canal (IG, Mail, LK, FB, TG)': 'Adicionar outro canal (IG, Mail, LK, FB, TG)',
        'Asunto / Motivo de la Consulta': 'Assunto / Motivo do Contato',
        'Tipo de Documento / Identificador': 'Tipo de Documento / Identificador',
        'Ninguno': 'Nenhum',
        'Nº de Cliente': 'Nº do Cliente',
        'Estado': 'Status',
        'Comentarios / Notas': 'Comentários / Notas',
        '+ Agregar': '+ Adicionar',
        'Guardar Registro': 'Salvar Registro',
        'Limpiar Campos': 'Limpar Campos',
        'Consulta y busca todos tus clientes.': 'Consulte e pesquise todos os seus clientes.',
        'Filtros detallados:': 'Filtros detalhados:',
        'Todos los canales': 'Todos os canais',
        'Todos los estados': 'Todos os status',
        'Nuevo registro': 'Novo registro',
        'Aceptar': 'Aceitar',
        'Editar dato': 'Editar dado',
        'Guardar': 'Salvar',
        '[ Cambiar dato ]': '[ Alterar dado ]',
        '[ Confirmar ]': '[ Confirmar ]',
        '[ Conservar original ]': '[ Manter original ]',
        'No hay comentarios adjuntos.': 'Não há comentários anexados.',
        'Sin seguimientos pendientes.': 'Sem acompanhamentos pendentes.',
        'Revisado': 'Revisado',
        'Desarchivar': 'Desarquivar',
        'Archivar': 'Arquivar',
        'Eliminar': 'Excluir',
        'Actualizar Registro': 'Atualizar Registro',
        'Nombre:': 'Nome:',
        'Documento / C.I.:': 'Documento / ID:',
        'Empresa:': 'Empresa:',
        'Contacto / WA:': 'Contato / WA:',
        'Sin datos adicionales cargados.': 'Nenhum dado adicional carregado.',
        'Online': 'Online'
    }
};

const MEMORA_TEXTO_ORIGINAL = new WeakMap();
const MEMORA_ATRIBUTOS_ORIGINALES = new WeakMap();
let observadorIdiomaMemora = null;
let aplicandoIdiomaMemora = false;

// Cola de traducción: agrupa mutaciones DOM en un único frame para evitar
// trabajo repetido cuando render() agrega muchas tarjetas a la vez.
const MEMORA_I18N_ARBOLES_PENDIENTES = new Set();
const MEMORA_I18N_TEXTOS_PENDIENTES = new Set();
const MEMORA_I18N_ATRIBUTOS_PENDIENTES = new Set();
let frameIdiomaMemora = null;

function idiomaMemora() {
    return MEMORA_IDIOMAS_SOPORTADOS.includes(idiomaMemoraActual) ? idiomaMemoraActual : 'es';
}

function traduccionMemora(texto) {
    if (idiomaMemora() === 'es') return texto;
    return MEMORA_TRADUCCIONES[idiomaMemora()]?.[texto] || texto;
}

function traducirPatronesMemora(texto) {
    if (idiomaMemora() === 'es') return texto;
    let salida = texto;
    const dias = idiomaMemora() === 'en'
        ? { domingo:'Sunday', lunes:'Monday', martes:'Tuesday', miércoles:'Wednesday', jueves:'Thursday', viernes:'Friday', sábado:'Saturday' }
        : { domingo:'domingo', lunes:'segunda-feira', martes:'terça-feira', miércoles:'quarta-feira', jueves:'quinta-feira', viernes:'sexta-feira', sábado:'sábado' };
    for (const [es, tr] of Object.entries(dias)) {
        salida = salida.replace(new RegExp(`^${es}\\b`, 'i'), tr);
    }
    if (idiomaMemora() === 'en') {
        salida = salida.replace(/^(\d+) registros?\b/i, '$1 records');
        salida = salida.replace(/^(\d+) registro\b/i, '$1 record');
        salida = salida.replace(/(\d+) día\(s\)/gi, '$1 day(s)');
        salida = salida.replace(/(\d+) hs\b/gi, '$1 hr');
        salida = salida.replace(/^Creado:/i, 'Created:');
        salida = salida.replace(/^Última rev:/i, 'Last review:');
    } else if (idiomaMemora() === 'pt') {
        salida = salida.replace(/^(\d+) registros?\b/i, '$1 registros');
        salida = salida.replace(/(\d+) día\(s\)/gi, '$1 dia(s)');
        salida = salida.replace(/(\d+) hs\b/gi, '$1 h');
        salida = salida.replace(/^Creado:/i, 'Criado:');
        salida = salida.replace(/^Última rev:/i, 'Última revisão:');
    }
    return salida;
}

function traducirCadenaMemora(texto) {
    const directo = traduccionMemora(texto);
    return directo !== texto ? directo : traducirPatronesMemora(texto);
}

function esTextoInterfazSeguroMemora(parent) {
    return !!parent?.closest('.tag, button, a, .time-ago, .perfil-label, [data-memora-i18n]');
}

function procesarNodoTextoIdiomaMemora(nodo) {
    if (!nodo || nodo.nodeType !== Node.TEXT_NODE) return;
    const parent = nodo.parentElement;
    if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return;

    // Las zonas con datos del usuario se protegen. Solo se permite traducir
    // controles o etiquetas marcadas explícitamente como interfaz.
    const zonaDatos = parent.closest('#listaRegistros, #contenedorSeguimiento, #contenidoFicha, #listaComentariosEdicion, #listaComentariosTemporalesInicio, #perfilDatosLista, .coincidencias-drop');
    if (zonaDatos && !esTextoInterfazSeguroMemora(parent)) return;

    const actual = nodo.nodeValue || '';
    const limpio = actual.trim();
    if (!limpio) return;

    let estado = MEMORA_TEXTO_ORIGINAL.get(nodo);
    if (!estado) {
        estado = { source: limpio, lastApplied: null };
        MEMORA_TEXTO_ORIGINAL.set(nodo, estado);
    } else if (
        estado.lastApplied !== null &&
        limpio !== estado.lastApplied &&
        limpio !== estado.source
    ) {
        // El propio sistema cambió el texto dinámicamente (contador, estado,
        // placeholder textual, etc.). Ese nuevo texto pasa a ser la fuente.
        estado.source = limpio;
    }

    const traducido = traducirCadenaMemora(estado.source);
    const prefijo = actual.match(/^\s*/)?.[0] || '';
    const sufijo = actual.match(/\s*$/)?.[0] || '';
    const nuevo = `${prefijo}${traducido}${sufijo}`;

    estado.lastApplied = traducido;
    if (actual !== nuevo) nodo.nodeValue = nuevo;
}

function procesarAtributosIdiomaMemora(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

    let estados = MEMORA_ATRIBUTOS_ORIGINALES.get(el);
    if (!estados) {
        estados = {};
        MEMORA_ATRIBUTOS_ORIGINALES.set(el, estados);
    }

    for (const attr of ['placeholder', 'title', 'aria-label']) {
        if (!el.hasAttribute(attr)) continue;

        const actual = el.getAttribute(attr) ?? '';
        let estado = estados[attr];

        if (!estado) {
            estado = { source: actual, lastApplied: null };
            estados[attr] = estado;
        } else if (
            estado.lastApplied !== null &&
            actual !== estado.lastApplied &&
            actual !== estado.source
        ) {
            // Si la app cambia legítimamente un atributo (por ejemplo al pasar
            // de WhatsApp a Instagram), actualizamos la fuente y no revivimos
            // el placeholder anterior almacenado en el WeakMap.
            estado.source = actual;
        }

        const traducido = traducirCadenaMemora(estado.source);
        estado.lastApplied = traducido;
        if (actual !== traducido) el.setAttribute(attr, traducido);
    }
}

function procesarArbolIdiomaMemora(root = document.body) {
    if (!root) return;
    aplicandoIdiomaMemora = true;
    try {
        if (root.nodeType === Node.TEXT_NODE) {
            procesarNodoTextoIdiomaMemora(root);
            return;
        }
        if (root.nodeType === Node.ELEMENT_NODE) procesarAtributosIdiomaMemora(root);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
            if (node.nodeType === Node.TEXT_NODE) procesarNodoTextoIdiomaMemora(node);
            else procesarAtributosIdiomaMemora(node);
            node = walker.nextNode();
        }
    } finally {
        aplicandoIdiomaMemora = false;
    }
}

function raizYaCubiertaPorOtraMemora(nodo, conjuntoRaices) {
    if (!nodo) return false;
    let padre = nodo.parentNode;
    while (padre) {
        if (conjuntoRaices.has(padre)) return true;
        padre = padre.parentNode;
    }
    return false;
}

function procesarColaIdiomaMemora() {
    frameIdiomaMemora = null;

    const arboles = Array.from(MEMORA_I18N_ARBOLES_PENDIENTES).filter(Boolean);
    const textos = Array.from(MEMORA_I18N_TEXTOS_PENDIENTES).filter(Boolean);
    const atributos = Array.from(MEMORA_I18N_ATRIBUTOS_PENDIENTES).filter(Boolean);

    MEMORA_I18N_ARBOLES_PENDIENTES.clear();
    MEMORA_I18N_TEXTOS_PENDIENTES.clear();
    MEMORA_I18N_ATRIBUTOS_PENDIENTES.clear();

    const conjuntoRaices = new Set(arboles);
    const raices = arboles.filter(n => !raizYaCubiertaPorOtraMemora(n, conjuntoRaices));
    raices.forEach(n => {
        if (n.isConnected !== false) procesarArbolIdiomaMemora(n);
    });

    textos.forEach(n => {
        const cubierto = n.parentElement && raices.some(r => r.nodeType === Node.ELEMENT_NODE && r.contains(n.parentElement));
        if (!cubierto && n.isConnected !== false) procesarNodoTextoIdiomaMemora(n);
    });

    atributos.forEach(el => {
        const cubierto = raices.some(r => r.nodeType === Node.ELEMENT_NODE && r.contains(el));
        if (!cubierto && el.isConnected !== false) procesarAtributosIdiomaMemora(el);
    });
}

function programarProcesamientoIdiomaMemora(tipo, nodo) {
    if (!nodo) return;

    if (tipo === 'arbol') MEMORA_I18N_ARBOLES_PENDIENTES.add(nodo);
    else if (tipo === 'texto') MEMORA_I18N_TEXTOS_PENDIENTES.add(nodo);
    else if (tipo === 'atributo') MEMORA_I18N_ATRIBUTOS_PENDIENTES.add(nodo);

    if (frameIdiomaMemora !== null) return;

    const raf = window.requestAnimationFrame || (cb => window.setTimeout(cb, 16));
    frameIdiomaMemora = raf(procesarColaIdiomaMemora);
}

function asegurarValoresEstadoMemora() {
    ['estado', 'estadoInicio', 'filtroEstado'].forEach(id => {
        const select = $(id);
        if (!select) return;
        Array.from(select.options).forEach(op => {
            const texto = op.textContent.trim();
            if (estados.includes(texto)) op.value = texto;
        });
    });
}

function actualizarManualIdiomaMemora() {
    const link = $('linkManualCompletoMemora');
    if (!link) return;

    const lang = idiomaMemora().toUpperCase();
    const archivo = `Manual_Memora_v1.5.0_${lang}.pdf`;
    link.href = `./docs/${archivo}`;
    link.setAttribute('download', archivo);
}

function aplicarIdiomaMemora() {
    asegurarValoresEstadoMemora();
    document.documentElement.lang = idiomaMemora() === 'pt' ? 'pt' : idiomaMemora();
    if ($('cfgIdiomaMemora')) $('cfgIdiomaMemora').value = preferenciaIdiomaMemora;
    procesarArbolIdiomaMemora(document.body);
    actualizarManualIdiomaMemora();
    actualizarSaludoDinamico();
    if (typeof actualizarSeguimiento === 'function') actualizarSeguimiento();
}

function guardarIdiomaMemora() {
    const nuevo = $('cfgIdiomaMemora')?.value || 'auto';
    preferenciaIdiomaMemora = MEMORA_IDIOMAS_SELECCIONABLES.includes(nuevo) ? nuevo : 'auto';
    localStorage.setItem(MEMORA_IDIOMA_KEY, preferenciaIdiomaMemora);
    idiomaMemoraActual = preferenciaIdiomaMemora === 'auto'
        ? detectarIdiomaSistemaMemora()
        : preferenciaIdiomaMemora;

    // Render regenera contenido dinámico con sus valores originales y luego se traduce visualmente.
    if (typeof render === 'function') render();
    aplicarIdiomaMemora();
}

function inicializarIdiomaMemora() {
    asegurarValoresEstadoMemora();
    procesarArbolIdiomaMemora(document.body);
    observadorIdiomaMemora = new MutationObserver(mutations => {
        if (aplicandoIdiomaMemora) return;

        for (const m of mutations) {
            if (m.type === 'characterData') {
                programarProcesamientoIdiomaMemora('texto', m.target);
            } else if (m.type === 'childList') {
                m.addedNodes.forEach(n => programarProcesamientoIdiomaMemora('arbol', n));
            } else if (m.type === 'attributes') {
                programarProcesamientoIdiomaMemora('atributo', m.target);
            }
        }
    });
    observadorIdiomaMemora.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'aria-label']
    });
    aplicarIdiomaMemora();
}

function obtenerSaludoTraducidoMemora(d = ahoraMemora()) {
    const hora = d.getHours();
    if (idiomaMemora() === 'en') {
        if (hora >= 5 && hora < 12) return 'Good morning';
        if (hora >= 12 && hora < 20) return 'Good afternoon';
        return 'Good evening';
    }
    if (idiomaMemora() === 'pt') {
        if (hora >= 5 && hora < 12) return 'Bom dia';
        if (hora >= 12 && hora < 20) return 'Boa tarde';
        return 'Boa noite';
    }
    return obtenerSaludoPorHora(d);
}

const _actualizarSaludoDinamicoV143 = actualizarSaludoDinamico;
actualizarSaludoDinamico = function(d = ahoraMemora()) {
    if (idiomaMemora() === 'es') return _actualizarSaludoDinamicoV143(d);
    const datosRaw = localStorage.getItem('memora_admin_user_data');
    const datos = datosRaw ? JSON.parse(datosRaw) : { nombreAdmin: '' };
    const primerNombre = datos.nombreAdmin ? datos.nombreAdmin.trim().split(/\s+/)[0] : (idiomaMemora() === 'en' ? 'User' : 'Usuário');
    if ($('saludo')) $('saludo').innerText = `${obtenerSaludoTraducidoMemora(d)}, ${primerNombre}`;
};

const _actualizarSeguimientoV143 = actualizarSeguimiento;
actualizarSeguimiento = function() {
    _actualizarSeguimientoV143();
    if (idiomaMemora() === 'es') return;
    const cfg = obtenerConfigSeguimiento();
    const unidad = cfg.unidad === 'horas'
        ? (idiomaMemora() === 'en' ? `${cfg.valor} hour(s)` : `${cfg.valor} hora(s)`)
        : (idiomaMemora() === 'en' ? `${cfg.valor} day(s)` : `${cfg.valor} dia(s)`);
    if ($('textoBannerSeguimiento')) {
        $('textoBannerSeguimiento').innerHTML = idiomaMemora() === 'en'
            ? `MEMORA automatically manages customers with <strong>${unidad} or more without activity</strong>. If a record has not been updated and is not <em>Closed, Lost or Archived</em>, it will appear below for review.`
            : `O MEMORA gerencia automaticamente clientes com <strong>${unidad} ou mais sem atividade</strong>. Se um registro não foi atualizado e não está <em>Fechado, Perdido ou Arquivado</em>, aparecerá abaixo para revisão.`;
    }
    procesarArbolIdiomaMemora($('contenedorSeguimiento'));
};

/* ---------- Validación reforzada 1.5.0 ---------- */

const MEMORA_REGLAS_TELEFONO = {
    '+598': { min: 8, max: 8, pais: 'Uruguay' },
    '+549': { min: 10, max: 10, pais: 'Argentina móvil' },
    '+54':  { min: 10, max: 10, pais: 'Argentina' },
    '+55':  { min: 10, max: 11, pais: 'Brasil' },
    '+595': { min: 9, max: 9, pais: 'Paraguay' },
    '+56':  { min: 9, max: 9, pais: 'Chile' },
    '+591': { min: 8, max: 8, pais: 'Bolivia' },
    '+51':  { min: 9, max: 9, pais: 'Perú' },
    '+57':  { min: 10, max: 10, pais: 'Colombia' },
    '+593': { min: 9, max: 9, pais: 'Ecuador' },
    '+58':  { min: 10, max: 10, pais: 'Venezuela' },
    '+52':  { min: 10, max: 10, pais: 'México' },
    '+506': { min: 8, max: 8, pais: 'Costa Rica' },
    '+507': { min: 7, max: 8, pais: 'Panamá' },
    '+502': { min: 8, max: 8, pais: 'Guatemala' },
    '+503': { min: 8, max: 8, pais: 'El Salvador' },
    '+504': { min: 8, max: 8, pais: 'Honduras' },
    '+505': { min: 8, max: 8, pais: 'Nicaragua' },
    '+1':   { min: 10, max: 10, pais: 'US/CA' },
    '+34':  { min: 9, max: 9, pais: 'España' },
    '+39':  { min: 6, max: 11, pais: 'Italia' },
    '+33':  { min: 9, max: 9, pais: 'Francia' },
    '+44':  { min: 10, max: 10, pais: 'Reino Unido' },
    '+49':  { min: 7, max: 11, pais: 'Alemania' },
    '+351': { min: 9, max: 9, pais: 'Portugal' }
};

function mensajeValidacion150(clave, vars = {}) {
    const mensajes = {
        es: {
            telefono: `Revisa el número para ${vars.pais || 'el país seleccionado'}: debe tener ${vars.rango || 'una longitud válida'} dígitos nacionales.`,
            telefonoRepetido: 'El número no parece válido: no puede estar formado por un mismo dígito repetido.',
            email: 'Ingrese un correo válido (usuario@dominio.extensión), sin espacios ni puntos duplicados.',
            instagram: 'Instagram admite hasta 30 caracteres: letras, números, punto y guion bajo.',
            telegram: 'Telegram debe tener entre 5 y 32 caracteres: letras, números y guion bajo.',
            social: 'Ingrese un usuario, perfil o enlace válido.',
            nombre: 'Ingrese un nombre válido de 3 a 120 caracteres, sin números.',
            asunto: 'El asunto debe tener entre 3 y 200 caracteres y contener texto.',
            duplicado: `Ya existe un registro con este ${vars.tipo || 'dato'}: ${vars.nombre || 'registro existente'}.`,
            idDuplicado: `Ya existe un registro con el mismo identificador: ${vars.nombre || 'registro existente'}.`
        },
        en: {
            telefono: `Check the number for ${vars.pais || 'the selected country'}: it must contain ${vars.rango || 'a valid number of'} national digits.`,
            telefonoRepetido: 'The number does not look valid: it cannot be the same digit repeated.',
            email: 'Enter a valid email (user@domain.extension), without spaces or repeated dots.',
            instagram: 'Instagram allows up to 30 characters: letters, numbers, dots and underscores.',
            telegram: 'Telegram must have 5 to 32 characters: letters, numbers and underscores.',
            social: 'Enter a valid username, profile or link.',
            nombre: 'Enter a valid name of 3 to 120 characters, without numbers.',
            asunto: 'The subject must contain 3 to 200 characters and include text.',
            duplicado: `A record already uses this ${vars.tipo || 'data'}: ${vars.nombre || 'existing record'}.`,
            idDuplicado: `A record already uses the same identifier: ${vars.nombre || 'existing record'}.`
        },
        pt: {
            telefono: `Revise o número para ${vars.pais || 'o país selecionado'}: deve conter ${vars.rango || 'uma quantidade válida de'} dígitos nacionais.`,
            telefonoRepetido: 'O número não parece válido: não pode ser formado pelo mesmo dígito repetido.',
            email: 'Digite um e-mail válido (usuario@dominio.extensão), sem espaços ou pontos duplicados.',
            instagram: 'Instagram aceita até 30 caracteres: letras, números, ponto e sublinhado.',
            telegram: 'Telegram deve ter entre 5 e 32 caracteres: letras, números e sublinhado.',
            social: 'Digite um usuário, perfil ou link válido.',
            nombre: 'Digite um nome válido de 3 a 120 caracteres, sem números.',
            asunto: 'O assunto deve ter entre 3 e 200 caracteres e conter texto.',
            duplicado: `Já existe um registro com este ${vars.tipo || 'dado'}: ${vars.nombre || 'registro existente'}.`,
            idDuplicado: `Já existe um registro com o mesmo identificador: ${vars.nombre || 'registro existente'}.`
        }
    };
    return (mensajes[idiomaMemora()] || mensajes.es)[clave] || clave;
}

function validarTelefonoMemora150(valor, prefijo = '+598') {
    const raw = String(valor || '').trim();
    if (!raw) return { ok: false, mensaje: mensajeValidacion150('telefono', { pais: MEMORA_REGLAS_TELEFONO[prefijo]?.pais || prefijo, rango: '—' }) };
    if (/[a-zA-Z]/.test(raw)) return { ok: false, mensaje: mensajeValidacion150('telefono', { pais: MEMORA_REGLAS_TELEFONO[prefijo]?.pais || prefijo, rango: '—' }) };

    let prefijoReal = prefijo;
    let numeroNacional = raw.replace(/\D/g, '');
    if (raw.startsWith('+')) {
        const partes = separarNumeroWhatsapp(raw);
        prefijoReal = partes.prefijo;
        numeroNacional = String(partes.numero || '').replace(/\D/g, '');
    } else {
        numeroNacional = numeroNacional.replace(/^0+/, '');
    }

    const regla = MEMORA_REGLAS_TELEFONO[prefijoReal] || { min: 7, max: 12, pais: prefijoReal };
    const rango = regla.min === regla.max ? `${regla.min}` : `${regla.min}-${regla.max}`;
    if (numeroNacional.length < regla.min || numeroNacional.length > regla.max) {
        return { ok: false, mensaje: mensajeValidacion150('telefono', { pais: regla.pais, rango }) };
    }
    if (/^(\d)\1+$/.test(numeroNacional)) {
        return { ok: false, mensaje: mensajeValidacion150('telefonoRepetido') };
    }
    const e164 = normalizarNumeroWhatsapp(raw, prefijoReal).replace(/\D/g, '');
    if (e164.length < 8 || e164.length > 15) {
        return { ok: false, mensaje: mensajeValidacion150('telefono', { pais: regla.pais, rango }) };
    }
    return { ok: true, normalizado: `+${e164}` };
}

function validarEmailMemora150(valor) {
    const email = String(valor || '').trim();
    if (!email || email.length > 254 || /\s/.test(email) || email.includes('..')) return { ok: false, mensaje: mensajeValidacion150('email') };
    const partes = email.split('@');
    if (partes.length !== 2 || !partes[0] || partes[0].length > 64) return { ok: false, mensaje: mensajeValidacion150('email') };
    if (partes[0].startsWith('.') || partes[0].endsWith('.')) return { ok: false, mensaje: mensajeValidacion150('email') };
    const dominio = partes[1];
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(dominio)) {
        return { ok: false, mensaje: mensajeValidacion150('email') };
    }
    return { ok: true, normalizado: email.toLowerCase() };
}

function validarContactoAvanzadoMemora150(canal, valor, prefijo = '+598') {
    const v = String(valor || '').trim();
    if (!v) return { ok: false, mensaje: idiomaMemora() === 'en' ? 'This field is required.' : idiomaMemora() === 'pt' ? 'Este campo é obrigatório.' : 'Este campo es obligatorio.' };
    if (canal === 'WhatsApp') return validarTelefonoMemora150(v, prefijo);
    if (canal === 'Email') return validarEmailMemora150(v);
    if (canal === 'Instagram') {
        const u = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '');
        const ok = u.length >= 1 && u.length <= 30 && /^[A-Za-z0-9._]+$/.test(u) && !u.includes('..');
        return { ok, mensaje: ok ? '' : mensajeValidacion150('instagram') };
    }
    if (canal === 'Telegram') {
        const u = v.replace(/^https?:\/\/(www\.)?t\.me\//i, '').replace(/^@/, '').replace(/\/$/, '');
        const ok = u.length >= 5 && u.length <= 32 && /^[A-Za-z0-9_]+$/.test(u);
        return { ok, mensaje: ok ? '' : mensajeValidacion150('telegram') };
    }
    if (['LinkedIn', 'Facebook'].includes(canal)) {
        const ok = v.length >= 3 && v.length <= 250 && !/^\s+$/.test(v);
        return { ok, mensaje: ok ? '' : mensajeValidacion150('social') };
    }
    return { ok: v.length >= 3, mensaje: v.length >= 3 ? '' : mensajeValidacion150('social') };
}

function claveContactoMemora150(canal, valor, prefijo = '+598') {
    const v = String(valor || '').trim();
    if (!v) return '';
    if (canal === 'WhatsApp') return `whatsapp:${normalizarNumeroWhatsapp(v, prefijo).replace(/\D/g, '')}`;
    if (canal === 'Email') return `email:${v.toLowerCase()}`;
    if (canal === 'Instagram') return `instagram:${v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '').toLowerCase()}`;
    if (canal === 'Telegram') return `telegram:${v.replace(/^https?:\/\/(www\.)?t\.me\//i, '').replace(/^@/, '').replace(/\/$/, '').toLowerCase()}`;
    if (canal === 'Facebook') return `facebook:${v.replace(/^@/, '').replace(/\/$/, '').toLowerCase()}`;
    if (canal === 'LinkedIn') return `linkedin:${v.replace(/\/$/, '').toLowerCase()}`;
    return `${String(canal || 'contacto').toLowerCase()}:${v.toLowerCase()}`;
}

function contactosRegistroMemora150(r) {
    return [
        [r.canal, r.contacto],
        [r.canal2, r.contacto2],
        [r.canal3, r.contacto3]
    ].filter(([c, v]) => c && v).map(([c, v]) => ({ canal: c, clave: claveContactoMemora150(c, v, '+598') }));
}

function contactosFormularioMemora150(sufijo = '') {
    const resultado = [];
    const canal = $(`canal${sufijo}`)?.value || 'WhatsApp';
    const contacto = $(`contacto${sufijo}`)?.value || '';
    const prefijo = $(`prefijoWhatsapp${sufijo}`)?.value || '+598';
    if (contacto.trim()) resultado.push({ canal, valor: contacto, prefijo, clave: claveContactoMemora150(canal, contacto, prefijo) });

    const contenedorId = sufijo ? `contenedorCanalesExtra${sufijo}` : 'contenedorCanalesExtraMovil';
    const contenedor = $(contenedorId);
    if (contenedor) {
        contenedor.querySelectorAll('.sub-canal-block, .sub-canal-block-movil').forEach(bloque => {
            const sel = bloque.querySelector('.sub-canal-select');
            const inp = bloque.querySelector('input');
            const pref = bloque.querySelector('.wa-prefix-extra');
            if (sel && inp && inp.value.trim()) {
                resultado.push({
                    canal: sel.value,
                    valor: inp.value,
                    prefijo: pref?.value || '+598',
                    clave: claveContactoMemora150(sel.value, inp.value, pref?.value || '+598')
                });
            }
        });
    }
    return resultado;
}

function validarDuplicadosMemora150(sufijo = '') {
    const actuales = contactosFormularioMemora150(sufijo);
    for (const item of actuales) {
        if (!item.clave) continue;
        const existente = registros.find(r => {
            if (editando !== null && r.id === editando) return false;
            return contactosRegistroMemora150(r).some(c => c.clave === item.clave);
        });
        if (existente) {
            mostrarAvisoMemora(
                mensajeValidacion150('duplicado', {
                    tipo: item.canal,
                    nombre: existente.nombre || existente.contacto || 'registro existente'
                }),
                idiomaMemora() === 'en' ? 'Possible duplicate' : idiomaMemora() === 'pt' ? 'Possível duplicado' : 'Posible duplicado',
                'warning'
            );
            return false;
        }
    }

    const tipoId = $(`tipoId${sufijo}`)?.value || 'Ninguno';
    const idValor = $(`valorId${sufijo}`)?.value?.trim() || '';
    if (tipoId !== 'Ninguno' && idValor) {
        const claveId = `${tipoId}:${idValor.replace(/[\s.-]/g, '').toUpperCase()}`;
        const existente = registros.find(r => {
            if (editando !== null && r.id === editando) return false;
            const otro = `${r.tipoIdentificador || 'Ninguno'}:${String(r.identificador || '').replace(/[\s.-]/g, '').toUpperCase()}`;
            return otro === claveId;
        });
        if (existente) {
            mostrarAvisoMemora(
                mensajeValidacion150('idDuplicado', { nombre: existente.nombre || existente.contacto || 'registro existente' }),
                idiomaMemora() === 'en' ? 'Possible duplicate' : idiomaMemora() === 'pt' ? 'Possível duplicado' : 'Posible duplicado',
                'warning'
            );
            return false;
        }
    }
    return true;
}

function validarFormularioAvanzadoMemora150(sufijo = '') {
    const nombreEl = $(`nombre${sufijo}`);
    if (nombreEl) {
        const v = nombreEl.value.trim();
        if (v && (v.length < 3 || v.length > 120 || /[0-9]/.test(v) || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀ-ÿ]/.test(v))) {
            mostrarErrorCampo(nombreEl.id, `err_${nombreEl.id}`, mensajeValidacion150('nombre'), true);
            nombreEl.focus();
            return false;
        }
    }

    const canalEl = $(`canal${sufijo}`);
    const contactoEl = $(`contacto${sufijo}`);
    if (contactoEl) {
        const canal = canalEl?.value || 'WhatsApp';
        const prefijo = $(`prefijoWhatsapp${sufijo}`)?.value || '+598';
        const res = validarContactoAvanzadoMemora150(canal, contactoEl.value, prefijo);
        if (!res.ok) {
            mostrarErrorCampo(contactoEl.id, `err_${contactoEl.id}`, res.mensaje, true);
            contactoEl.focus();
            return false;
        }
    }

    const contenedorId = sufijo ? `contenedorCanalesExtra${sufijo}` : 'contenedorCanalesExtraMovil';
    const contenedor = $(contenedorId);
    if (contenedor) {
        for (const bloque of contenedor.querySelectorAll('.sub-canal-block, .sub-canal-block-movil')) {
            const sel = bloque.querySelector('.sub-canal-select');
            const inp = bloque.querySelector('input');
            const pref = bloque.querySelector('.wa-prefix-extra');
            if (sel && inp && inp.value.trim()) {
                const res = validarContactoAvanzadoMemora150(sel.value, inp.value, pref?.value || '+598');
                if (!res.ok) {
                    mostrarErrorCampo(inp.id, `err_${inp.id}`, res.mensaje, true);
                    inp.focus();
                    return false;
                }
            }
        }
    }

    const asuntoEl = $(`asunto${sufijo}`);
    if (asuntoEl) {
        const v = asuntoEl.value.trim();
        if (v && (v.length < 3 || v.length > 200 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀ-ÿ0-9]/.test(v))) {
            mostrarErrorCampo(asuntoEl.id, `err_${asuntoEl.id}`, mensajeValidacion150('asunto'), true);
            asuntoEl.focus();
            return false;
        }
    }

    return validarDuplicadosMemora150(sufijo);
}

const _validarFormularioAntesDeGuardarV143 = validarFormularioAntesDeGuardar;
validarFormularioAntesDeGuardar = function(sufijo = '') {
    if (!_validarFormularioAntesDeGuardarV143(sufijo)) return false;
    return validarFormularioAvanzadoMemora150(sufijo);
};

function activarValidacionAvanzadaEnCampoMemora150(sufijo = '') {
    const canalEl = $(`canal${sufijo}`);
    const contactoEl = $(`contacto${sufijo}`);
    const prefijoEl = $(`prefijoWhatsapp${sufijo}`);
    const nombreEl = $(`nombre${sufijo}`);
    const asuntoEl = $(`asunto${sufijo}`);

    if (contactoEl && contactoEl.dataset.memoraVal150 !== '1') {
        const validar = () => {
            const valor = contactoEl.value.trim();
            if (!valor) {
                mostrarErrorCampo(contactoEl.id, `err_${contactoEl.id}`, '', false);
                return;
            }
            const res = validarContactoAvanzadoMemora150(canalEl?.value || 'WhatsApp', valor, prefijoEl?.value || '+598');
            mostrarErrorCampo(contactoEl.id, `err_${contactoEl.id}`, res.mensaje || '', !res.ok);
        };
        contactoEl.addEventListener('input', validar);
        contactoEl.addEventListener('blur', validar);
        prefijoEl?.addEventListener('change', validar);
        contactoEl.dataset.memoraVal150 = '1';
    }

    if (nombreEl && nombreEl.dataset.memoraVal150 !== '1') {
        const validar = () => {
            const v = nombreEl.value.trim();
            const invalido = !!v && (v.length < 3 || v.length > 120 || /[0-9]/.test(v) || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀ-ÿ]/.test(v));
            mostrarErrorCampo(nombreEl.id, `err_${nombreEl.id}`, mensajeValidacion150('nombre'), invalido);
        };
        nombreEl.addEventListener('input', validar);
        nombreEl.addEventListener('blur', validar);
        nombreEl.dataset.memoraVal150 = '1';
    }

    if (asuntoEl && asuntoEl.dataset.memoraVal150 !== '1') {
        const validar = () => {
            const v = asuntoEl.value.trim();
            const invalido = !!v && (v.length < 3 || v.length > 200 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀ-ÿ0-9]/.test(v));
            mostrarErrorCampo(asuntoEl.id, `err_${asuntoEl.id}`, mensajeValidacion150('asunto'), invalido);
        };
        asuntoEl.addEventListener('input', validar);
        asuntoEl.addEventListener('blur', validar);
        asuntoEl.dataset.memoraVal150 = '1';
    }
}

const _validarCampoEnTiempoRealV143 = validarCampoEnTiempoReal;
validarCampoEnTiempoReal = function(sufijo = '') {
    _validarCampoEnTiempoRealV143(sufijo);
    activarValidacionAvanzadaEnCampoMemora150(sufijo);
};

/* ---------- Hard Reset seguro ---------- */

function solicitarHardResetMemora() {
    const titulo = idiomaMemora() === 'en' ? 'Reset Memora' : idiomaMemora() === 'pt' ? 'Redefinir Memora' : 'Restablecer Memora';
    const texto = idiomaMemora() === 'en'
        ? 'This will permanently delete all Memora data stored on this device. Type BORRAR MEMORA to continue.'
        : idiomaMemora() === 'pt'
            ? 'Isto apagará permanentemente todos os dados do Memora armazenados neste dispositivo. Digite BORRAR MEMORA para continuar.'
            : 'Esto eliminará permanentemente todos los datos de Memora guardados en este dispositivo. Escribí BORRAR MEMORA para continuar.';

    mostrarPromptMemora(texto, '', titulo, valor => {
        if (valor === null) return;
        if (String(valor).trim().toUpperCase() !== 'BORRAR MEMORA') {
            mostrarAvisoMemora(
                idiomaMemora() === 'en' ? 'The confirmation text does not match. No data was deleted.' : idiomaMemora() === 'pt' ? 'O texto de confirmação não coincide. Nenhum dado foi apagado.' : 'El texto de confirmación no coincide. No se eliminó ningún dato.',
                titulo,
                'warning'
            );
            return;
        }
        mostrarConfirmMemora(
            idiomaMemora() === 'en' ? 'Last confirmation: delete all local Memora data and restart from zero?' : idiomaMemora() === 'pt' ? 'Última confirmação: apagar todos os dados locais do Memora e recomeçar do zero?' : 'Última confirmación: ¿borrar todos los datos locales de Memora y comenzar desde cero?',
            titulo,
            'warning',
            '#DC2626',
            confirmado => {
                if (confirmado) ejecutarHardResetMemora();
            }
        );
    });
}

async function ejecutarHardResetMemora() {
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('memora_')) localStorage.removeItem(k);
    });
    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.filter(k => k.startsWith('memora-')).map(k => caches.delete(k)));
        }
    } catch (e) {
        console.warn('MEMORA: no se pudo limpiar Cache Storage durante Hard Reset.', e);
    }
    try {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
        }
    } catch (e) {
        console.warn('MEMORA: no se pudo desregistrar el Service Worker durante Hard Reset.', e);
    }
    window.location.reload();
}

// Inicialización aditiva. El listener original 1.4.3 se mantiene intacto y corre primero.
document.addEventListener('DOMContentLoaded', () => {
    asegurarValoresEstadoMemora();
    if ($('cfgIdiomaMemora')) $('cfgIdiomaMemora').value = preferenciaIdiomaMemora;
    activarValidacionAvanzadaEnCampoMemora150('');
    activarValidacionAvanzadaEnCampoMemora150('Inicio');
    inicializarIdiomaMemora();
});


/* ==========================================================================
   1.5.0 - INTERNACIONALIZACION COMPLETA DE INTERFAZ Y EXPORTES
   No modifica los datos guardados ni la logica funcional existente.
   ========================================================================== */

Object.assign(MEMORA_TRADUCCIONES.en, {
    'MEMORA - Seguimiento Inteligente de Clientes': 'MEMORA - Intelligent Customer Follow-up',
    '¡Hola!': 'Hello!',
    'Estás probando la Versión Demo': 'You are trying the Demo Version',
    'Límite de prueba:': 'Trial limit:',
    '/ 15 registros activos.': '/ 15 active records.',
    'Obtener PRO ⚡': 'Get PRO ⚡',
    'Info enviada': 'Info sent',
    'Resp. interna': 'Internal resp.',
    'Seguimiento Inteligente ⚡': 'Intelligent Follow-up ⚡',
    'MEMORA administra automáticamente a los clientes inactivos según tus reglas.': 'MEMORA automatically manages inactive customers according to your rules.',
    'Ver Archivados': 'View Archived',
    'Ver Activos': 'View Active',
    'Exportar (.xlsx)': 'Export (.xlsx)',
    'Nuevo Registro': 'New Record',
    'Nuevo Cliente': 'New Customer',
    'Editar Cliente': 'Edit Customer',
    'RUT (Empresa)': 'Tax ID (Company)',
    'Nº de Cliente / Socio': 'Customer / Member No.',
    'Comentarios': 'Comments',
    '+ Añadir': '+ Add',
    'Completa tu Perfil': 'Complete your Profile',
    'Ingresa tus datos por única vez para personalizar tu cuenta y el saludo del sistema.': 'Enter your details once to personalize your account and system greeting.',
    'Tu Nombre Completo (* Requerido)': 'Your Full Name (* Required)',
    'Documento / C.I. / RUT': 'Document / ID / Tax ID',
    'Guardar y Continuar': 'Save and Continue',
    'Siguiente': 'Next',
    'Ingresar a Memora': 'Enter Memora',
    '¿Es seguro?': 'Are you sure?',
    'Editar información': 'Edit information',
    'Bienvenido a Memora': 'Welcome to Memora',
    'Memora te ayuda a organizar clientes, conversaciones y seguimientos para que no dependas de acordarte de todo.': 'Memora helps you organize customers, conversations and follow-ups so you do not have to remember everything yourself.',
    'Todo empieza con un registro': 'Everything starts with a record',
    'Guardá a cada cliente con su motivo de contacto, estado, comentarios y los canales por donde hablás con él: WhatsApp, Instagram, LinkedIn y más.': 'Save each customer with their reason for contact, status, comments and the channels you use to communicate: WhatsApp, Instagram, LinkedIn and more.',
    'Sabé a quién volver a contactar': 'Know who to contact again',
    'Definí cuánto tiempo puede pasar sin actividad. Cuando un registro supera ese plazo, Memora lo muestra en Seguimiento Requerido.': 'Set how long a record can remain inactive. When it exceeds that time, Memora shows it under Follow-up Required.',
    '¿Todo sigue igual? Marcá Revisado': 'Nothing changed? Mark it Reviewed',
    'Si revisaste un caso y todavía no cambió nada, marcá Revisado. Memora registra la revisión y vuelve a programar el seguimiento sin modificar la información del cliente.': 'If you reviewed a case and nothing has changed, mark it Reviewed. Memora records the review and schedules the follow-up again without changing the customer information.',
    'Volvé a la conversación en un toque': 'Return to the conversation in one tap',
    'Usá los botones de cada canal para retomar el contacto directamente. En WhatsApp, Memora puede dejar preparado el mensaje para continuar la conversación.': 'Use each channel button to resume the conversation directly. In WhatsApp, Memora can prepare the message so you can continue the conversation.',
    'Tus datos siguen siendo tuyos': 'Your data remains yours',
    'Podés respaldar tu información en Google Drive y exportar tus registros a Excel, PDF o JSON cuando lo necesites.': 'You can back up your information to Google Drive and export your records to Excel, PDF or JSON whenever you need them.',
    'Canal Extra': 'Extra Channel',
    'Contacto / Usuario': 'Contact / Username',
    'Quitar': 'Remove',
    'Prefijo de WhatsApp': 'WhatsApp country code',
    'Ej: @usuario / mail / url': 'E.g.: @username / email / URL',
    'Usuario Instagram (@)': 'Instagram Username (@)',
    'Correo electrónico / Mail': 'Email Address',
    'Perfil LinkedIn (URL o Nombre)': 'LinkedIn Profile (URL or Name)',
    'Usuario Facebook': 'Facebook Username',
    'Ej: @usuario': 'E.g.: @username',
    'Ej: cliente@correo.com': 'E.g.: customer@email.com',
    'Ej: linkedin.com/in/usuario': 'E.g.: linkedin.com/in/username',
    'Ej: nombre.usuario': 'E.g.: username',
    'Ingrese contacto': 'Enter contact',
    'Si no especificas, se usará su dato principal': 'If left blank, the primary contact will be used',
    'Escribe un comentario...': 'Write a comment...',
    'Máximo 3 canales alcanzado': 'Maximum of 3 channels reached',
    '¿Cómo empiezo?': 'How do I start?',
    'Creá un registro cuando aparezca un nuevo cliente o consulta.': 'Create a record when a new customer or inquiry appears.',
    'Guardá por dónde hablás con esa persona y el motivo del contacto.': 'Save how you communicate with that person and the reason for the contact.',
    'Elegí el estado que mejor represente en qué quedó la conversación.': 'Choose the status that best represents where the conversation stands.',
    'Agregá comentarios cuando haya novedades.': 'Add comments whenever there are updates.',
    'Memora te mostrará cuándo un registro necesita seguimiento.': 'Memora will show you when a record needs follow-up.',
    '¿Qué es Seguimiento Requerido?': 'What is Follow-up Required?',
    'Es la lista de clientes o gestiones que llevan más tiempo sin actividad del que configuraste. Podés definir ese plazo desde Perfil, en horas o días.': 'It is the list of customers or cases that have been inactive longer than the time you configured. You can set that period from Profile, in hours or days.',
    '¿Para qué sirve Revisado?': 'What is Reviewed for?',
    'Usalo cuando verificaste un registro pero no hay nada nuevo para modificar. Memora guarda la nueva revisión y vuelve a calcular cuándo debería aparecer en seguimiento.': 'Use it when you checked a record but there is nothing new to change. Memora saves the new review and recalculates when it should appear for follow-up.',
    '¿Cómo funcionan los canales?': 'How do channels work?',
    'Cada registro puede tener hasta 3 canales diferentes, por ejemplo WhatsApp, Instagram y LinkedIn. Desde la tarjeta podés abrir directamente el canal correspondiente para retomar la conversación.': 'Each record can have up to 3 different channels, for example WhatsApp, Instagram and LinkedIn. From the card you can open the corresponding channel directly to resume the conversation.',
    '¿Qué pasa con mis datos?': 'What happens to my data?',
    'Podés realizar respaldos en tu Google Drive y exportar información cuando la necesites. La vista activa puede exportarse a Excel o PDF, y la base completa puede descargarse en JSON.': 'You can back up your data to Google Drive and export information whenever you need it. The active view can be exported to Excel or PDF, and the full database can be downloaded as JSON.',
    'No hay registros para exportar en la vista o filtro actual.': 'There are no records to export in the current view or filter.',
    'Exportación Excel': 'Excel Export',
    'Exportación PDF': 'PDF Export',
    'No se pudo generar el archivo Excel. Intenta nuevamente.': 'The Excel file could not be generated. Please try again.',
    'No se pudo generar el PDF. Intenta nuevamente.': 'The PDF could not be generated. Please try again.',
    'Tipo Doc / ID': 'Doc / ID Type',
    'Doc / RUT / Nº Cliente': 'Document / Tax ID / Customer No.',
    'Nombre del Cliente': 'Customer Name',
    'Asunto / Motivo': 'Subject / Reason',
    'Teléfono / WhatsApp': 'Phone / WhatsApp',
    'Usuario (@)': 'Username (@)',
    'Correo Electrónico': 'Email Address',
    'Canal 2': 'Channel 2',
    'Contacto 2': 'Contact 2',
    'Canal 3': 'Channel 3',
    'Contacto 3': 'Contact 3',
    'Estado Actual': 'Current Status',
    'Último Comentario': 'Latest Comment',
    'Total Comentarios': 'Total Comments',
    'Fecha de Registro': 'Record Date',
    'Última Revisión': 'Last Review',
    'Sin comentarios': 'No comments',
    'Sin registrar': 'Not provided',
    'Sin asunto': 'No subject',
    'Contacto': 'Contact',
    'MEMORA - Reporte de clientes': 'MEMORA - Customer Report',
    'MEMORA - Reporte de Registros': 'MEMORA - Records Report',
    'Relaciones que avanzan': 'Relationships that move forward',
    'Exportado el': 'Exported on',
    'Vista / filtro': 'View / filter',
    'Vista activa': 'Active view',
    'Total': 'Total',
    'Emisión': 'Issued',
    'Canal:': 'Channel:',
    'Asunto:': 'Subject:',
    'Rev:': 'Review:',
    'Canales extra:': 'Extra channels:',
    'Nota:': 'Note:',
    'Generado con Memora PRO el': 'Generated with Memora PRO on',
    'Página': 'Page',
    'de': 'of',
    'Todos': 'All',
    'Revisar': 'Review',
    'Ver': 'View',
    'Editar': 'Edit',
    'Comentario del': 'Comment from',
    'Sin comentarios.': 'No comments.',
    'Asunto:': 'Subject:',
    'Creado:': 'Created:',
    'Última rev:': 'Last review:',
    'Editado el': 'Edited on',
    'Dato Requerido': 'Required Field',
    'Canales Duplicados': 'Duplicate Channels',
    'Configuración': 'Settings',
    'Revisión': 'Review',
    'Restaurar Copia': 'Restore Backup',
    'Cuenta de Google Drive desconectada.': 'Google Drive account disconnected.',
    'Cargando cliente de Google, reintenta un instante...': 'Loading Google client, please try again in a moment...',
    'Primero debes conectar tu cuenta de Google Drive.': 'You must connect your Google Drive account first.',
    'Respaldo guardado correctamente en tu Google Drive.': 'Backup saved successfully to your Google Drive.',
    'Primer respaldo creado con éxito en tu Google Drive.': 'First backup created successfully in your Google Drive.',
    'Error de conexión al guardar en Drive.': 'Connection error while saving to Drive.',
    'No se encontró ningún archivo \'memora_backup.json\' en tu Drive.': 'No \'memora_backup.json\' file was found in your Drive.',
    'El archivo respaldado no tiene un formato válido.': 'The backup file does not have a valid format.',
    'Ocurrió un error al intentar descargar el respaldo.': 'An error occurred while downloading the backup.',
    'El campo de contacto no puede quedar vacío.': 'The contact field cannot be empty.',
    'Ingrese un nombre real (mínimo 3 letras, sin números).': 'Enter a valid name (at least 3 letters, no numbers).',
    'Ingrese un número de celular válido (mínimo 8 dígitos).': 'Enter a valid mobile number (at least 8 digits).',
    'Ingrese un correo electrónico válido.': 'Enter a valid email address.',
    'Ingrese un usuario/perfil válido (mínimo 3 caracteres).': 'Enter a valid username/profile (at least 3 characters).',
    'Teléfono extra inválido.': 'Invalid extra phone number.',
    'Correo extra inválido.': 'Invalid extra email address.',
    'Describe un asunto válido (mínimo 3 caracteres).': 'Enter a valid subject (at least 3 characters).',
    'Registro actualizado sin cambios. El seguimiento no fue modificado.': 'Record updated with no changes. Follow-up was not modified.',
    'Registro actualizado exitosamente.': 'Record updated successfully.',
    'Registro guardado exitosamente.': 'Record saved successfully.',
    'El registro ha sido eliminado correctamente.': 'The record was deleted successfully.',
    'Seguimiento actualizado. Registro marcado como revisado.': 'Follow-up updated. Record marked as reviewed.',
    'Configuración de seguimiento actualizada correctamente.': 'Follow-up settings updated successfully.',
    'Preferencia de visibilidad de canales actualizada.': 'Channel display preference updated.',
    'Datos de perfil guardados.': 'Profile data saved.',
    'El nombre es requerido.': 'Name is required.',
    'Caché borrada y Service Worker reiniciado. Recargando aplicación...': 'Cache cleared and Service Worker restarted. Reloading application...'
});

Object.assign(MEMORA_TRADUCCIONES.pt, {
    'MEMORA - Seguimiento Inteligente de Clientes': 'MEMORA - Acompanhamento Inteligente de Clientes',
    '¡Hola!': 'Olá!',
    'Estás probando la Versión Demo': 'Você está testando a Versão Demo',
    'Límite de prueba:': 'Limite de teste:',
    '/ 15 registros activos.': '/ 15 registros ativos.',
    'Obtener PRO ⚡': 'Obter PRO ⚡',
    'Info enviada': 'Info enviada',
    'Resp. interna': 'Resp. interna',
    'Seguimiento Inteligente ⚡': 'Acompanhamento Inteligente ⚡',
    'MEMORA administra automáticamente a los clientes inactivos según tus reglas.': 'O MEMORA gerencia automaticamente clientes inativos conforme suas regras.',
    'Ver Archivados': 'Ver Arquivados',
    'Ver Activos': 'Ver Ativos',
    'Exportar (.xlsx)': 'Exportar (.xlsx)',
    'Nuevo Registro': 'Novo Registro',
    'Nuevo Cliente': 'Novo Cliente',
    'Editar Cliente': 'Editar Cliente',
    'RUT (Empresa)': 'ID Fiscal (Empresa)',
    'Nº de Cliente / Socio': 'Nº de Cliente / Sócio',
    'Comentarios': 'Comentários',
    '+ Añadir': '+ Adicionar',
    'Completa tu Perfil': 'Complete seu Perfil',
    'Ingresa tus datos por única vez para personalizar tu cuenta y el saludo del sistema.': 'Insira seus dados uma única vez para personalizar sua conta e a saudação do sistema.',
    'Tu Nombre Completo (* Requerido)': 'Seu Nome Completo (* Obrigatório)',
    'Documento / C.I. / RUT': 'Documento / ID / Identificação Fiscal',
    'Guardar y Continuar': 'Salvar e Continuar',
    'Siguiente': 'Próximo',
    'Ingresar a Memora': 'Entrar no Memora',
    '¿Es seguro?': 'Tem certeza?',
    'Editar información': 'Editar informação',
    'Bienvenido a Memora': 'Bem-vindo ao Memora',
    'Memora te ayuda a organizar clientes, conversaciones y seguimientos para que no dependas de acordarte de todo.': 'O Memora ajuda você a organizar clientes, conversas e acompanhamentos para não depender de lembrar de tudo sozinho.',
    'Todo empieza con un registro': 'Tudo começa com um registro',
    'Guardá a cada cliente con su motivo de contacto, estado, comentarios y los canales por donde hablás con él: WhatsApp, Instagram, LinkedIn y más.': 'Salve cada cliente com o motivo do contato, status, comentários e os canais usados na conversa: WhatsApp, Instagram, LinkedIn e outros.',
    'Sabé a quién volver a contactar': 'Saiba com quem entrar em contato novamente',
    'Definí cuánto tiempo puede pasar sin actividad. Cuando un registro supera ese plazo, Memora lo muestra en Seguimiento Requerido.': 'Defina quanto tempo um registro pode ficar sem atividade. Quando esse prazo é ultrapassado, o Memora mostra o registro em Acompanhamento Necessário.',
    '¿Todo sigue igual? Marcá Revisado': 'Nada mudou? Marque como Revisado',
    'Si revisaste un caso y todavía no cambió nada, marcá Revisado. Memora registra la revisión y vuelve a programar el seguimiento sin modificar la información del cliente.': 'Se você revisou um caso e nada mudou, marque como Revisado. O Memora registra a revisão e agenda novamente o acompanhamento sem alterar as informações do cliente.',
    'Volvé a la conversación en un toque': 'Volte à conversa com um toque',
    'Usá los botones de cada canal para retomar el contacto directamente. En WhatsApp, Memora puede dejar preparado el mensaje para continuar la conversación.': 'Use os botões de cada canal para retomar o contato diretamente. No WhatsApp, o Memora pode deixar a mensagem preparada para continuar a conversa.',
    'Tus datos siguen siendo tuyos': 'Seus dados continuam sendo seus',
    'Podés respaldar tu información en Google Drive y exportar tus registros a Excel, PDF o JSON cuando lo necesites.': 'Você pode fazer backup das informações no Google Drive e exportar seus registros para Excel, PDF ou JSON quando precisar.',
    'Canal Extra': 'Canal Extra',
    'Contacto / Usuario': 'Contato / Usuário',
    'Quitar': 'Remover',
    'Prefijo de WhatsApp': 'Código do país do WhatsApp',
    'Ej: @usuario / mail / url': 'Ex.: @usuario / e-mail / URL',
    'Usuario Instagram (@)': 'Usuário do Instagram (@)',
    'Correo electrónico / Mail': 'Endereço de e-mail',
    'Perfil LinkedIn (URL o Nombre)': 'Perfil do LinkedIn (URL ou Nome)',
    'Usuario Facebook': 'Usuário do Facebook',
    'Ej: @usuario': 'Ex.: @usuario',
    'Ej: cliente@correo.com': 'Ex.: cliente@email.com',
    'Ej: linkedin.com/in/usuario': 'Ex.: linkedin.com/in/usuario',
    'Ej: nombre.usuario': 'Ex.: nome.usuario',
    'Ingrese contacto': 'Digite o contato',
    'Si no especificas, se usará su dato principal': 'Se ficar em branco, o contato principal será usado',
    'Escribe un comentario...': 'Escreva um comentário...',
    'Máximo 3 canales alcanzado': 'Máximo de 3 canais atingido',
    '¿Cómo empiezo?': 'Como começar?',
    'Creá un registro cuando aparezca un nuevo cliente o consulta.': 'Crie um registro quando surgir um novo cliente ou consulta.',
    'Guardá por dónde hablás con esa persona y el motivo del contacto.': 'Salve por onde você fala com essa pessoa e o motivo do contato.',
    'Elegí el estado que mejor represente en qué quedó la conversación.': 'Escolha o status que melhor representa em que ponto a conversa ficou.',
    'Agregá comentarios cuando haya novedades.': 'Adicione comentários quando houver novidades.',
    'Memora te mostrará cuándo un registro necesita seguimiento.': 'O Memora mostrará quando um registro precisar de acompanhamento.',
    '¿Qué es Seguimiento Requerido?': 'O que é Acompanhamento Necessário?',
    'Es la lista de clientes o gestiones que llevan más tiempo sin actividad del que configuraste. Podés definir ese plazo desde Perfil, en horas o días.': 'É a lista de clientes ou casos que estão sem atividade há mais tempo do que o configurado. Você pode definir esse prazo em Perfil, em horas ou dias.',
    '¿Para qué sirve Revisado?': 'Para que serve Revisado?',
    'Usalo cuando verificaste un registro pero no hay nada nuevo para modificar. Memora guarda la nueva revisión y vuelve a calcular cuándo debería aparecer en seguimiento.': 'Use quando você verificou um registro, mas não há nada novo para alterar. O Memora salva a nova revisão e recalcula quando ele deve aparecer novamente em acompanhamento.',
    '¿Cómo funcionan los canales?': 'Como funcionam os canais?',
    'Cada registro puede tener hasta 3 canales diferentes, por ejemplo WhatsApp, Instagram y LinkedIn. Desde la tarjeta podés abrir directamente el canal correspondiente para retomar la conversación.': 'Cada registro pode ter até 3 canais diferentes, como WhatsApp, Instagram e LinkedIn. Pelo cartão você pode abrir diretamente o canal correspondente para retomar a conversa.',
    '¿Qué pasa con mis datos?': 'O que acontece com meus dados?',
    'Podés realizar respaldos en tu Google Drive y exportar información cuando la necesites. La vista activa puede exportarse a Excel o PDF, y la base completa puede descargarse en JSON.': 'Você pode fazer backups no Google Drive e exportar informações quando precisar. A visualização ativa pode ser exportada para Excel ou PDF, e a base completa pode ser baixada em JSON.',
    'No hay registros para exportar en la vista o filtro actual.': 'Não há registros para exportar na visualização ou filtro atual.',
    'Exportación Excel': 'Exportação Excel',
    'Exportación PDF': 'Exportação PDF',
    'No se pudo generar el archivo Excel. Intenta nuevamente.': 'Não foi possível gerar o arquivo Excel. Tente novamente.',
    'No se pudo generar el PDF. Intenta nuevamente.': 'Não foi possível gerar o PDF. Tente novamente.',
    'Tipo Doc / ID': 'Tipo Doc / ID',
    'Doc / RUT / Nº Cliente': 'Documento / ID Fiscal / Nº Cliente',
    'Nombre del Cliente': 'Nome do Cliente',
    'Asunto / Motivo': 'Assunto / Motivo',
    'Teléfono / WhatsApp': 'Telefone / WhatsApp',
    'Usuario (@)': 'Usuário (@)',
    'Correo Electrónico': 'E-mail',
    'Canal 2': 'Canal 2',
    'Contacto 2': 'Contato 2',
    'Canal 3': 'Canal 3',
    'Contacto 3': 'Contato 3',
    'Estado Actual': 'Status Atual',
    'Último Comentario': 'Último Comentário',
    'Total Comentarios': 'Total de Comentários',
    'Fecha de Registro': 'Data do Registro',
    'Última Revisión': 'Última Revisão',
    'Sin comentarios': 'Sem comentários',
    'Sin registrar': 'Não informado',
    'Sin asunto': 'Sem assunto',
    'Contacto': 'Contato',
    'MEMORA - Reporte de clientes': 'MEMORA - Relatório de Clientes',
    'MEMORA - Reporte de Registros': 'MEMORA - Relatório de Registros',
    'Relaciones que avanzan': 'Relacionamentos que avançam',
    'Exportado el': 'Exportado em',
    'Vista / filtro': 'Visualização / filtro',
    'Vista activa': 'Visualização ativa',
    'Total': 'Total',
    'Emisión': 'Emissão',
    'Canal:': 'Canal:',
    'Asunto:': 'Assunto:',
    'Rev:': 'Revisão:',
    'Canales extra:': 'Canais extras:',
    'Nota:': 'Nota:',
    'Generado con Memora PRO el': 'Gerado com Memora PRO em',
    'Página': 'Página',
    'de': 'de',
    'Todos': 'Todos',
    'Revisar': 'Revisar',
    'Ver': 'Ver',
    'Editar': 'Editar',
    'Comentario del': 'Comentário de',
    'Sin comentarios.': 'Sem comentários.',
    'Creado:': 'Criado:',
    'Última rev:': 'Última revisão:',
    'Editado el': 'Editado em',
    'Dato Requerido': 'Campo Obrigatório',
    'Canales Duplicados': 'Canais Duplicados',
    'Configuración': 'Configurações',
    'Revisión': 'Revisão',
    'Restaurar Copia': 'Restaurar Backup',
    'Cuenta de Google Drive desconectada.': 'Conta do Google Drive desconectada.',
    'Cargando cliente de Google, reintenta un instante...': 'Carregando cliente do Google, tente novamente em instantes...',
    'Primero debes conectar tu cuenta de Google Drive.': 'Primeiro você deve conectar sua conta do Google Drive.',
    'Respaldo guardado correctamente en tu Google Drive.': 'Backup salvo corretamente no Google Drive.',
    'Primer respaldo creado con éxito en tu Google Drive.': 'Primeiro backup criado com sucesso no Google Drive.',
    'Error de conexión al guardar en Drive.': 'Erro de conexão ao salvar no Drive.',
    'No se encontró ningún archivo \'memora_backup.json\' en tu Drive.': 'Nenhum arquivo \'memora_backup.json\' foi encontrado no seu Drive.',
    'El archivo respaldado no tiene un formato válido.': 'O arquivo de backup não tem um formato válido.',
    'Ocurrió un error al intentar descargar el respaldo.': 'Ocorreu um erro ao tentar baixar o backup.',
    'El campo de contacto no puede quedar vacío.': 'O campo de contato não pode ficar vazio.',
    'Ingrese un nombre real (mínimo 3 letras, sin números).': 'Digite um nome válido (mínimo de 3 letras, sem números).',
    'Ingrese un número de celular válido (mínimo 8 dígitos).': 'Digite um número de celular válido (mínimo de 8 dígitos).',
    'Ingrese un correo electrónico válido.': 'Digite um endereço de e-mail válido.',
    'Ingrese un usuario/perfil válido (mínimo 3 caracteres).': 'Digite um usuário/perfil válido (mínimo de 3 caracteres).',
    'Teléfono extra inválido.': 'Telefone extra inválido.',
    'Correo extra inválido.': 'E-mail extra inválido.',
    'Describe un asunto válido (mínimo 3 caracteres).': 'Digite um assunto válido (mínimo de 3 caracteres).',
    'Registro actualizado sin cambios. El seguimiento no fue modificado.': 'Registro atualizado sem alterações. O acompanhamento não foi modificado.',
    'Registro actualizado exitosamente.': 'Registro atualizado com sucesso.',
    'Registro guardado exitosamente.': 'Registro salvo com sucesso.',
    'El registro ha sido eliminado correctamente.': 'O registro foi excluído com sucesso.',
    'Seguimiento actualizado. Registro marcado como revisado.': 'Acompanhamento atualizado. Registro marcado como revisado.',
    'Configuración de seguimiento actualizada correctamente.': 'Configuração de acompanhamento atualizada com sucesso.',
    'Preferencia de visibilidad de canales actualizada.': 'Preferência de visualização de canais atualizada.',
    'Datos de perfil guardados.': 'Dados do perfil salvos.',
    'El nombre es requerido.': 'O nome é obrigatório.',
    'Caché borrada y Service Worker reiniciado. Recargando aplicación...': 'Cache limpo e Service Worker reiniciado. Recarregando o aplicativo...'
});

const _traducirPatronesMemoraPreview1 = traducirPatronesMemora;
traducirPatronesMemora = function(texto) {
    let salida = _traducirPatronesMemoraPreview1(texto);
    if (idiomaMemora() === 'es') return salida;

    if (idiomaMemora() === 'en') {
        salida = salida.replace(/^Asunto:\s*/i, 'Subject: ');
        salida = salida.replace(/^Comentario del\s+/i, 'Comment from ');
        salida = salida.replace(/\(Editado el ([^)]+)\)/i, '(Edited on $1)');
        salida = salida.replace(/^Editando Registro:\s*/i, 'Editing Record: ');
        salida = salida.replace(/^Mostrando (\d+) de (\d+) registros/i, 'Showing $1 of $2 records');
        salida = salida.replace(/^(\d+) registros \(Archivados\)/i, '$1 records (Archived)');
        salida = salida.replace(/^(\d+) registros$/i, '$1 records');
        salida = salida.replace(/^⚠️ (\d+) hs de atraso/i, '⚠️ $1 hr overdue');
        salida = salida.replace(/^⚠️ (\d+) día\(s\) de atraso/i, '⚠️ $1 day(s) overdue');
        salida = salida.replace(/^⚠️ (\d+) día\(s\) y (\d+) hs de atraso/i, '⚠️ $1 day(s) and $2 hr overdue');
    } else if (idiomaMemora() === 'pt') {
        salida = salida.replace(/^Asunto:\s*/i, 'Assunto: ');
        salida = salida.replace(/^Comentario del\s+/i, 'Comentário de ');
        salida = salida.replace(/\(Editado el ([^)]+)\)/i, '(Editado em $1)');
        salida = salida.replace(/^Editando Registro:\s*/i, 'Editando Registro: ');
        salida = salida.replace(/^Mostrando (\d+) de (\d+) registros/i, 'Mostrando $1 de $2 registros');
        salida = salida.replace(/^(\d+) registros \(Archivados\)/i, '$1 registros (Arquivados)');
        salida = salida.replace(/^⚠️ (\d+) hs de atraso/i, '⚠️ $1 h de atraso');
        salida = salida.replace(/^⚠️ (\d+) día\(s\) de atraso/i, '⚠️ $1 dia(s) de atraso');
        salida = salida.replace(/^⚠️ (\d+) día\(s\) y (\d+) hs de atraso/i, '⚠️ $1 dia(s) e $2 h de atraso');
    }
    return salida;
};

function textoIdiomaMemora150(es, en, pt) {
    return idiomaMemora() === 'en' ? en : idiomaMemora() === 'pt' ? pt : es;
}

function traducirDatoSistemaMemora150(valor) {
    if (valor === null || valor === undefined) return valor;
    return traducirCadenaMemora(String(valor));
}

/* ---------- Exportación XLSX localizada ---------- */

construirFilasExportacionMemora = function(datosAExportar) {
    const h = idiomaMemora() === 'en'
        ? ['Doc / ID Type','Document / Tax ID / Customer No.','Customer Name','Subject / Reason','Primary Channel','Phone / WhatsApp','Username (@)','Email Address','Channel 2','Contact 2','Channel 3','Contact 3','Current Status','Latest Comment','Total Comments','Record Date','Last Review']
        : idiomaMemora() === 'pt'
            ? ['Tipo Doc / ID','Documento / ID Fiscal / Nº Cliente','Nome do Cliente','Assunto / Motivo','Canal Principal','Telefone / WhatsApp','Usuário (@)','E-mail','Canal 2','Contato 2','Canal 3','Contato 3','Status Atual','Último Comentário','Total de Comentários','Data do Registro','Última Revisão']
            : ['Tipo Doc / ID','Doc / RUT / Nº Cliente','Nombre del Cliente','Asunto / Motivo','Canal Principal','Teléfono / WhatsApp','Usuario (@)','Correo Electrónico','Canal 2','Contacto 2','Canal 3','Contacto 3','Estado Actual','Último Comentario','Total Comentarios','Fecha de Registro','Última Revisión'];

    const filas = [h];
    datosAExportar.forEach(r => {
        const comentariosActivos = (r.comentarios || []).filter(c => !c.eliminado);
        const ultimoCom = comentariosActivos.length
            ? String(comentariosActivos[comentariosActivos.length - 1].texto || '').replace(/[\r\n]+/g, ' ')
            : textoIdiomaMemora150('Sin comentarios','No comments','Sem comentários');
        const d = new Date(r.fecha);
        const dRev = new Date(obtenerUltimaRevisionEfectiva(r));
        const fechaCreacionTexto = isNaN(d.getTime()) ? (r.fecha || '-') : fechaHoraTextoFormateada(d);
        const fechaRevTexto = isNaN(dRev.getTime()) ? '-' : fechaHoraTextoFormateada(dRev);
        const clasif = clasificarContactoExportacion(r.canal, r.contacto);

        filas.push([
            traducirDatoSistemaMemora150(r.tipoIdentificador || 'Ninguno'),
            r.identificador || 'N/A',
            r.nombre || textoIdiomaMemora150('Sin registrar','Not provided','Não informado'),
            r.asunto || textoIdiomaMemora150('Sin asunto','No subject','Sem assunto'),
            r.canal || textoIdiomaMemora150('Contacto','Contact','Contato'),
            clasif.telefono, clasif.usuario, clasif.email,
            r.canal2 || '-', r.contacto2 || '-', r.canal3 || '-', r.contacto3 || '-',
            traducirDatoSistemaMemora150(r.estado || 'Consulta nueva'),
            ultimoCom, comentariosActivos.length, fechaCreacionTexto, fechaRevTexto
        ]);
    });
    return filas;
};

construirHojaXLSXMemora = function(datosAExportar, filtro, fechaExportacion = ahoraMemora()) {
    const filasDatos = construirFilasExportacionMemora(datosAExportar);
    const encabezados = filasDatos[0];
    const registros = filasDatos.slice(1);
    const totalColumnas = encabezados.length;
    const ultimaColumna = columnaExcelXLSX(totalColumnas - 1);
    const anchos = [16,20,24,24,18,20,16,25,17,20,17,20,18,34,16,20,20];
    const columnasXML = anchos.slice(0,totalColumnas).map((ancho,i)=>`<col min="${i+1}" max="${i+1}" width="${ancho}" customWidth="1"/>`).join('');
    const filasXML = [];
    filasXML.push(`<row r="1" ht="27" customHeight="1">${celdaTextoXLSX('A1', textoIdiomaMemora150('MEMORA - Reporte de clientes','MEMORA - Customer Report','MEMORA - Relatório de Clientes'), 1)}</row>`);
    filasXML.push(`<row r="2" ht="20" customHeight="1">${celdaTextoXLSX('A2', textoIdiomaMemora150('Relaciones que avanzan','Relationships that move forward','Relacionamentos que avançam'), 2)}</row>`);
    filasXML.push(`<row r="3" ht="8" customHeight="1"></row>`);
    filasXML.push(`<row r="4" ht="22" customHeight="1">`+
        celdaTextoXLSX('A4', textoIdiomaMemora150('Exportado el','Exported on','Exportado em'),3)+
        celdaTextoXLSX('B4', fechaHoraTextoFormateada(fechaExportacion),4)+
        celdaTextoXLSX('E4', textoIdiomaMemora150('Vista / filtro','View / filter','Visualização / filtro'),3)+
        celdaTextoXLSX('F4', traducirDatoSistemaMemora150(filtro),4)+
        celdaTextoXLSX('I4','Total',3)+celdaNumeroXLSX('J4',datosAExportar.length,4)+`</row>`);
    filasXML.push(`<row r="5" ht="8" customHeight="1"></row>`);
    filasXML.push(`<row r="6" ht="36" customHeight="1">${encabezados.map((t,i)=>celdaTextoXLSX(`${columnaExcelXLSX(i)}6`,t,5)).join('')}</row>`);
    registros.forEach((fila,idx)=>{
        const numeroFila=7+idx;
        const celdas=fila.map((valor,colIdx)=>{
            const ref=`${columnaExcelXLSX(colIdx)}${numeroFila}`;
            if(colIdx===14 && String(valor).trim()!=='-' && valor!=='') return celdaNumeroXLSX(ref,valor,7);
            return celdaTextoXLSX(ref,valor,colIdx===14?7:6);
        }).join('');
        filasXML.push(`<row r="${numeroFila}" customFormat="1">${celdas}</row>`);
    });
    if(!registros.length) filasXML.push(`<row r="7">${celdaTextoXLSX('A7',textoIdiomaMemora150('No hay registros para exportar en la vista actual.','There are no records to export in the current view.','Não há registros para exportar na visualização atual.'),6)}</row>`);
    const ultimaFilaDatos=registros.length?6+registros.length:7;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${ultimaColumna}${ultimaFilaDatos}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A7" sqref="A7"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${columnasXML}</cols><sheetData>${filasXML.join('')}</sheetData><mergeCells count="4"><mergeCell ref="A1:${ultimaColumna}1"/><mergeCell ref="A2:${ultimaColumna}2"/><mergeCell ref="B4:D4"/><mergeCell ref="F4:H4"/></mergeCells><autoFilter ref="A6:${ultimaColumna}${ultimaFilaDatos}"/><pageMargins left="0.35" right="0.35" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
};

construirXLSXMemora = function(datosAExportar, filtro, fechaExportacion = ahoraMemora()) {
    const nombreHoja = textoIdiomaMemora150('Registros','Records','Registros');
    const archivos = {
        '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
        '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escaparXMLMemora(nombreHoja)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
        'xl/styles.xml': construirEstilosXLSXMemora(),
        'xl/worksheets/sheet1.xml': construirHojaXLSXMemora(datosAExportar,filtro,fechaExportacion)
    };
    return crearZipXLSXMemora(archivos,fechaExportacion);
};

exportarExcelFiltrado = function() {
    const datosAExportar=registrosUltimoFiltro;
    if(!datosAExportar || datosAExportar.length===0){
        mostrarAvisoMemora(textoIdiomaMemora150('No hay registros para exportar en la vista o filtro actual.','There are no records to export in the current view or filter.','Não há registros para exportar na visualização ou filtro atual.'),textoIdiomaMemora150('Exportación Excel','Excel Export','Exportação Excel'),'warning'); return;
    }
    try{
        const fechaExportacion=ahoraMemora(); const filtro=obtenerEtiquetaFiltroExportacion();
        const base=textoIdiomaMemora150('Reporte_Clientes','Customer_Report','Relatorio_Clientes');
        const nombreArchivo=`MEMORA_${base}_${nombreFiltroSeguroMemora(filtro)}_${selloArchivoMemora(fechaExportacion)}.xlsx`;
        const excelBytes=construirXLSXMemora(datosAExportar,filtro,fechaExportacion);
        descargarBlob(new Blob([excelBytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),nombreArchivo);
    }catch(error){console.error('MEMORA XLSX:',error); mostrarAvisoMemora(textoIdiomaMemora150('No se pudo generar el archivo Excel. Intenta nuevamente.','The Excel file could not be generated. Please try again.','Não foi possível gerar o arquivo Excel. Tente novamente.'),textoIdiomaMemora150('Exportación Excel','Excel Export','Exportação Excel'),'error');}
};
exportarCSVFiltrado = function(){ return exportarExcelFiltrado(); };

/* ---------- PDF localizado ---------- */

resumirRegistroPDFMemora = function(r, indice) {
    const nombre=(r.nombre||'').trim()||(r.contacto||'').trim()||`${textoIdiomaMemora150('Registro','Record','Registro')} ${indice+1}`;
    const estado=traducirDatoSistemaMemora150((r.estado||'Consulta nueva').trim());
    const fechaRevision=new Date(obtenerUltimaRevisionEfectiva(r));
    const fechaRevisionTexto=isNaN(fechaRevision.getTime())?'-':fechaHoraTextoFormateada(fechaRevision);
    const canalPrincipal=`${r.canal||textoIdiomaMemora150('Contacto','Contact','Contato')} (${r.contacto||'-'})`;
    const asunto=r.asunto||textoIdiomaMemora150('Sin asunto','No subject','Sem assunto');
    const comentarios=(r.comentarios||[]).filter(c=>!c.eliminado);
    const ultimoComentario=comentarios.length?truncarTextoPDFMemora(comentarios[comentarios.length-1].texto||'',260):textoIdiomaMemora150('Sin comentarios','No comments','Sem comentários');
    const extras=[]; if(r.canal2&&r.contacto2) extras.push(`${r.canal2} (${r.contacto2})`); if(r.canal3&&r.contacto3) extras.push(`${r.canal3} (${r.contacto3})`);
    const identificador=r.identificador?`${traducirDatoSistemaMemora150(r.tipoIdentificador||'ID')}: ${r.identificador}`:'';
    const resumen=textoIdiomaMemora150(`Canal: ${canalPrincipal} | Asunto: ${asunto} | Rev: ${fechaRevisionTexto}`,`Channel: ${canalPrincipal} | Subject: ${asunto} | Review: ${fechaRevisionTexto}`,`Canal: ${canalPrincipal} | Assunto: ${asunto} | Revisão: ${fechaRevisionTexto}`);
    return {nombre,estado,resumen,extras:extras.length?`${textoIdiomaMemora150('Canales extra','Extra channels','Canais extras')}: ${extras.join(' | ')}`:'',identificador,nota:`${textoIdiomaMemora150('Nota','Note','Nota')}: ${ultimoComentario}`};
};

construirPDFMemora = function(datosAExportar, filtro, fechaExportacion = ahoraMemora()) {
    const ancho=595.28, alto=841.89, margenX=46, margenInferior=70, anchoUtil=ancho-margenX*2;
    const paginas=[]; let comandos='', y=0;
    const dibujarEncabezado=()=>{
        comandos+=comandoTextoPDFMemora(margenX,764,textoIdiomaMemora150('MEMORA - Reporte de Registros','MEMORA - Records Report','MEMORA - Relatório de Registros'),16,true,'0 0.31 0.53');
        comandos+=comandoTextoPDFMemora(margenX,748,textoIdiomaMemora150('Relaciones que avanzan','Relationships that move forward','Relacionamentos que avançam'),9.5,false,'0.35 0.39 0.45');
        const totalTxt=idiomaMemora()==='en'?`Total: ${datosAExportar.length} ${datosAExportar.length===1?'record':'records'}`:idiomaMemora()==='pt'?`Total: ${datosAExportar.length} ${datosAExportar.length===1?'registro':'registros'}`:`Total: ${datosAExportar.length} registro${datosAExportar.length===1?'':'s'}`;
        comandos+=comandoTextoPDFMemora(455,764,totalTxt,9,false,'0.2 0.23 0.27');
        comandos+=comandoTextoPDFMemora(426,748,`${textoIdiomaMemora150('Emisión','Issued','Emissão')}: ${fechaHoraTextoFormateada(fechaExportacion)}`,9,false,'0.2 0.23 0.27');
        comandos+=comandoLineaPDFMemora(margenX,736,ancho-margenX,736,'0 0.31 0.53',1);
        comandos+=comandoTextoPDFMemora(margenX,722,`${textoIdiomaMemora150('Vista activa','Active view','Visualização ativa')}: ${traducirDatoSistemaMemora150(filtro)}`,8.5,false,'0.45 0.5 0.56'); y=704;
    };
    const nuevaPagina=()=>{if(comandos) paginas.push(comandos); comandos=''; dibujarEncabezado();};
    const calcularAlturaBloque=(rr)=>{const lr=envolverTextoPDFMemora(rr.resumen,78), le=rr.extras?envolverTextoPDFMemora(rr.extras,78):[], li=rr.identificador?envolverTextoPDFMemora(rr.identificador,78):[], ln=envolverTextoPDFMemora(rr.nota,86); return {lineasResumen:lr,lineasExtras:le,lineasId:li,lineasNota:ln,alto:34+(lr.length+le.length+li.length+ln.length)*12+14};};
    const renderizarBloque=(rr,b)=>{const boxHeight=b.alto, boxBottom=y-boxHeight; comandos+=comandoRectPDFMemora(margenX,boxBottom,anchoUtil,boxHeight,'0.995 0.996 0.998','0.86 0.89 0.93',0.9); let lineaY=y-18; comandos+=comandoTextoPDFMemora(margenX+9,lineaY,rr.nombre,11.5,true,'0 0.31 0.53'); const anchoEstado=estimarAnchoTextoPDFMemora(rr.estado,8.5,false); comandos+=comandoTextoPDFMemora(ancho-margenX-10-anchoEstado,lineaY,rr.estado,8.5,false,'0.2 0.23 0.27'); lineaY-=18; b.lineasResumen.forEach(l=>{comandos+=comandoTextoPDFMemora(margenX+9,lineaY,l,8.7,false,'0.26 0.29 0.34');lineaY-=12;}); b.lineasExtras.forEach(l=>{comandos+=comandoTextoPDFMemora(margenX+9,lineaY,l,8.3,false,'0.32 0.36 0.41');lineaY-=11;}); b.lineasId.forEach(l=>{comandos+=comandoTextoPDFMemora(margenX+9,lineaY,l,8.3,false,'0.32 0.36 0.41');lineaY-=11;}); b.lineasNota.forEach(l=>{comandos+=comandoTextoPDFMemora(margenX+9,lineaY,l,8.2,false,'0.38 0.43 0.5');lineaY-=11;}); y=boxBottom-14;};
    nuevaPagina();
    if(!datosAExportar.length){comandos+=comandoTextoPDFMemora(margenX,y,textoIdiomaMemora150('No hay registros para exportar en la vista actual.','There are no records to export in the current view.','Não há registros para exportar na visualização atual.'),10,false,'0.38 0.43 0.5'); y-=18;}
    datosAExportar.forEach((r,index)=>{const resumen=resumirRegistroPDFMemora(r,index), bloque=calcularAlturaBloque(resumen); if(y-bloque.alto<margenInferior)nuevaPagina(); renderizarBloque(resumen,bloque);});
    if(comandos)paginas.push(comandos);
    const totalPaginas=paginas.length;
    paginas.forEach((contenido,idx)=>{let footer=''; footer+=comandoLineaPDFMemora(margenX,54,ancho-margenX,54,'0.86 0.89 0.93',0.8); footer+=comandoTextoPDFMemora(margenX,39,`${textoIdiomaMemora150('Generado con Memora PRO el','Generated with Memora PRO on','Gerado com Memora PRO em')} ${fechaHoraTextoFormateada(fechaExportacion)}${idiomaMemora()==='es'?' hs.':'.'}`,7.6,false,'0.43 0.47 0.53'); footer+=comandoTextoPDFMemora(480,39,`${textoIdiomaMemora150('Página','Page','Página')} ${idx+1} ${textoIdiomaMemora150('de','of','de')} ${totalPaginas}`,7.6,false,'0.43 0.47 0.53'); paginas[idx]=contenido+footer;});
    const objetos=[],pageObjNums=[],contentObjNums=[],firstPageObj=5; paginas.forEach((_,i)=>{pageObjNums.push(firstPageObj+i*2);contentObjNums.push(firstPageObj+i*2+1);});
    objetos[1]='<< /Type /Catalog /Pages 2 0 R >>'; objetos[2]=`<< /Type /Pages /Count ${paginas.length} /Kids [${pageObjNums.map(n=>`${n} 0 R`).join(' ')}] >>`; objetos[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'; objetos[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    paginas.forEach((stream,i)=>{const pageNum=pageObjNums[i],contentNum=contentObjNums[i]; objetos[pageNum]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ancho} ${alto}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`; objetos[contentNum]=`<< /Length ${stream.length} >>\nstream\n${stream}endstream`;});
    let pdf='%PDF-1.4\n%MEMORA\n'; const offsets=[0],maxObj=objetos.length-1; for(let i=1;i<=maxObj;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objetos[i]}\nendobj\n`;}
    const xrefOffset=pdf.length; pdf+=`xref\n0 ${maxObj+1}\n`; pdf+='0000000000 65535 f \n'; for(let i=1;i<=maxObj;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`; pdf+=`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`; return new TextEncoder().encode(pdf);
};

exportarPDFFiltrado = function(){
    const datosAExportar=registrosUltimoFiltro;
    if(!datosAExportar || datosAExportar.length===0){mostrarAvisoMemora(textoIdiomaMemora150('No hay registros para exportar en la vista o filtro actual.','There are no records to export in the current view or filter.','Não há registros para exportar na visualização ou filtro atual.'),textoIdiomaMemora150('Exportación PDF','PDF Export','Exportação PDF'),'warning');return;}
    try{const fechaExportacion=ahoraMemora(),filtro=obtenerEtiquetaFiltroExportacion(),pdfBytes=construirPDFMemora(datosAExportar,filtro,fechaExportacion),base=textoIdiomaMemora150('Reporte_Clientes','Customer_Report','Relatorio_Clientes'),nombreArchivo=`MEMORA_${base}_${nombreFiltroSeguroMemora(filtro)}_${selloArchivoMemora(fechaExportacion)}.pdf`; descargarBlob(new Blob([pdfBytes],{type:'application/pdf'}),nombreArchivo);}catch(error){console.error('MEMORA PDF:',error);mostrarAvisoMemora(textoIdiomaMemora150('No se pudo generar el PDF. Intenta nuevamente.','The PDF could not be generated. Please try again.','Não foi possível gerar o PDF. Tente novamente.'),textoIdiomaMemora150('Exportación PDF','PDF Export','Exportação PDF'),'error');}
};

/* ---------- Hard Reset: frase de confirmacion localizada ---------- */
solicitarHardResetMemora = function(){
    const lang=idiomaMemora();
    const titulo=textoIdiomaMemora150('Restablecer Memora','Reset Memora','Redefinir Memora');
    const frase=lang==='en'?'DELETE MEMORA':lang==='pt'?'APAGAR MEMORA':'BORRAR MEMORA';
    const texto=lang==='en'?`This will permanently delete all Memora data stored on this device. Type ${frase} to continue.`:lang==='pt'?`Isto apagará permanentemente todos os dados do Memora armazenados neste dispositivo. Digite ${frase} para continuar.`:`Esto eliminará permanentemente todos los datos de Memora guardados en este dispositivo. Escribí ${frase} para continuar.`;
    mostrarPromptMemora(texto,'',titulo,valor=>{if(valor===null)return;if(String(valor).trim().toUpperCase()!==frase){mostrarAvisoMemora(lang==='en'?'The confirmation text does not match. No data was deleted.':lang==='pt'?'O texto de confirmação não coincide. Nenhum dado foi apagado.':'El texto de confirmación no coincide. No se eliminó ningún dato.',titulo,'warning');return;} mostrarConfirmMemora(lang==='en'?'Last confirmation: delete all local Memora data and restart from zero?':lang==='pt'?'Última confirmação: apagar todos os dados locais do Memora e recomeçar do zero?':'Última confirmación: ¿borrar todos los datos locales de Memora y comenzar desde cero?',titulo,'warning','#DC2626',confirmado=>{if(confirmado)ejecutarHardResetMemora();});});
};

// Si el usuario cambia el idioma con una story abierta, la regeneramos para evitar texto residual.
const _guardarIdiomaMemoraPreview1 = guardarIdiomaMemora;
guardarIdiomaMemora = function(){
    _guardarIdiomaMemoraPreview1();
    if ($('modalStoriesMemora') && $('modalStoriesMemora').style.display !== 'none') {
        const datosRaw=localStorage.getItem('memora_admin_user_data');
        const datos=datosRaw?JSON.parse(datosRaw):{nombreAdmin:textoIdiomaMemora150('Usuario','User','Usuário')};
        renderStoryStep(datos.nombreAdmin);
        procesarArbolIdiomaMemora($('modalStoriesMemora'));
    }
};


/* ---------- Cobertura adicional de textos dinamicos, avisos y placeholders ---------- */
Object.assign(MEMORA_TRADUCCIONES.en, {
    'Seguimiento Requerido (': 'Follow-up Required (',
    'Seguimiento': 'Follow-up',
    'Ficha Cliente': 'Customer Record',
    'Límite Demo Alcanzado ⚡': 'Demo Limit Reached ⚡',
    'Función PRO 🔒': 'PRO Feature 🔒',
    '¿Deseas desconectar la cuenta de Google Drive?': 'Do you want to disconnect the Google Drive account?',
    'El respaldo en la nube es una función exclusiva de MEMORA PRO.': 'Cloud backup is a MEMORA PRO exclusive feature.',
    'La restauración desde la nube es una función exclusiva de MEMORA PRO.': 'Cloud restore is a MEMORA PRO exclusive feature.',
    'El auto-guardado en la nube es una función exclusiva de MEMORA PRO.': 'Cloud auto-save is a MEMORA PRO exclusive feature.',
    'Debes ingresar un nombre para guardar tus datos y continuar.': 'You must enter a name to save your data and continue.',
    'Sin nombre': 'No name',
    'Sin contacto': 'No contact',
    'Sin asunto registrado': 'No subject recorded',
    'Cliente': 'Customer',
    'Contacto Sin Nombre': 'Unnamed Contact',
    'información general': 'general information',
    'Consulta MEMORA': 'MEMORA Inquiry',
    'No se encontraron registros.': 'No records were found.',
    'Modifica el contenido del comentario:': 'Edit the comment content:',
    'Editar Comentario': 'Edit Comment',
    '¿Deseas quitar este comentario?': 'Do you want to remove this comment?',
    'Eliminar Nota': 'Delete Note',
    '¿Es seguro de eliminar este registro permanentemente?': 'Are you sure you want to permanently delete this record?',
    'Eliminar Cliente': 'Delete Customer',
    'Caché PWA': 'PWA Cache',
    'Ingrese un usuario válido (mínimo 3 caracteres).': 'Enter a valid username (at least 3 characters).',
    'Buscar por nombre, teléfono, asunto, RUT...': 'Search by name, phone, subject, tax ID...',
    'Filtrar por nombre': 'Filter by name',
    'Filtrar por contacto': 'Filter by contact',
    'Filtrar por asunto': 'Filter by subject',
    'Filtrar por RUT / Nº Cliente': 'Filter by Tax ID / Customer No.',
    'Filtrar en comentarios': 'Filter comments',
    'Ej: Juan': 'E.g.: John',
    'Ej: Juan González': 'E.g.: John Smith',
    'Ej: Los tres locos': 'E.g.: Example Company',
    'Ej: Usuario Administrador': 'E.g.: Administrator User',
    'Ej: 48907555': 'E.g.: 48907555',
    'Ej: 099 777 777': 'E.g.: 099 777 777',
    'Ej: Venta sillas gamer, Información de viaje, etc.': 'E.g.: Gaming chair sale, travel information, etc.',
    'El respaldo automático en la nube (Google Drive) es una función exclusiva de MEMORA PRO.\n\nObtén la versión completa para sincronizar tus datos.': 'Automatic cloud backup (Google Drive) is a MEMORA PRO exclusive feature.\n\nGet the full version to sync your data.',
    '¡Google Drive vinculado con éxito!': 'Google Drive linked successfully!',
    '¿Es seguro de reemplazar tus registros locales con la copia respaldada en Drive?': 'Are you sure you want to replace your local records with the Drive backup?',
    'No hay registros para exportar en la vista actual.': 'There are no records to export in the current view.',
    'Seleccione un estado': 'Select a status'
});
Object.assign(MEMORA_TRADUCCIONES.pt, {
    'Seguimiento Requerido (': 'Acompanhamento Necessário (',
    'Seguimiento': 'Acompanhamento',
    'Ficha Cliente': 'Ficha do Cliente',
    'Límite Demo Alcanzado ⚡': 'Limite da Demo Atingido ⚡',
    'Función PRO 🔒': 'Recurso PRO 🔒',
    '¿Deseas desconectar la cuenta de Google Drive?': 'Deseja desconectar a conta do Google Drive?',
    'El respaldo en la nube es una función exclusiva de MEMORA PRO.': 'O backup na nuvem é um recurso exclusivo do MEMORA PRO.',
    'La restauración desde la nube es una función exclusiva de MEMORA PRO.': 'A restauração da nuvem é um recurso exclusivo do MEMORA PRO.',
    'El auto-guardado en la nube es una función exclusiva de MEMORA PRO.': 'O salvamento automático na nuvem é um recurso exclusivo do MEMORA PRO.',
    'Debes ingresar un nombre para guardar tus datos y continuar.': 'Você deve inserir um nome para salvar seus dados e continuar.',
    'Sin nombre': 'Sem nome',
    'Sin contacto': 'Sem contato',
    'Sin asunto registrado': 'Sem assunto registrado',
    'Cliente': 'Cliente',
    'Contacto Sin Nombre': 'Contato sem Nome',
    'información general': 'informações gerais',
    'Consulta MEMORA': 'Consulta MEMORA',
    'No se encontraron registros.': 'Nenhum registro foi encontrado.',
    'Modifica el contenido del comentario:': 'Edite o conteúdo do comentário:',
    'Editar Comentario': 'Editar Comentário',
    '¿Deseas quitar este comentario?': 'Deseja remover este comentário?',
    'Eliminar Nota': 'Excluir Nota',
    '¿Es seguro de eliminar este registro permanentemente?': 'Tem certeza de que deseja excluir este registro permanentemente?',
    'Eliminar Cliente': 'Excluir Cliente',
    'Caché PWA': 'Cache PWA',
    'Ingrese un usuario válido (mínimo 3 caracteres).': 'Digite um usuário válido (mínimo de 3 caracteres).',
    'Buscar por nombre, teléfono, asunto, RUT...': 'Pesquisar por nome, telefone, assunto, ID fiscal...',
    'Filtrar por nombre': 'Filtrar por nome',
    'Filtrar por contacto': 'Filtrar por contato',
    'Filtrar por asunto': 'Filtrar por assunto',
    'Filtrar por RUT / Nº Cliente': 'Filtrar por ID Fiscal / Nº Cliente',
    'Filtrar en comentarios': 'Filtrar nos comentários',
    'Ej: Juan': 'Ex.: João',
    'Ej: Juan González': 'Ex.: João Silva',
    'Ej: Los tres locos': 'Ex.: Empresa Exemplo',
    'Ej: Usuario Administrador': 'Ex.: Usuário Administrador',
    'Ej: 48907555': 'Ex.: 48907555',
    'Ej: 099 777 777': 'Ex.: 099 777 777',
    'Ej: Venta sillas gamer, Información de viaje, etc.': 'Ex.: Venda de cadeira gamer, informações de viagem, etc.',
    'El respaldo automático en la nube (Google Drive) es una función exclusiva de MEMORA PRO.\n\nObtén la versión completa para sincronizar tus datos.': 'O backup automático na nuvem (Google Drive) é um recurso exclusivo do MEMORA PRO.\n\nObtenha a versão completa para sincronizar seus dados.',
    '¡Google Drive vinculado con éxito!': 'Google Drive vinculado com sucesso!',
    '¿Es seguro de reemplazar tus registros locales con la copia respaldada en Drive?': 'Tem certeza de que deseja substituir seus registros locais pelo backup do Drive?',
    'No hay registros para exportar en la vista actual.': 'Não há registros para exportar na visualização atual.',
    'Seleccione un estado': 'Selecione um status'
});

const _mostrarAvisoMemoraI18n = mostrarAvisoMemora;
mostrarAvisoMemora = function(mensaje, titulo = 'MEMORA', icono = 'check_circle', callback = null) {
    return _mostrarAvisoMemoraI18n(traducirCadenaMemora(String(mensaje ?? '')), traducirCadenaMemora(String(titulo ?? 'MEMORA')), icono, callback);
};
const _mostrarConfirmMemoraI18n = mostrarConfirmMemora;
mostrarConfirmMemora = function(mensaje, titulo = '¿Es seguro?', icono = 'help_outline', colorBoton = '#DC2626', callback = null) {
    return _mostrarConfirmMemoraI18n(traducirCadenaMemora(String(mensaje ?? '')), traducirCadenaMemora(String(titulo ?? '')), icono, colorBoton, callback);
};
const _mostrarPromptMemoraI18n = mostrarPromptMemora;
mostrarPromptMemora = function(mensaje, valorInicial = '', titulo = 'Editar información', callback = null) {
    return _mostrarPromptMemoraI18n(traducirCadenaMemora(String(mensaje ?? '')), valorInicial, traducirCadenaMemora(String(titulo ?? '')), callback);
};
const _mostrarToastPCI18n = mostrarToastPC;
mostrarToastPC = function(mensaje, icono = 'edit') {
    return _mostrarToastPCI18n(traducirCadenaMemora(String(mensaje ?? '')), icono);
};

const _traducirPatronesMemoraPreview2 = traducirPatronesMemora;
traducirPatronesMemora = function(texto) {
    let salida = _traducirPatronesMemoraPreview2(texto);
    if (idiomaMemora() === 'es') return salida;
    if (idiomaMemora() === 'en') {
        salida = salida.replace(/^Has alcanzado el límite de (\d+) registros activos de la versión Demo\.\s*Te redirigiremos a la web para adquirir MEMORA PRO sin límites\.$/s, 'You have reached the limit of $1 active records in the Demo version. You will be redirected to the website to get MEMORA PRO without limits.');
        salida = salida.replace(/^¡Restauración exitosa! Se recuperaron (\d+) registros\.$/, 'Restore successful! $1 records were recovered.');
        salida = salida.replace(/^No puedes repetir el mismo canal \((.+)\) más de una vez por cliente\.$/, 'You cannot use the same channel ($1) more than once per customer.');
        salida = salida.replace(/^Datos cargados en Inicio\. Ve a Inicio para modificar\.$/, 'Data loaded on Home. Go to Home to edit it.');
        salida = salida.replace(/^Ingrese\s+(.+)$/i, 'Enter $1');
    } else if (idiomaMemora() === 'pt') {
        salida = salida.replace(/^Has alcanzado el límite de (\d+) registros activos de la versión Demo\.\s*Te redirigiremos a la web para adquirir MEMORA PRO sin límites\.$/s, 'Você atingiu o limite de $1 registros ativos da versão Demo. Você será redirecionado ao site para obter o MEMORA PRO sem limites.');
        salida = salida.replace(/^¡Restauración exitosa! Se recuperaron (\d+) registros\.$/, 'Restauração concluída! $1 registros foram recuperados.');
        salida = salida.replace(/^No puedes repetir el mismo canal \((.+)\) más de una vez por cliente\.$/, 'Você não pode usar o mesmo canal ($1) mais de uma vez por cliente.');
        salida = salida.replace(/^Datos cargados en Inicio\. Ve a Inicio para modificar\.$/, 'Dados carregados na tela Início. Vá para Início para editá-los.');
        salida = salida.replace(/^Ingrese\s+(.+)$/i, 'Digite $1');
    }
    return salida;
};
