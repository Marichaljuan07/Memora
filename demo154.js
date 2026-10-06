/* 1.5.2: paquete oficial y almacenamiento independiente para Demo. */
const Memora154 = (() => {
    const native = window.localStorage;
    const prefix = 'memora154_demo__';
    const mode = window.location.hostname.includes('demo') ? 'demo' : 'pro'; // Criterio original de la 1.5.1.
    const isDemo = mode === 'demo';
    const limits = Object.freeze({records: 15, pdf: 3, xlsx: 3, mensajes: 5, resumenes: 3});
    const demoKeys = () => Object.keys(native).filter(key => key.startsWith(prefix));
    const storage = isDemo ? new Proxy({}, {
        get(_, key) {
            if (key === 'getItem') return name => native.getItem(prefix + name);
            if (key === 'setItem') return (name, value) => native.setItem(prefix + name, value);
            if (key === 'removeItem') return name => native.removeItem(prefix + name);
            if (key === 'clear') return () => demoKeys().forEach(name => native.removeItem(name));
            if (key === 'key') return index => demoKeys()[index]?.slice(prefix.length) ?? null;
            if (key === 'length') return demoKeys().length;
            if (typeof key === 'string') return native.getItem(prefix + key);
        },
        ownKeys: () => demoKeys().map(key => key.slice(prefix.length)),
        getOwnPropertyDescriptor: () => ({enumerable: true, configurable: true})
    }) : native;

    function seedDemo() {
        const now = Date.now(), hour = 3600000;
        const iso = hours => new Date(now - hours * hour).toISOString();
        const example = (id, name, subject, state, hours, priority = 'Normal', rule = null) => ({
            id, nombre: name, asunto: subject, canal: 'Email', contacto: `ejemplo${id}@memora.invalid`,
            estado: state, prioridad: priority, seguimientoPropio: rule,
            tipoIdentificador: 'Nº de Cliente', identificador: String(id - 15400),
            fecha: iso(hours + 24), ultimaModificacion: iso(hours), ultimaRevision: iso(hours),
            comentarios: [{texto: 'Registro ficticio para explorar Memora. Podés editarlo y marcarlo Revisado.', fecha: new Date(now - hours * hour).toLocaleString('es-UY')}],
            ejemploDemo154: true
        });
        const records = [
            example(15401, 'Ana Ejemplo', 'Consulta de disponibilidad', 'Consulta nueva', 120),
            example(15402, 'Bruno Ejemplo', 'Presupuesto en preparación', 'Esperando respuesta interna', 1, 'Alta', {valor: 3, unidad: 'horas'}),
            example(15403, 'Carla Ejemplo', 'Control periódico de una gestión', 'Información enviada', 14, 'Urgente', {valor: 12, unidad: 'horas', modalidad: 'periodica'}),
            example(15404, 'Diego Ejemplo', 'Respuesta pendiente del cliente', 'Esperando cliente', 60, 'Normal', {valor: 2, unidad: 'dias'}),
            example(15405, 'Elena Ejemplo', 'Gestión finalizada', 'Cerrado', 24)
        ];
        records[1].canal2 = 'Instagram'; records[1].contacto2 = '@memora_ejemplo_ficticio';
        records[2].inicioRevisionPeriodica = iso(14);
        records[2].ultimaModificacion = iso(0.25); // La actividad no reinicia la revisión periódica.
        storage.setItem('memora_registros', JSON.stringify(records));
        storage.setItem('memora_seg_valor', '3'); storage.setItem('memora_seg_unidad', 'dias');
        storage.setItem('memora151_biblioteca_v1', JSON.stringify({version: 1, mensajes: [
            {id: 'demo_mensaje', nombre: 'Retomar una consulta', canal: 'Email', texto: 'Hola {nombre}, te escribo para retomar tu consulta sobre {asunto}.', fecha: iso(0), actualizado: iso(0)}
        ], resumenes: [
            {id: 'demo_resumen', nombre: 'Información de ejemplo', categoria: 'Otros', texto: 'Texto ficticio de una biblioteca independiente, listo para copiar y adaptar.', fecha: iso(0), actualizado: iso(0)}
        ]}));
        storage.setItem('memora154_pdf', '0'); storage.setItem('memora154_xlsx', '0');
        storage.setItem('memora154_initialized', '1');
    }
    if (isDemo && storage.getItem('memora154_initialized') !== '1') {
        // Solo preferencias de interfaz: nunca se copian registros, perfil ni tokens de Pro.
        for (const key of ['memora_idioma', 'memora_tema']) {
            const value = native.getItem(key);
            if (value !== null) storage.setItem(key, value);
        }
        seedDemo();
    }
    function count(kind) { return Math.max(0, Number(storage.getItem('memora154_' + kind)) || 0); }
    function increment(kind) { if (isDemo) storage.setItem('memora154_' + kind, count(kind) + 1); }
    function resetDemo() {
        const keep = {};
        for (const key of ['memora_admin_user_data', 'memora_profile_completed', 'memora_idioma', 'memora_tema']) {
            const value = storage.getItem(key); if (value !== null) keep[key] = value;
        }
        storage.clear(); seedDemo();
        Object.entries(keep).forEach(([key, value]) => storage.setItem(key, value));
        window.location.reload();
    }
    return Object.freeze({mode, isDemo, limits, storage, count, increment, resetDemo});
})();
const memoraStorage154 = Memora154.storage;

