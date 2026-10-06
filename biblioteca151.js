/* MEMORA 1.5.2 — Biblioteca local de mensajes y resúmenes.
   Solo organiza, completa y copia texto a pedido del usuario; nunca envía mensajes. */
const BIB151_KEY = 'memora151_biblioteca_v1';
const BIB151_CHANNELS = ['Todos los canales', 'WhatsApp', 'Instagram', 'Email', 'LinkedIn', 'Facebook', 'Telegram', 'Otro'];
const BIB151_CATEGORIES = ['Ventas', 'Consultas', 'Seguimiento', 'Otro'];
const BIB151_I18N = {
    es: {
        homeTitle:'Administrar mensajes y resúmenes',homeDesc:'Creá, editá y organizá mensajes y resúmenes para reutilizarlos cuando los necesites.',
        homeMessages:'Mis mensajes',homeMessagesDesc:'Plantillas para WhatsApp, Instagram, Mail y más.',homeSummaries:'Mis resúmenes',homeSummariesDesc:'Textos listos para copiar y compartir.',openLibrary:'Abrir biblioteca',
        title:'Mensajes y resúmenes',subtitle:'Creá, editá y organizá contenido reutilizable. Solo vos elegís cuándo copiarlo y compartirlo.',
        messages:'Mensajes',summaries:'Resúmenes',msgBanner:'Mensajes reutilizables',msgBannerDesc:'Escribí una vez, elegí una gestión cuando lo necesites y copiá el texto para cualquier red o canal.',
        sumBanner:'Resúmenes útiles',sumBannerDesc:'Guardá información lista para copiar y compartir. Podés escribirla o generarla a partir de una gestión.',
        libMessages:'Biblioteca de mensajes',libSummaries:'Biblioteca de resúmenes',newMessage:'Nuevo mensaje',newSummary:'Nuevo resumen',fromRecord:'Desde un registro',
        findMessages:'Buscar mensajes...',findSummaries:'Buscar resúmenes...',all:'Todos',allChannels:'Todos los canales',other:'Otro',sales:'Ventas',inquiries:'Consultas',followup:'Seguimiento',
        recent:'Vista previa de resúmenes',viewAll:'Ver todos',use:'Usar',copy:'Copiar',edit:'Editar',duplicate:'Duplicar',delete:'Eliminar',
        emptyMessage:'No hay mensajes para esta búsqueda. Creá uno nuevo o cambiá los filtros.',emptySummary:'Todavía no hay resúmenes para mostrar. Creá uno o generá uno desde un registro.',
        backupHint:'Respaldo de ambas bibliotecas. Tus mensajes y resúmenes se guardan en este navegador.',export:'Exportar mensajes y resúmenes',import:'Importar mensajes y resúmenes',
        labelName:'Nombre',labelBody:'Texto',labelChannel:'Canal',labelCategory:'Categoría',customChannel:'Nombre del canal',labelReference:'Canal de referencia (opcional)',labelRecord:'Generar a partir de un registro (opcional)',
        variables:'Podés usar {nombre}, {asunto}, {canal}, {empresa}, {telefono} o {numeroCliente}. Se completan cuando elegís un registro.',
        summaryHint:'El resumen puede ser completamente personalizado. Si elegís una gestión, Memora propone un borrador objetivo que podés modificar antes de guardarlo.',
        cancel:'Cancelar',save:'Guardar',useMessage:'Usar mensaje',useSummary:'Usar resumen',pickRecord:'Completar con un registro (opcional)',noRecord:'No completar · mantener texto original',
        useHint:'Revisá y editá el texto antes de copiarlo. Memora no envía mensajes automáticamente.',textEditable:'Texto editable',copyText:'Copiar texto',
        copied:'Texto copiado. Pegalo donde quieras.',copyManually:'No se pudo acceder al portapapeles. Seleccioná el texto y copialo manualmente.',
        required:'Escribí un nombre y un texto para guardar.',saved:'Guardado correctamente.',duplicated:'Copia creada.',deleteTitle:'Eliminar elemento',
        deleteAsk:'¿Querés eliminar este elemento? Esta acción no se puede deshacer.',deleted:'Elemento eliminado.',
        importInvalid:'El archivo no tiene una biblioteca válida de Memora.',importAsk:'¿Reemplazar la biblioteca actual? Si cancelás, los elementos importados se añadirán sin borrar los actuales.',
        imported:'Importación finalizada.',importError:'No se pudo leer el archivo. Elegí un archivo JSON de biblioteca.',
        saveError:'No hay espacio o no se pudo guardar la biblioteca local. Exportá una copia antes de continuar.',
        noRecords:'No hay registros disponibles.',nameNewMessage:'Mensaje nuevo',nameNewSummary:'Resumen nuevo',fromCustomer:'Resumen de',
        summaryCustomer:'Cliente',summarySubject:'Asunto',summaryStatus:'Estado',summaryPriority:'Prioridad',summaryChannel:'Canal',summaryLast:'Último comentario',summaryReview:'Última revisión',
        category:'Categoría',unknown:'Sin especificar',notSent:'Memora nunca envía mensajes por sí sola.',
    },
    en: {
        homeTitle:'Manage messages and summaries',homeDesc:'Create, edit and organize messages and summaries to reuse whenever you need them.',
        homeMessages:'My messages',homeMessagesDesc:'Templates for WhatsApp, Instagram, email and more.',homeSummaries:'My summaries',homeSummariesDesc:'Texts ready to copy and share.',openLibrary:'Open library',
        title:'Messages and summaries',subtitle:'Create, edit and organize reusable content. You choose when to copy and share it.',
        messages:'Messages',summaries:'Summaries',msgBanner:'Reusable messages',msgBannerDesc:'Write once, choose a record when needed and copy the text for any network or channel.',
        sumBanner:'Useful summaries',sumBannerDesc:'Keep information ready to copy and share. Write your own or generate one from a record.',
        libMessages:'Message library',libSummaries:'Summary library',newMessage:'New message',newSummary:'New summary',fromRecord:'From a record',
        findMessages:'Search messages...',findSummaries:'Search summaries...',all:'All',allChannels:'All channels',other:'Other',sales:'Sales',inquiries:'Inquiries',followup:'Follow-up',
        recent:'Summary preview',viewAll:'View all',use:'Use',copy:'Copy',edit:'Edit',duplicate:'Duplicate',delete:'Delete',
        emptyMessage:'No messages match this search. Create one or change your filters.',emptySummary:'No summaries to show yet. Create one or generate one from a record.',
        backupHint:'Backup of both libraries. Messages and summaries are saved in this browser.',export:'Export messages and summaries',import:'Import messages and summaries',
        labelName:'Name',labelBody:'Text',labelChannel:'Channel',labelCategory:'Category',customChannel:'Channel name',labelReference:'Reference channel (optional)',labelRecord:'Generate from a record (optional)',
        variables:'Use {nombre}, {asunto}, {canal}, {empresa}, {telefono}, or {numeroCliente}. They are filled in when you choose a record.',
        summaryHint:'Summaries can be entirely custom. Choosing a record creates a factual draft you can edit before saving.',
        cancel:'Cancel',save:'Save',useMessage:'Use message',useSummary:'Use summary',pickRecord:'Fill from a record (optional)',noRecord:'No record · keep original text',
        useHint:'Review and edit the text before copying it. Memora never sends messages automatically.',textEditable:'Editable text',copyText:'Copy text',
        copied:'Text copied. Paste it wherever you like.',copyManually:'Clipboard access failed. Select the text and copy it manually.',
        required:'Enter a name and some text before saving.',saved:'Saved.',duplicated:'Copy created.',deleteTitle:'Delete item',
        deleteAsk:'Delete this item? This cannot be undone.',deleted:'Item deleted.',
        importInvalid:'This file does not contain a valid Memora library.',importAsk:'Replace your current library? Choose Cancel to merge without deleting your current items.',
        imported:'Import complete.',importError:'Could not read this file. Select a library JSON file.',
        saveError:'Not enough space or could not save the local library. Export a copy before continuing.',
        noRecords:'No records available.',nameNewMessage:'New message',nameNewSummary:'New summary',fromCustomer:'Summary of',
        summaryCustomer:'Customer',summarySubject:'Subject',summaryStatus:'Status',summaryPriority:'Priority',summaryChannel:'Channel',summaryLast:'Latest comment',summaryReview:'Last review',
        category:'Category',unknown:'Not specified',notSent:'Memora never sends messages automatically.',
    },
    pt: {
        homeTitle:'Gerenciar mensagens e resumos',homeDesc:'Crie, edite e organize mensagens e resumos para reutilizar quando precisar.',
        homeMessages:'Minhas mensagens',homeMessagesDesc:'Modelos para WhatsApp, Instagram, e-mail e outros.',homeSummaries:'Meus resumos',homeSummariesDesc:'Textos prontos para copiar e compartilhar.',openLibrary:'Abrir biblioteca',
        title:'Mensagens e resumos',subtitle:'Crie, edite e organize conteúdo reutilizável. Você decide quando copiar e compartilhar.',
        messages:'Mensagens',summaries:'Resumos',msgBanner:'Mensagens reutilizáveis',msgBannerDesc:'Escreva uma vez, escolha um registro quando precisar e copie para qualquer rede ou canal.',
        sumBanner:'Resumos úteis',sumBannerDesc:'Guarde informações prontas para copiar e compartilhar. Escreva ou gere a partir de um registro.',
        libMessages:'Biblioteca de mensagens',libSummaries:'Biblioteca de resumos',newMessage:'Nova mensagem',newSummary:'Novo resumo',fromRecord:'A partir de registro',
        findMessages:'Buscar mensagens...',findSummaries:'Buscar resumos...',all:'Todos',allChannels:'Todos os canais',other:'Outro',sales:'Vendas',inquiries:'Consultas',followup:'Acompanhamento',
        recent:'Prévia dos resumos',viewAll:'Ver todos',use:'Usar',copy:'Copiar',edit:'Editar',duplicate:'Duplicar',delete:'Excluir',
        emptyMessage:'Nenhuma mensagem encontrada. Crie uma ou altere os filtros.',emptySummary:'Ainda não há resumos. Crie um ou gere a partir de um registro.',
        backupHint:'Backup das duas bibliotecas. Mensagens e resumos são salvos neste navegador.',export:'Exportar mensagens e resumos',import:'Importar mensagens e resumos',
        labelName:'Nome',labelBody:'Texto',labelChannel:'Canal',labelCategory:'Categoria',customChannel:'Nome do canal',labelReference:'Canal de referência (opcional)',labelRecord:'Gerar a partir de um registro (opcional)',
        variables:'Use {nombre}, {asunto}, {canal}, {empresa}, {telefono} ou {numeroCliente}. Eles são preenchidos ao escolher um registro.',
        summaryHint:'Os resumos podem ser personalizados. Ao escolher um registro, o Memora sugere um rascunho factual que você pode editar antes de salvar.',
        cancel:'Cancelar',save:'Salvar',useMessage:'Usar mensagem',useSummary:'Usar resumo',pickRecord:'Preencher com registro (opcional)',noRecord:'Sem registro · manter texto original',
        useHint:'Revise e edite o texto antes de copiá-lo. O Memora nunca envia mensagens automaticamente.',textEditable:'Texto editável',copyText:'Copiar texto',
        copied:'Texto copiado. Cole onde quiser.',copyManually:'Falha ao acessar a área de transferência. Selecione e copie o texto manualmente.',
        required:'Preencha o nome e o texto antes de salvar.',saved:'Salvo.',duplicated:'Cópia criada.',deleteTitle:'Excluir item',
        deleteAsk:'Excluir este item? Esta ação não pode ser desfeita.',deleted:'Item excluído.',
        importInvalid:'Este arquivo não contém uma biblioteca válida do Memora.',importAsk:'Substituir a biblioteca atual? Escolha Cancelar para combinar sem apagar os itens atuais.',
        imported:'Importação concluída.',importError:'Não foi possível ler o arquivo. Selecione um JSON de biblioteca.',
        saveError:'Sem espaço ou falha ao salvar a biblioteca local. Exporte uma cópia antes de continuar.',
        noRecords:'Nenhum registro disponível.',nameNewMessage:'Nova mensagem',nameNewSummary:'Novo resumo',fromCustomer:'Resumo de',
        summaryCustomer:'Cliente',summarySubject:'Assunto',summaryStatus:'Estado',summaryPriority:'Prioridade',summaryChannel:'Canal',summaryLast:'Último comentário',summaryReview:'Última revisão',
        category:'Categoria',unknown:'Não especificado',notSent:'O Memora nunca envia mensagens automaticamente.',
    }
};
function bi151lang() { return typeof idiomaMemora==='function' && ['es','en','pt'].includes(idiomaMemora()) ? idiomaMemora() : 'es'; }
function bi151(key) { return BIB151_I18N[bi151lang()]?.[key] || BIB151_I18N.es[key] || key; }
function bi151esc(value) { return String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])); }
function bi151search(value) { return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function bi151id() { return `bib_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`; }
function bi151presets(){return [
    ['Primer contacto','Hola {nombre}, te escribo por {asunto}. ¿Cómo estás?'],
    ['Retomar conversación','Hola {nombre}, retomo el contacto por {asunto}. Quedo atento a tus comentarios.'],
    ['Información enviada','Hola {nombre}, ¿pudiste revisar la información que te envié sobre {asunto}?'],
    ['Esperando respuesta','Hola {nombre}, ¿tenés alguna novedad sobre {asunto}?']
].map(([nombre,texto])=>({id:bi151id(),nombre,texto,canal:'Todos los canales',fecha:new Date().toISOString(),actualizado:new Date().toISOString()}));}
function bi151read(){
    try{
        const raw=memoraStorage154.getItem(BIB151_KEY);
        if(raw===null){const inicial={version:1,mensajes:bi151presets(),resumenes:[]};memoraStorage154.setItem(BIB151_KEY,JSON.stringify(inicial));return inicial;}
        const val=JSON.parse(raw);
        if(val && Array.isArray(val.mensajes) && Array.isArray(val.resumenes)) return val;
    }catch(e){console.warn('Memora library: invalid local data',e);}
    return {version:1,mensajes:[],resumenes:[]};
}
let biblioteca151 = bi151read();
let biblioteca151Tab = 'mensajes';
let biblioteca151Filter = 'Todos los canales';
const biblioteca152Vistas = {mensajes:{busqueda:'',filtro:'Todos los canales'},resumenes:{busqueda:'',filtro:'Todos'}};
let biblioteca151Editing = null;
let biblioteca151Using = null;
let biblioteca151BaseUseText = '';
let biblioteca151RecordGenId = '';
let biblioteca151LastFocus = null;
function bi151Save(next){
    if(!validarBibliotecaDemo154(next,biblioteca151))return false;
    try{memoraStorage154.setItem(BIB151_KEY,JSON.stringify(next));biblioteca151=next;actualizarModoMemora154();return true;}
    catch(e){console.error('Memora library save:',e);mostrarAvisoMemora(bi151('saveError'),bi151('title'),'warning');return false;}
}
function exportarDatosBiblioteca151(){return JSON.parse(JSON.stringify(biblioteca151));}
function contarDatosBiblioteca151(){return {mensajes:biblioteca151.mensajes.length,resumenes:biblioteca151.resumenes.length};}
function bi151DataKey(){return biblioteca151Tab==='mensajes'?'mensajes':'resumenes';}
function bi151MetaName(meta){
    if(meta==='Todos')return bi151('all');
    if(meta==='Todos los canales')return bi151('allChannels');
    if(meta==='Otro')return bi151('other');
    if(meta==='Ventas')return bi151('sales');
    if(meta==='Consultas')return bi151('inquiries');
    if(meta==='Seguimiento')return bi151('followup');
    return meta||bi151('allChannels');
}
function guardarVistaBiblioteca152(){
    biblioteca152Vistas[biblioteca151Tab]={busqueda:$('biblioteca151Search')?.value||'',filtro:biblioteca151Filter};
}
function seleccionarVistaBiblioteca152(tab){
    guardarVistaBiblioteca152();
    biblioteca151Tab=tab==='resumenes'?'resumenes':'mensajes';
    const vista=biblioteca152Vistas[biblioteca151Tab];
    biblioteca151Filter=vista.filtro;
    if($('biblioteca151Search'))$('biblioteca151Search').value=vista.busqueda;
}
function abrirBiblioteca151(tab='mensajes'){
    seleccionarVistaBiblioteca152(tab);
    navegarA('biblioteca151',bi151(biblioteca151Tab==='resumenes'?'summaries':'messages'));
    window.scrollTo(0,0);
    actualizarIdiomaBiblioteca151();
}
function cambiarBiblioteca151(tab){
    // Do not transfer an open editor or usage action into the other tool.
    if($('biblioteca151EditorBackdrop')?.style.display==='flex' || $('biblioteca151UseBackdrop')?.style.display==='flex')return;
    seleccionarVistaBiblioteca152(tab);
    actualizarIdiomaBiblioteca151();
}
function bi151set(id,txt){const el=$(id);if(el)el.textContent=txt;}
function actualizarIdiomaBiblioteca151(){
    const ids={
        biblioteca151HomeTitle:'homeTitle',biblioteca151HomeDesc:'homeDesc',biblioteca151HomeMessages:'homeMessages',biblioteca151HomeMessagesDesc:'homeMessagesDesc',
        biblioteca151HomeSummary:'homeSummaries',biblioteca151HomeSummaryDesc:'homeSummariesDesc',
        biblioteca151TabMensajesLabel:'messages',biblioteca151TabResumenesLabel:'summaries',biblioteca151BackupHint:'backupHint',
        biblioteca151Export:'export',biblioteca151ImportLabel:'import',biblioteca151CancelEditor:'cancel',biblioteca151SaveEditor:'save',
        biblioteca151CancelUse:'cancel',biblioteca151CopyUseLabel:'copyText',biblioteca151PickLabel:'pickRecord',biblioteca151UseHint:'useHint',biblioteca151UseBodyLabel:'textEditable',
        biblioteca151EditorNameLabel:'labelName',biblioteca151EditorRecordLabel:'labelRecord',biblioteca151EditorChannelLabel:'labelReference',biblioteca151EditorOtherLabel:'customChannel',
    };
    Object.entries(ids).forEach(([id,key])=>bi151set(id,bi151(key)));
    if($('biblioteca151HomeOpenIcon')){ $('biblioteca151HomeOpenIcon').setAttribute('aria-label',bi151('openLibrary')); $('biblioteca151HomeOpenIcon').title=bi151('openLibrary'); }
    if($('screenTitle') && $('sec-biblioteca151')?.style.display==='block')$('screenTitle').textContent=bi151(biblioteca151Tab==='resumenes'?'summaries':'messages');
    renderBiblioteca151();
}
function bi151FilterButton(meta,active){
    const escaped=bi151esc(meta);
    return `<button type="button" class="biblioteca151-chip ${active?'active':''}" data-bib-filter="${escaped}" aria-pressed="${active?'true':'false'}">${bi151esc(bi151MetaName(meta))}</button>`;
}
function bi151ItemCard(item,tab){
    const label=bi151MetaName(tab==='mensajes'?item.canal:(item.canal&&item.canal!=='Todos los canales'?item.canal:item.categoria));
    const excerpt=String(item.texto||'').length>260?String(item.texto).slice(0,260)+'…':String(item.texto||'');
    const id=bi151esc(item.id);
    return `<article class="biblioteca151-item">
        <div class="biblioteca151-item-top"><h4>${bi151esc(item.nombre)}</h4><span class="biblioteca151-badge">${bi151esc(label)}</span></div>
        <p class="biblioteca151-excerpt">${bi151esc(excerpt)}</p>
        <div class="biblioteca151-item-actions">
            <button class="biblioteca151-primary" type="button" data-bib-action="use" data-id="${id}"><span class="material-symbols-outlined">${tab==='mensajes'?'description':'content_copy'}</span>${bi151(tab==='mensajes'?'use':'copy')}</button>
            <button type="button" data-bib-action="edit" data-id="${id}"><span class="material-symbols-outlined">edit</span>${bi151('edit')}</button>
            <button type="button" data-bib-action="duplicate" data-id="${id}"><span class="material-symbols-outlined">content_copy</span>${bi151('duplicate')}</button>
            <button class="biblioteca151-delete" type="button" data-bib-action="delete" data-id="${id}"><span class="material-symbols-outlined">delete_outline</span>${bi151('delete')}</button>
        </div>
    </article>`;
}
function renderBiblioteca151(){
    const summary=biblioteca151Tab==='resumenes';
    bi151set('biblioteca151PageTitle',bi151(summary?'summaries':'messages'));
    bi151set('biblioteca151PageDesc',bi151(summary?'sumBannerDesc':'msgBannerDesc'));
    if($('biblioteca151TabMensajes'))$('biblioteca151TabMensajes').setAttribute('aria-selected',String(!summary));
    if($('biblioteca151TabResumenes'))$('biblioteca151TabResumenes').setAttribute('aria-selected',String(summary));
    bi151set('biblioteca151LibraryTitle',bi151(summary?'libSummaries':'libMessages'));
    bi151set('biblioteca151NewLabel',bi151(summary?'newSummary':'newMessage'));
    if($('biblioteca151FromRecord'))$('biblioteca151FromRecord').style.display=summary?'inline-flex':'none';
    bi151set('biblioteca151FromRecordLabel',bi151('fromRecord'));
    if($('biblioteca151Search'))$('biblioteca151Search').placeholder=bi151(summary?'findSummaries':'findMessages');
    if($('biblioteca151Promo')){
        $('biblioteca151Promo').innerHTML=`<span class="material-symbols-outlined">${summary?'description':'chat'}</span><div><strong>${bi151(summary?'sumBanner':'msgBanner')}</strong><p>${bi151(summary?'sumBannerDesc':'msgBannerDesc')}</p></div>`;
        $('biblioteca151Promo').classList.toggle('is-summary',summary);
    }
    const categories=summary?['Todos',...BIB151_CATEGORIES]:BIB151_CHANNELS;
    if($('biblioteca151Filters'))$('biblioteca151Filters').innerHTML=categories.map(x=>bi151FilterButton(x,biblioteca151Filter===x)).join('');
    const q=bi151search($('biblioteca151Search')?.value||'');
    const data=biblioteca151[bi151DataKey()].filter(it=>{
        if(summary && biblioteca151Filter!=='Todos' && it.categoria!==biblioteca151Filter)return false;
        if(!summary && biblioteca151Filter!=='Todos los canales' && it.canal!=='Todos los canales') {
            if(biblioteca151Filter==='Otro'){if(BIB151_CHANNELS.includes(it.canal) && it.canal!=='Otro')return false;}
            else if(it.canal!==biblioteca151Filter)return false;
        }
        return !q||bi151search(`${it.nombre} ${it.texto} ${it.canal||''} ${it.categoria||''}`).includes(q);
    });
    data.sort((a,b)=>String(b.actualizado||b.fecha).localeCompare(String(a.actualizado||a.fecha)));
    if($('biblioteca151Items'))$('biblioteca151Items').innerHTML=data.length?data.map(x=>bi151ItemCard(x,biblioteca151Tab)).join(''):
        `<p class="biblioteca151-empty">${bi151(summary?'emptySummary':'emptyMessage')}</p>`;

}
function bi151recordLabel(r){
    const name=String(r.nombre||r.contacto||bi151('unknown')).trim();
    return `${name} — ${String(r.asunto||bi151('unknown')).trim()}`;
}
function bi151recordOptions(allowEmpty=true){
    const sorted=[...registros].sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),bi151lang()));
    const pre=allowEmpty?`<option value="">${bi151('noRecord')}</option>`:'<option value="">—</option>';
    return pre+sorted.map(r=>`<option value="${bi151esc(String(r.id))}">${bi151esc(bi151recordLabel(r))}</option>`).join('');
}
function bi151metaOptions(values,current){return values.map(v=>`<option value="${bi151esc(v)}" ${v===current?'selected':''}>${bi151esc(bi151MetaName(v))}</option>`).join('');}
function nuevoItemBiblioteca151(fromRecord=false){
    biblioteca151LastFocus=document.activeElement;
    biblioteca151Editing=null;
    const summary=biblioteca151Tab==='resumenes';
    bi151set('biblioteca151EditorTitle',bi151(summary?'newSummary':'newMessage'));
    $('biblioteca151EditorName').value='';$('biblioteca151EditorBody').value='';
    bi151set('biblioteca151EditorMetaLabel',bi151(summary?'labelCategory':'labelChannel'));
    bi151set('biblioteca151EditorBodyLabel',bi151('labelBody'));
    bi151set('biblioteca151EditorHint',bi151(summary?'summaryHint':'variables'));
    $('biblioteca151EditorMeta').innerHTML=bi151metaOptions(summary?BIB151_CATEGORIES:BIB151_CHANNELS,summary?'Consultas':'Todos los canales');
    $('biblioteca151EditorMeta').value=summary?'Consultas':'Todos los canales';
    $('biblioteca151EditorRecordWrap').style.display=summary?'flex':'none';
    $('biblioteca151EditorOther').value='';$('biblioteca151EditorOtherWrap').style.display='none';
    $('biblioteca151EditorChannelWrap').style.display=summary?'flex':'none';
    if(summary){$('biblioteca151EditorChannel').innerHTML=bi151metaOptions(BIB151_CHANNELS,'Todos los canales');$('biblioteca151EditorChannel').value='Todos los canales';$('biblioteca151EditorRecord').innerHTML=bi151recordOptions();$('biblioteca151EditorRecord').value='';}
    $('biblioteca151EditorBackdrop').style.display='flex';
    document.body.classList.add('biblioteca151-modal-open');
    if(summary && fromRecord && registros.length){
        $('biblioteca151EditorRecord').value=String(registros[0].id);
        seleccionarRegistroEditorBiblioteca151();
        $('biblioteca151EditorBody').focus();
    }else $('biblioteca151EditorName').focus();
}
function editarItemBiblioteca151(id,fromTab=biblioteca151Tab){
    if(fromTab!==biblioteca151Tab)cambiarBiblioteca151(fromTab);
    const item=biblioteca151[bi151DataKey()].find(x=>x.id===id);if(!item)return;
    nuevoItemBiblioteca151();biblioteca151Editing=id;
    bi151set('biblioteca151EditorTitle',bi151('edit'));
    $('biblioteca151EditorName').value=item.nombre;
    $('biblioteca151EditorBody').value=item.texto;
    $('biblioteca151EditorMeta').value=biblioteca151Tab==='mensajes'?(BIB151_CHANNELS.includes(item.canal)?item.canal:'Otro'):item.categoria;
    $('biblioteca151EditorOther').value=BIB151_CHANNELS.includes(item.canal)?'':item.canal;
    if(biblioteca151Tab==='resumenes'){
        $('biblioteca151EditorChannel').value=BIB151_CHANNELS.includes(item.canal)?item.canal:'Otro';
        // Editing an existing summary never silently regenerates and overwrites its text.
        $('biblioteca151EditorRecord').value='';
    }
    actualizarCanalPersonalizadoBiblioteca151();
}
function seleccionarRegistroEditorBiblioteca151(){
    const id=$('biblioteca151EditorRecord')?.value;
    const r=registros.find(x=>String(x.id)===String(id));
    if(!r)return;
    if(!biblioteca151Editing || !$('biblioteca151EditorBody').value.trim()){
        $('biblioteca151EditorName').value=`${bi151('fromCustomer')} ${r.nombre||r.contacto||''}: ${r.asunto||''}`.trim().slice(0,90);
        $('biblioteca151EditorBody').value=generarResumenBreveBiblioteca151(r);
        $('biblioteca151EditorChannel').value=BIB151_CHANNELS.includes(r.canal)?r.canal:'Otro';
        $('biblioteca151EditorOther').value=BIB151_CHANNELS.includes(r.canal)?'':String(r.canal||'').slice(0,40);
        actualizarCanalPersonalizadoBiblioteca151();
    }else{
        // A user-authored edit must never be overwritten by a different record selection.
        mostrarAvisoMemora(bi151('summaryHint'),bi151('title'),'info');
    }
}
function generarResumenBreveBiblioteca151(r){
    const comments=(r.comentarios||[]).filter(x=>!x.eliminado&&String(x.texto||'').trim());
    const parts=[
        [bi151('summaryCustomer'),r.nombre||r.contacto||bi151('unknown')],
        [bi151('summarySubject'),r.asunto||bi151('unknown')],
        [bi151('summaryStatus'),typeof traducirCadenaMemora==='function'?traducirCadenaMemora(r.estado||''):r.estado],
        [bi151('summaryPriority'),r.prioridad||'Normal'],
        [bi151('summaryChannel'),r.canal||bi151('unknown')],
        [bi151('summaryReview'),typeof obtenerUltimaRevisionEfectiva==='function'?obtenerUltimaRevisionEfectiva(r):r.fecha]
    ];
    if(comments.length) parts.push([bi151('summaryLast'),comments[comments.length-1].texto]);
    return parts.map(([title,value])=>`${title}: ${value||'—'}`).join('\n');
}
function cerrarEditorBiblioteca151(){
    $('biblioteca151EditorBackdrop').style.display='none';document.body.classList.remove('biblioteca151-modal-open');
    biblioteca151Editing=null;biblioteca151LastFocus?.focus?.();
}
function actualizarCanalPersonalizadoBiblioteca151(){
    const select=biblioteca151Tab==='mensajes'?$('biblioteca151EditorMeta'):$('biblioteca151EditorChannel');
    $('biblioteca151EditorOtherWrap').style.display=select?.value==='Otro'?'flex':'none';
}
function guardarItemBiblioteca151(event){
    event.preventDefault();
    const nombre=$('biblioteca151EditorName').value.trim();
    const texto=$('biblioteca151EditorBody').value.trim();
    if(!nombre||!texto){mostrarAvisoMemora(bi151('required'),bi151('title'),'warning');return;}
    const summary=biblioteca151Tab==='resumenes', key=bi151DataKey();
    const now=new Date().toISOString();
    const original=biblioteca151[key].find(x=>x.id===biblioteca151Editing);
    let channel=summary?$('biblioteca151EditorChannel').value:$('biblioteca151EditorMeta').value;
    if(channel==='Otro')channel=$('biblioteca151EditorOther').value.trim().slice(0,40)||'Otro';
    const item={
        id:original?.id||bi151id(),nombre:nombre.slice(0,90),texto:texto.slice(0,12000),
        canal:channel,
        ...(summary?{categoria:$('biblioteca151EditorMeta').value}:{}),
        fecha:original?.fecha||now,actualizado:now
    };
    const next={...biblioteca151,[key]:original?biblioteca151[key].map(x=>x.id===original.id?item:x):[...biblioteca151[key],item]};
    if(bi151Save(next)){cerrarEditorBiblioteca151();renderBiblioteca151();}
}
function nombreCopiaBiblioteca151(nombre,items){
    const original=String(nombre||'').trim();
    const match=original.match(/^(.*?)\s+\((\d+)\)$/);
    const base=match?match[1]:original;
    const usados=new Set(items.map(x=>String(x.nombre||'').trim().toLocaleLowerCase()));
    let numero=match?Math.max(2,Number(match[2])+1):2;
    let candidato;
    do {
        const sufijo=` (${numero++})`;
        candidato=base.slice(0,90-sufijo.length).trimEnd()+sufijo;
    } while(usados.has(candidato.toLocaleLowerCase()));
    return candidato;
}
function duplicarItemBiblioteca151(id,tab=biblioteca151Tab){
    const key=tab==='mensajes'?'mensajes':'resumenes';
    const item=biblioteca151[key].find(x=>x.id===id);if(!item)return;
    const now=new Date().toISOString();
    const nombreCopia=nombreCopiaBiblioteca151(item.nombre,biblioteca151[key]);
    const next={...biblioteca151,[key]:[...biblioteca151[key],{...item,id:bi151id(),nombre:nombreCopia,fecha:now,actualizado:now}]};
    if(bi151Save(next)){renderBiblioteca151();mostrarAvisoMemora(bi151('duplicated'),bi151('title'),'content_copy');}
}
function eliminarItemBiblioteca151(id,tab=biblioteca151Tab){
    const key=tab==='mensajes'?'mensajes':'resumenes';
    if(!biblioteca151[key].some(x=>x.id===id))return;
    mostrarConfirmMemora(bi151('deleteAsk'),bi151('deleteTitle'),'delete','#DC2626',confirmado=>{
        if (!confirmado) return;
        const next={...biblioteca151,[key]:biblioteca151[key].filter(x=>x.id!==id)};
        if(bi151Save(next))renderBiblioteca151();
    });
}
function reemplazarVariablesBiblioteca151(texto,r){
    if(!r)return String(texto||'');
    const firstName=String(r.nombre||'').trim().split(/\s+/)[0]||'';
    const rawId=String(r.identificador||'').replace(/^(rut|nº de cliente|cliente|socio)\s*:?\s*/i,'');
    const admin=(()=>{try{return JSON.parse(memoraStorage154.getItem('memora_admin_user_data')||'{}');}catch(e){return {};}})();
    const fields={nombre:firstName,asunto:r.asunto||'',canal:r.canal||'',empresa:r.empresa||admin.empresaAdmin||'',telefono:r.contacto||'',numerocliente:rawId};
    return String(texto||'').replace(/\{(nombre|asunto|canal|empresa|telefono|numeroCliente)\}/gi,(all,key)=>fields[key.toLowerCase()]??all);
}
function usarItemBiblioteca151(id,tab=biblioteca151Tab){
    const key=tab==='mensajes'?'mensajes':'resumenes';
    const item=biblioteca151[key].find(x=>x.id===id);if(!item)return;
    biblioteca151LastFocus=document.activeElement;
    biblioteca151Using={...item,tab:key};
    biblioteca151BaseUseText=item.texto;
    $('biblioteca151UseTitle').textContent=bi151(tab==='mensajes'?'useMessage':'useSummary');
    $('biblioteca151PickRecord').innerHTML=bi151recordOptions();
    $('biblioteca151PickRecord').value='';
    $('biblioteca151UseBody').value=item.texto;
    bi151set('biblioteca151CopyState','');
    $('biblioteca151UseBackdrop').style.display='flex';document.body.classList.add('biblioteca151-modal-open');
    $('biblioteca151PickRecord').focus();
}
function cambiarRegistroUsoBiblioteca151(){
    if(!biblioteca151Using)return;
    const id=$('biblioteca151PickRecord').value;
    const record=registros.find(r=>String(r.id)===String(id));
    // Use stored original every time. Do not double-substitute or persist customer data.
    $('biblioteca151UseBody').value=reemplazarVariablesBiblioteca151(biblioteca151BaseUseText,record);
    bi151set('biblioteca151CopyState','');
}
async function copiarUsoBiblioteca151(){
    const text=$('biblioteca151UseBody').value;
    if(!text.trim()){bi151set('biblioteca151CopyState',bi151('required'));return;}
    try{
        if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
        else{
            $('biblioteca151UseBody').focus();$('biblioteca151UseBody').select();
            if(!document.execCommand('copy'))throw Error('clipboard');
        }
        bi151set('biblioteca151CopyState',bi151('copied'));
    }catch(e){
        bi151set('biblioteca151CopyState',bi151('copyManually'));
        $('biblioteca151UseBody').focus();$('biblioteca151UseBody').select();
    }
}
function cerrarUsoBiblioteca151(){
    $('biblioteca151UseBackdrop').style.display='none';document.body.classList.remove('biblioteca151-modal-open');
    biblioteca151Using=null;biblioteca151LastFocus?.focus?.();
}
function exportarBiblioteca151(){
    const data={...exportarDatosBiblioteca151(),producto:'MEMORA',tipo:'biblioteca151',exportadoEn:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
    descargarBlob(blob,`MEMORA_Biblioteca_${selloArchivoMemora()}.json`);
}
function validarArchivoBiblioteca151(val){
    if(!val||typeof val!=='object'||!Array.isArray(val.mensajes)||!Array.isArray(val.resumenes))return null;
    if(val.mensajes.length+val.resumenes.length>1500)return null;
    const clean=(arr,summary)=>arr.map(x=>{
        if(!x||typeof x!=='object'||typeof x.nombre!=='string'||typeof x.texto!=='string'||!x.nombre.trim()||!x.texto.trim()||x.nombre.length>90||x.texto.length>12000)throw Error('item');
        return {id:/^bib_[a-z\d_]+$/.test(String(x.id))?x.id:bi151id(),nombre:x.nombre,texto:x.texto,
            canal:typeof x.canal==='string' && x.canal.trim() ? x.canal.trim().slice(0,40) : 'Todos los canales',
            ...(summary?{categoria:BIB151_CATEGORIES.includes(x.categoria)?x.categoria:'Otro'}:{}),
            fecha:typeof x.fecha==='string'?x.fecha:new Date().toISOString(),actualizado:typeof x.actualizado==='string'?x.actualizado:new Date().toISOString()};
    });
    try{return {version:1,mensajes:clean(val.mensajes,false),resumenes:clean(val.resumenes,true)};}catch(e){return null;}
}
async function importarBiblioteca151(event){
    const input=event.target,file=input.files?.[0];input.value='';if(!file)return;
    if(file.size>13_000_000){mostrarAvisoMemora(bi151('importInvalid'),bi151('title'),'warning');return;}
    let parsed;
    try{parsed=validarArchivoBiblioteca151(JSON.parse(await file.text()));}
    catch(e){mostrarAvisoMemora(bi151('importError'),bi151('title'),'warning');return;}
    if(!parsed){mostrarAvisoMemora(bi151('importInvalid'),bi151('title'),'warning');return;}
    // Safe merge only: importing must never erase existing user-created content.
    const merge=(oldItems,added)=>{
        const ids=new Set(oldItems.map(x=>x.id));
        const content=new Set(oldItems.map(x=>JSON.stringify([x.nombre,x.texto,x.canal,x.categoria||''])));
        const merged=[...oldItems];
        for(const x of added){
            const sig=JSON.stringify([x.nombre,x.texto,x.canal,x.categoria||'']);
            if(content.has(sig))continue;
            const id=ids.has(x.id)?bi151id():x.id;
            merged.push({...x,id});ids.add(id);content.add(sig);
        }
        return merged;
    };
    const next={version:1,mensajes:merge(biblioteca151.mensajes,parsed.mensajes),resumenes:merge(biblioteca151.resumenes,parsed.resumenes)};
    if(bi151Save(next)){renderBiblioteca151();mostrarAvisoMemora(bi151('imported'),bi151('title'),'check_circle');}
}
// Delegated events: IDs come from normalized local records, never inline user-authored code.
document.addEventListener('click',event=>{
    const filter=event.target.closest('[data-bib-filter]');
    if(filter && $('sec-biblioteca151')?.contains(filter)){
        biblioteca151Filter=filter.dataset.bibFilter;renderBiblioteca151();return;
    }
    const btn=event.target.closest('[data-bib-action]');
    if(!btn||!($('sec-biblioteca151')?.contains(btn)))return;
    const action=btn.dataset.bibAction,id=btn.dataset.id;
    if(action==='use')usarItemBiblioteca151(id);
    else if(action==='use-summary')usarItemBiblioteca151(id,'resumenes');
    else if(action==='edit')editarItemBiblioteca151(id);
    else if(action==='duplicate')duplicarItemBiblioteca151(id);
    else if(action==='delete')eliminarItemBiblioteca151(id);
});
document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
        if($('biblioteca151UseBackdrop')?.style.display==='flex')cerrarUsoBiblioteca151();
        else if($('biblioteca151EditorBackdrop')?.style.display==='flex')cerrarEditorBiblioteca151();
    }
});
document.addEventListener('DOMContentLoaded',actualizarIdiomaBiblioteca151);