function textoModo154(es, en, pt) { return textoIdiomaMemora150(es, en, pt); }
function bloquearFuncionDemo154() {
    mostrarAvisoMemora(textoModo154(
        'Google Drive está disponible en Pro. En Demo podés explorar las funciones de seguimiento y los respaldos locales.',
        'Google Drive is available in Pro. In Demo you can explore follow-up features and local backups.',
        'O Google Drive está disponível no Pro. Na Demo você pode explorar o acompanhamento e os backups locais.'
    ), textoModo154('Función Pro', 'Pro feature', 'Função Pro'), 'cloud_off');
    if ($('chkAutoNube')) $('chkAutoNube').checked = false;
}
function validarExportacionDemo154(kind) {
    if (!Memora154.isDemo || Memora154.count(kind) < Memora154.limits[kind]) return true;
    mostrarAvisoMemora(textoModo154(
        `Usaste las ${Memora154.limits[kind]} exportaciones ${kind.toUpperCase()} de prueba. Podés restablecer la Demo desde Perfil.`,
        `You used the ${Memora154.limits[kind]} trial ${kind.toUpperCase()} exports. Reset Demo in Profile.`,
        `Você usou as ${Memora154.limits[kind]} exportações ${kind.toUpperCase()} de teste. Restaure a Demo no Perfil.`
    ), textoModo154('Límite Demo', 'Demo limit', 'Limite Demo'), 'warning');
    return false;
}
function validarBibliotecaDemo154(next, current) {
    if (!Memora154.isDemo) return true;
    for (const key of ['mensajes', 'resumenes']) {
        const limit = Memora154.limits[key];
        // Preserve older Demo content: editing/deleting is allowed above the new cap.
        if (next[key].length <= limit || next[key].length <= current[key].length) continue;
        const label = key === 'mensajes' ? textoModo154('plantillas de mensajes', 'message templates', 'modelos de mensagens') : textoModo154('resúmenes', 'summaries', 'resumos');
        mostrarAvisoMemora(textoModo154(
            `La Demo permite hasta ${limit} ${label}, incluidos los ejemplos. Esta acción superaría el límite; no se guardó ningún cambio. Podés editar o eliminar un elemento para liberar espacio.`,
            `Demo allows up to ${limit} ${label}, including examples. This action would exceed the limit; no changes were saved. You can edit or delete an item to free up space.`,
            `A Demo permite até ${limit} ${label}, incluindo exemplos. Esta ação ultrapassaria o limite; nenhuma alteração foi salva. Você pode editar ou excluir um item para liberar espaço.`
        ), textoModo154('Límite Demo', 'Demo limit', 'Limite Demo'), 'warning');
        return false;
    }
    return true;
}
function solicitarRestablecerDemo154() {
    if (!Memora154.isDemo) return;
    mostrarConfirmMemora(textoModo154(
        'Se restaurarán los cinco ejemplos y los límites de prueba. Se borrarán tus cambios, creaciones y bibliotecas de Demo. Tu nombre y tus datos Pro se conservan.',
        'The five examples and trial limits will be restored. Your Demo changes, creations and libraries will be deleted. Your name and Pro data are preserved.',
        'Os cinco exemplos e os limites serão restaurados. Suas alterações, criações e bibliotecas da Demo serão apagadas. Seu nome e os dados Pro serão preservados.'
    ), textoModo154('Restablecer Demo', 'Reset Demo', 'Restaurar Demo'), 'refresh', '#004F87',
    confirmed => { if (confirmed) Memora154.resetDemo(); });
}
function actualizarModoMemora154() {
    const set = (id, text) => { const el = $(id); if (el && el.textContent !== text) el.textContent = text; };
    if (!Memora154.isDemo) return;
    const limits = Memora154.limits;
    const quota = textoModo154(
        `Registros: ${registros.length}/${limits.records} · PDF: ${Memora154.count('pdf')}/${limits.pdf} · XLSX: ${Memora154.count('xlsx')}/${limits.xlsx}`,
        `Records: ${registros.length}/${limits.records} · PDF: ${Memora154.count('pdf')}/${limits.pdf} · XLSX: ${Memora154.count('xlsx')}/${limits.xlsx}`,
        `Registros: ${registros.length}/${limits.records} · PDF: ${Memora154.count('pdf')}/${limits.pdf} · XLSX: ${Memora154.count('xlsx')}/${limits.xlsx}`
    );
    const library = contarDatosBiblioteca151();
    const libraryQuota = textoModo154(
        `Plantillas: ${library.mensajes}/${limits.mensajes} · Resúmenes: ${library.resumenes}/${limits.resumenes}`,
        `Templates: ${library.mensajes}/${limits.mensajes} · Summaries: ${library.resumenes}/${limits.resumenes}`,
        `Modelos: ${library.mensajes}/${limits.mensajes} · Resumos: ${library.resumenes}/${limits.resumenes}`
    );
    set('bibliotecasDemo154', libraryQuota); set('bibliotecasBannerDemo154', libraryQuota);
    set('descripcionDemo154', textoModo154(
        'Explorá Memora con cinco gestiones ficticias y probá cómo detectar casos que necesitan atención. Solo vos decidís cómo continuar.',
        'Explore Memora with five fictional cases and try finding cases that need attention. You decide what happens next.',
        'Explore o Memora com cinco atendimentos fictícios e teste como identificar casos que precisam de atenção. Só você decide como continuar.'
    ));
    set('tituloLimitesDemo154', textoModo154('Límites de la Demo', 'Demo limits', 'Limites da Demo'));
    const labels = [
        textoModo154('Hasta 15 registros en total', 'Up to 15 records in total', 'Até 15 registros no total'),
        textoModo154('Hasta 3 descargas PDF y 3 Excel', 'Up to 3 PDF and 3 Excel downloads', 'Até 3 downloads PDF e 3 Excel'),
        textoModo154('Hasta 5 plantillas de mensajes', 'Up to 5 message templates', 'Até 5 modelos de mensagens'),
        textoModo154('Hasta 3 resúmenes', 'Up to 3 summaries', 'Até 3 resumos'),
        textoModo154('Google Drive deshabilitado', 'Google Drive disabled', 'Google Drive desativado')
    ];
    for (let i = 0; i < labels.length; i++) set('limiteDemo154_' + i, labels[i]);
    set('bienvenidaLimitesDemo154', labels.join(' · ') + '.');
    set('tituloDemo154', textoModo154('Estás probando la Versión Demo', 'You are trying the Demo version', 'Você está testando a versão Demo'));
    set('textoCupoDemo', quota); set('limitesDemo154', quota);
    set('explicaLimites154', textoModo154('Los ejemplos y los archivados cuentan. Eliminar libera espacio; archivar no. PDF y XLSX tienen contadores independientes que se reinician con Restablecer Demo.', 'Examples and archived records count. Deleting frees up space; archiving does not. PDF and XLSX have independent counters that restart with Reset Demo.', 'Exemplos e registros arquivados contam. Excluir libera espaço; arquivar não. PDF e XLSX têm contadores independentes que reiniciam com Restaurar Demo.'));
    set('botonRestablecerDemo154', textoModo154('Restablecer Demo', 'Reset Demo', 'Restaurar Demo'));
    set('perfilRolAdmin', textoModo154('Usuario Demo', 'Demo user', 'Usuário Demo'));
    set('cloudStatusText', textoModo154('Pro · Bloqueado en Demo', 'Pro · Locked in Demo', 'Pro · Bloqueado na Demo'));
    set('perfilDemoTitulo154', textoModo154('Probá Memora', 'Try Memora', 'Teste o Memora'));
    set('perfilDemoDetalle154', textoModo154('Solo necesitamos tu nombre para empezar. Los registros precargados son ficticios.', 'We only need your name to begin. The preloaded records are fictional.', 'Só precisamos do seu nome para começar. Os registros carregados são fictícios.'));
}
document.addEventListener('DOMContentLoaded', () => {
    for (const id of ['tituloDemo154', 'descripcionDemo154', 'textoCupoDemo', 'bibliotecasBannerDemo154', 'tituloLimitesDemo154', 'limitesDemo154', 'bibliotecasDemo154', 'explicaLimites154', 'bienvenidaLimitesDemo154', 'botonRestablecerDemo154', 'perfilDemoTitulo154', 'perfilDemoDetalle154', ...Array.from({length:5}, (_, i) => 'limiteDemo154_' + i)]) $(id)?.setAttribute('data-memora-localized', '');
    if (Memora154.isDemo) {
        document.title = 'MEMORA DEMO - Seguimiento Inteligente de Clientes';
        $('limitesDemoCard154').hidden = false;
        $('bienvenidaLimitesDemo154').hidden = false;
        $('badgeDemo154').hidden = false;
        for (const id of ['initCedula', 'initEmpresa', 'initWhatsapp', 'cfgAdminRol', 'cfgAdminCedula', 'cfgAdminEmpresa', 'cfgAdminWhatsapp']) {
            const field = $(id); if (field) field.parentElement.hidden = true; field.parentElement.style.display = 'none';
        }
        if ($('cfgAdminRol')) { $('cfgAdminRol').value = 'Usuario Demo'; $('cfgAdminRol').readOnly = true; }
        const title = $('modalPerfilMemora')?.querySelector('h3'), detail = $('modalPerfilMemora')?.querySelector('p');
        if (title) { title.id = 'perfilDemoTitulo154'; title.setAttribute('data-memora-localized', ''); }
        if (detail) { detail.id = 'perfilDemoDetalle154'; detail.setAttribute('data-memora-localized', ''); }
        const cloud = $('chkAutoNube'); if (cloud) { cloud.checked = false; cloud.disabled = true; }
        document.body.setAttribute('data-memora-mode', 'demo');
        $('perfilRolAdmin')?.setAttribute('data-memora-localized', '');
        $('cloudStatusText')?.setAttribute('data-memora-localized', '');
        const resetButton = document.querySelector('button[onclick="solicitarHardResetMemora()"]');
        if (resetButton) {
            const card = resetButton.closest('.card'); card.style.display = 'none';
            if (card.previousElementSibling?.tagName === 'H3') card.previousElementSibling.style.display = 'none';
        }
    }
    actualizarModoMemora154();
});

// Limpieza limitada a los archivos de esta instalación; conserva otras carpetas.
const MEMORA_ASSETS_152 = ["./", "./index.html", "./styles.css", "./fonts.css", "./biblioteca151.css", "./biblioteca151.js", "./app.js", "./demo154.js", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./docs/Manual_Memora_v1.5.1_ES.pdf", "./docs/Manual_Memora_v1.5.1_EN.pdf", "./docs/Manual_Memora_v1.5.1_PT.pdf", "./docs/Manual_Memora_v1.5.2_ES.pdf", "./docs/Manual_Memora_v1.5.2_EN.pdf", "./docs/Manual_Memora_v1.5.2_PT.pdf"];
async function limpiarCacheActualMemora154() {
    if (!('caches' in window)) return;
    const scope = new URL('./', window.location.href).href;
    const urls = new Set(MEMORA_ASSETS_152.map(asset => new URL(asset, scope).href));
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('memora-')).map(async key => {
        const cache = await caches.open(key);
        for (const request of await cache.keys()) {
            const url = new URL(request.url); url.search = ''; url.hash = '';
            if (urls.has(url.href)) await cache.delete(request);
        }
        if ((await cache.keys()).length === 0) await caches.delete(key);
    }));
}
