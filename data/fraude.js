// Datos de demostración de «Indicadores de fraude»: catálogo de indicadores de comportamiento, escenarios de fraude,
// histórico ficticio de pólizas y siniestros (lo que cruza el motor de fraude.js), cola de la Unidad de Investigación
// de Siniestros (SIU) y 14 días de evolución. Todo inventado para la demo y escrito con «hoy» = 17/09/2026
// (fechas.js lo desplaza al día de hoy). Nada de esto se envía al modelo.
//
// Principio: el indicio no acusa, prioriza. Un score alto escala a una persona de la SIU; nunca rechaza nada solo
// (RGPD art. 22) y nunca se comunica al cliente (G-12).

const FRAUDE_DEMO = {
  // Niveles por score (0-100): [mínimo, clave, etiqueta, qué pasa]
  niveles: [
    [70, 'siu', 'Escalado a la SIU', 'Sin despeje automático (G-10): va a la cola de la SIU con su ficha preparada'],
    [40, 'vigilancia', 'Vigilancia', 'Se tramita, pero el pago queda retenido hasta verificar el punto señalado; muestreo a posteriori'],
    [0, 'sin', 'Sin indicios', 'Solo se registra'],
  ],

  // Indicadores predefinidos. `fp` = falsos positivos en 14 días (casos cerrados por la SIU como no fraude / casos
  // en los que disparó); `no_es` = lo que no debe leerse como indicio.
  indicadores: [
    { id: 'IF-01', grupo: 'Temporal', icono: 'calendar-clock', nombre: 'Siniestro poco después del alta', senal: 'El hecho ocurre a menos de 30 días del alta de la póliza', fuente: 'Histórico de pólizas + texto', peso: 25, ramos: ['Auto', 'Hogar', 'Salud'], activo: true, disparos_14d: 64, fp: 0.58, no_es: 'Una mudanza o un coche nuevo explican muchas altas recientes: el indicador solo suma, nunca decide.' },
    { id: 'IF-02', grupo: 'Temporal', icono: 'moon', nombre: 'Comunicación al límite del plazo o de madrugada', senal: 'Se comunica el día 6 o 7 del plazo, o entre las 00:00 y las 06:00', fuente: 'Fecha de recepción', peso: 10, ramos: ['Auto', 'Hogar', 'Salud'], activo: true, disparos_14d: 212, fp: 0.91, no_es: 'Quien vuelve de viaje o trabaja a turnos comunica tarde o de noche: es el indicador con más falsos positivos.' },
    { id: 'IF-03', grupo: 'Relacional', icono: 'landmark', nombre: 'IBAN compartido entre asegurados distintos', senal: 'La misma cuenta de cobro aparece en siniestros de titulares no relacionados', fuente: 'Cruce entre mensajes e histórico', peso: 35, ramos: ['Auto', 'Hogar', 'Salud'], activo: true, disparos_14d: 9, fp: 0.22, no_es: 'Familiares o un administrador de fincas pueden compartir cuenta: se verifica la titularidad antes de pagar.' },
    { id: 'IF-04', grupo: 'Relacional', icono: 'phone', nombre: 'Teléfono repetido en varias pólizas', senal: 'El mismo teléfono de contacto en siniestros de 2 o más pólizas distintas en 90 días', fuente: 'Cruce entre mensajes e histórico', peso: 20, ramos: ['Auto', 'Hogar', 'Salud'], activo: true, disparos_14d: 17, fp: 0.47, no_es: 'Un mediador o un familiar que comunica por otros comparte teléfono de forma legítima.' },
    { id: 'IF-05', grupo: 'Relacional', icono: 'store', nombre: 'Proveedor recurrente en casos con indicios', senal: 'Taller, cristalería o clínica presente en 3 o más casos marcados en 90 días', fuente: 'Lista interna de proveedores', peso: 15, ramos: ['Auto', 'Hogar'], activo: true, disparos_14d: 21, fp: 0.52, no_es: 'Un proveedor grande aparece en muchos casos por volumen: se mira la proporción, no el número.' },
    { id: 'IF-06', grupo: 'Historial', icono: 'history', nombre: 'Siniestro similar previo sobre el mismo bien', senal: 'Mismo tipo de daño sobre el mismo vehículo o vivienda en menos de 12 meses', fuente: 'Histórico de siniestros + texto', peso: 20, ramos: ['Auto', 'Hogar'], activo: true, disparos_14d: 88, fp: 0.66, no_es: 'Aparcar siempre en el mismo sitio expone al mismo riesgo: dos casos no son un patrón (A8 exige 3).' },
    { id: 'IF-07', grupo: 'Relato', icono: 'message-circle-question', nombre: 'Relato vago en el elemento clave', senal: '«no sé cuánto», «no estoy seguro», sin lista de bienes ni importe', fuente: 'Mensaje (cita literal)', peso: 15, ramos: ['Hogar', 'Auto'], activo: true, disparos_14d: 131, fp: 0.81, no_es: 'Quien acaba de sufrir un robo está nervioso y no tiene la lista: es normal en las primeras horas.' },
    { id: 'IF-08', grupo: 'Relato', icono: 'file-x', nombre: 'Falta de la prueba exigible', senal: 'Robo sin denuncia ni signos de fuerza; vandalismo sin cámaras ni testigos', fuente: 'Mensaje (cita literal) + reglas H4 / A7', peso: 20, ramos: ['Auto', 'Hogar'], activo: true, disparos_14d: 96, fp: 0.63, no_es: 'La denuncia puede llegar después: el indicador baja en cuanto se aporta.' },
    { id: 'IF-09', grupo: 'Relato', icono: 'timer', nombre: 'Urgencia y proveedor propio', senal: '«que venga alguien hoy», «puedo ir a mi taller», taller de al lado de casa', fuente: 'Mensaje (cita literal)', peso: 10, ramos: ['Auto', 'Hogar'], activo: true, disparos_14d: 174, fp: 0.88, no_es: 'Pedir rapidez es lo normal: por eso pesa poco. Dispara más en WhatsApp por el tono (ver equidad por canal).' },
    { id: 'IF-10', grupo: 'Económico', icono: 'gem', nombre: 'Bienes de alto valor sin justificar', senal: 'Joyas, electrónica o efectivo por encima del límite y sin factura', fuente: 'Mensaje (cita literal) + H4', peso: 20, ramos: ['Hogar'], activo: true, disparos_14d: 23, fp: 0.39, no_es: 'Las joyas heredadas rara vez tienen factura: se piden fotos o tasación, no se presume nada.' },
    { id: 'IF-11', grupo: 'Conductor', icono: 'car', nombre: 'Conductor joven no declarado', senal: 'Conduce un menor de 25 años que el tomador no sabe si está declarado', fuente: 'Mensaje + póliza (conductores declarados)', peso: 20, ramos: ['Auto'], activo: true, disparos_14d: 19, fp: 0.68, no_es: 'Si la póliza lo tiene declarado, el indicador se anula (contraindicio).' },
    { id: 'IF-12', grupo: 'Canal', icono: 'copy', nombre: 'Mismo hecho por dos canales con datos distintos', senal: 'La misma póliza comunica dos veces el mismo hecho con importe o relato diferentes', fuente: 'Cruce entre mensajes', peso: 30, ramos: ['Auto', 'Hogar', 'Salud'], activo: true, disparos_14d: 7, fp: 0.29, no_es: 'Un cliente que reenvía por otro canal porque no le contestan no cambia los datos: solo cuenta si cambian.' },
  ],

  // Escenarios: combinación de indicadores con su narrativa. `clave` basta por sí solo para asociar el caso al
  // escenario; el resto necesita al menos dos indicadores del escenario. `lote` = mensajes del Paquete A.
  escenarios: [
    { id: 'EF-01', icono: 'house', ramo: 'Hogar', nombre: 'Robo sin fuerza en una póliza recién contratada', indicadores: ['IF-01', 'IF-07', 'IF-08', 'IF-09', 'IF-10'], clave: null, umbral: 70,
      narrativa: 'Se contrata el seguro (a veces con el capital de joyas ampliado) y a las pocas semanas se declara un robo sin signos de fuerza ni denuncia, con bienes de valor sin factura y prisa por que vaya alguien.',
      accion: 'SIU: pedir denuncia, relación valorada con fotos o tasación y visita del perito antes de cualquier pago.',
      falsos_positivos: 'Mudanzas recientes (alta nueva por cambio de vivienda) y familias que heredan joyas sin factura.', normas: ['rgpd-22', 'rgpd-c47', 'lossear-99-7'], lote: ['MSG-A-13'], casos_14d: 9, confirmados_14d: 3 },
    { id: 'EF-02', icono: 'landmark', ramo: 'Hogar', nombre: 'Cuenta de cobro compartida entre siniestros no relacionados', indicadores: ['IF-03', 'IF-04', 'IF-05'], clave: 'IF-03', umbral: 40,
      narrativa: 'Varios asegurados sin relación entre sí piden el pago a la misma cuenta, a menudo con el mismo proveedor de por medio. Es la huella típica de un intermediario que gestiona siniestros inflados o inventados.',
      accion: 'Retener el pago (G-11) hasta verificar la titularidad de la cuenta con el banco; si no es del asegurado, SIU.',
      falsos_positivos: 'Familiares, comunidades de propietarios o un administrador de fincas que cobra por cuenta de varios.', normas: ['rgpd-c47', 'lossear-99-7', 'eiopa'], lote: ['MSG-A-09', 'MSG-A-02'], casos_14d: 4, confirmados_14d: 1 },
    { id: 'EF-03', icono: 'spray-can', ramo: 'Auto', nombre: 'Vandalismo recurrente sobre el mismo vehículo', indicadores: ['IF-06', 'IF-08', 'IF-09'], clave: null, umbral: 40,
      narrativa: 'El mismo coche declara rayones o golpes de autor desconocido cada pocos meses, en el mismo sitio y sin cámaras ni testigos, y se repara en un taller propio.',
      accion: 'Vigilancia: comparar las fotos con las del siniestro anterior (¿es el mismo daño?) antes de liberar el pago.',
      falsos_positivos: 'Zonas con vandalismo real y repetido: el parking es el mismo porque es el de casa o el del trabajo.', normas: ['rgpd-22', 'eiopa'], lote: ['MSG-A-11'], casos_14d: 14, confirmados_14d: 2 },
    { id: 'EF-04', icono: 'user-round', ramo: 'Auto', nombre: 'Conductor habitual joven ocultado', indicadores: ['IF-11', 'IF-06', 'IF-09'], clave: null, umbral: 40,
      narrativa: 'Se contrata la póliza sin declarar al conductor joven que usa el coche a diario (prima más baja) y los siniestros los conduce siempre él.',
      accion: 'Comprobar los conductores declarados; si no consta, regularizar la póliza (prima y franquicia) antes de pagar.',
      falsos_positivos: 'Conductores ocasionales ya declarados. En MSG-A-04 el histórico de la póliza anula el indicador: Pablo está declarado desde 03/2026.', normas: ['rgpd-22', 'rgpd-13'], lote: ['MSG-A-04'], casos_14d: 11, confirmados_14d: 1 },
    { id: 'EF-05', icono: 'car-front', ramo: 'Auto', nombre: 'Colisión concertada con un tercero vinculado', indicadores: ['IF-04', 'IF-05', 'IF-12'], clave: 'IF-12', umbral: 70,
      narrativa: 'Dos vehículos con un contacto común simulan un alcance: el parte amistoso llega por un canal y el tercero reclama por otro con otro importe; ambos van al mismo taller.',
      accion: 'SIU: peritación de los dos vehículos y cruce con el fichero sectorial.', falsos_positivos: 'Vecinos o compañeros de trabajo que de verdad chocan en el mismo garaje.', normas: ['rgpd-22', 'lossear-99-7'], lote: [], casos_14d: 3, confirmados_14d: 2 },
    { id: 'EF-06', icono: 'receipt', ramo: 'Auto', nombre: 'Sobrefacturación de un proveedor', indicadores: ['IF-05', 'IF-10'], clave: null, umbral: 40,
      narrativa: 'Un taller o una cristalería presupuesta sistemáticamente por encima del baremo y aparece en casos con otros indicios.',
      accion: 'Vigilancia del proveedor: peritación aleatoria y comparación con el baremo de la red concertada.', falsos_positivos: 'Proveedores fuera de la red con precios de mercado más altos.', normas: ['eiopa'], lote: [], casos_14d: 6, confirmados_14d: 1 },
    { id: 'EF-07', icono: 'copy', ramo: 'Auto', nombre: 'Duplicado multicanal con importe inflado', indicadores: ['IF-12', 'IF-02'], clave: 'IF-12', umbral: 40,
      narrativa: 'El mismo hecho entra por web y por WhatsApp con días de diferencia; el segundo mensaje sube el importe o añade daños.',
      accion: 'Unir los dos mensajes en un solo expediente y pedir explicación de la diferencia.', falsos_positivos: 'Clientes que reenvían porque no recibieron respuesta (mismos datos).', normas: ['rgpd-13'], lote: [], casos_14d: 4, confirmados_14d: 1 },
    { id: 'EF-08', icono: 'heart-pulse', ramo: 'Salud', nombre: 'Preexistencia ocultada en Salud', indicadores: ['IF-01', 'IF-02'], clave: null, umbral: 40,
      narrativa: 'Se contrata el seguro de salud y en pocos meses se pide una cirugía por una dolencia que «se arrastraba» (regla S3).',
      accion: 'Revisar el cuestionario de salud firmado; decide el médico consultor, no el indicador.', falsos_positivos: 'Lesiones agudas nuevas en asegurados recientes.', normas: ['rgpd-9', 'rgpd-22'], lote: [], casos_14d: 5, confirmados_14d: 1 },
  ],

  // Histórico ficticio que cruza el motor (solo lectura). Nada de esto se envía al modelo.
  historico: {
    polizas: {
      'HO-604118': { tomador: 'Luis Miguel Arranz', alta: '2026-08-24', producto: 'Hogar Plus', nota: 'Alta online con el capital de joyas ampliado a 6.000 €' },
      'AU-742210': { tomador: 'Rocío Pascual Mena', alta: '2024-03-02', producto: 'Auto Todo Riesgo con franquicia' },
      'AU-119045': { tomador: 'Antonio Navarro Blanco', alta: '2019-06-11', producto: 'Auto Terceros Ampliado', conductores: ['Antonio Navarro Blanco', 'Marisa Blanco Díaz', 'Pablo Navarro Blanco'], nota: 'Pablo Navarro Blanco (22 años) declarado como conductor ocasional desde 03/2026' },
      'HO-118830': { tomador: 'Iván Castro Luque', alta: '2025-11-20', producto: 'Hogar Básico' },
      'HO-220114': { tomador: 'Jorge Herrera Pino', alta: '2021-02-01', producto: 'Hogar Plus' },
    },
    siniestros: [
      { id: 'SIN-2026-03318', poliza: 'AU-742210', fecha: '2026-03-21', tipo: 'Rayón en la puerta por autor desconocido', familia: 'vandalismo', bien: '2290 LKV', lugar: 'Parking del Carrefour de Alcobendas', importe: 540, estado: 'Pagado', taller: 'Taller de confianza del cliente' },
      { id: 'SIN-2026-05107', poliza: 'AU-119045', fecha: '2026-05-14', tipo: 'Roce lateral contra una columna', familia: 'daños propios', bien: '3318 LMB', lugar: 'Parking de la Facultad de Económicas', conductor: 'Pablo Navarro Blanco (22 años)', importe: 1350, estado: 'Pagado', taller: 'Talleres Ruiz de Alcorcón' },
      { id: 'SIN-2026-08842', poliza: 'HO-509921', fecha: '2026-08-29', tipo: 'Rotura de cristal', familia: 'cristales', titular: 'Marcos Gil Pardo', iban: 'ES91 2100 0418 4502 0005 1332', proveedor: 'Cristalería Vallecas', importe: 380, estado: 'Pagado' },
      { id: 'SIN-2026-07730', poliza: 'HO-311207', fecha: '2026-07-30', tipo: 'Rotura de cristal', familia: 'cristales', titular: 'Elisa Moreno Caro', proveedor: 'Cristalería Vallecas', importe: 420, estado: 'En vigilancia' },
    ],
    proveedores: [
      { nombre: 'Cristalería Vallecas', tipo: 'Cristalería', casos_marcados: 4, nota: '4 casos con indicios en 90 días; en 3 se pide el pago a la misma cuenta' },
      { nombre: 'Talleres Ruiz de Alcorcón', tipo: 'Taller', casos_marcados: 1, nota: 'Por debajo del umbral (3): en observación' },
    ],
  },

  // Seguimiento de los casos del lote y casos del histórico en la cola de la SIU. Los del lote toman score y nivel
  // del motor; aquí solo va lo que ha hecho una persona. La cola trae además expedientes anteriores al lote.
  seguimiento: {
    'MSG-A-13': { estado: 'pendiente', responsable: 'SIU · R. Calvo', fecha: '2026-09-17T09:03:45', nota: 'Pedir denuncia, relación valorada y visita del perito. No comentar el indicio con el cliente.' },
    'MSG-A-09': { estado: 'en_verificacion', responsable: 'Tesorería · verificación de titularidad', fecha: '2026-09-17T09:03:14', nota: 'Pedir al banco la titularidad de la cuenta ES91 … 1332 antes de liberar los 400 €.' },
    'MSG-A-02': { estado: 'en_verificacion', responsable: 'Tesorería · verificación de titularidad', fecha: '2026-09-17T09:02:18', nota: 'Misma cuenta que MSG-A-09 y que un siniestro de agosto de otro titular: retenidos 1.080 €.' },
    'MSG-A-11': { estado: 'en_verificacion', responsable: 'Tramitación Auto · L. Prieto', fecha: '2026-09-17T09:03:31', nota: 'Comparar las fotos con las del siniestro de marzo (SIN-2026-03318) antes de liberar los 600 €.' },
    'MSG-A-04': { estado: 'descartado', responsable: 'Tramitación Auto · L. Prieto', fecha: '2026-09-17T09:41:00', nota: 'Pablo consta como conductor declarado desde 03/2026: el patrón de EF-04 no aplica.' },
  },
  cola: [
    { id: 'SIU-0431', caso: 'SIN-2026-09461', escenario: 'EF-05', ramo: 'Auto', score: 84, importe: 6900, estado: 'en_investigacion', responsable: 'SIU · R. Calvo', abierto: '2026-09-16T12:40:00', nota: 'Alcance con parte por web y reclamación del tercero por teléfono con otro importe; mismo taller.' },
    { id: 'SIU-0429', caso: 'SIN-2026-09398', escenario: 'EF-01', ramo: 'Hogar', score: 78, importe: 4200, estado: 'en_investigacion', responsable: 'SIU · A. Ferrer', abierto: '2026-09-15T10:05:00', nota: 'Robo de electrónica a los 12 días del alta; denuncia aportada después.' },
    { id: 'SIU-0426', caso: 'SIN-2026-09177', escenario: 'EF-02', ramo: 'Hogar', score: 72, importe: 380, estado: 'confirmado', responsable: 'SIU · R. Calvo', abierto: '2026-09-11T16:20:00', cierre: '2026-09-15T13:00:00', nota: 'La cuenta ES91 … 1332 no es del asegurado. Pago anulado; comunicado al fichero sectorial.' },
    { id: 'SIU-0422', caso: 'SIN-2026-09052', escenario: 'EF-03', ramo: 'Auto', score: 71, importe: 350, estado: 'descartado', responsable: 'SIU · A. Ferrer', abierto: '2026-09-09T09:50:00', cierre: '2026-09-10T11:15:00', nota: 'Vandalismo real en la zona: tres denuncias de vecinos la misma noche.' },
    { id: 'SIU-0418', caso: 'SIN-2026-08906', escenario: 'EF-01', ramo: 'Hogar', score: 88, importe: 7800, estado: 'confirmado', responsable: 'SIU · R. Calvo', abierto: '2026-09-06T11:00:00', cierre: '2026-09-12T17:30:00', nota: 'Joyas declaradas que el asegurado había vendido meses antes. Siniestro rechazado por el Comité de Siniestros (decisión humana).' },
    { id: 'SIU-0415', caso: 'SIN-2026-08871', escenario: 'EF-08', ramo: 'Salud', score: 70, importe: 3900, estado: 'descartado', responsable: 'Médico consultor · Dra. Sáez', abierto: '2026-09-05T15:30:00', cierre: '2026-09-08T10:00:00', nota: 'Lesión nueva, sin relación con la patología previa.' },
  ],

  // Evolución diaria (mismas fechas y mensajes que `diario` del panel):
  // [fecha, mensajes analizados, con indicios (≥ 40), escalados a la SIU, consultas al fichero sectorial, importe retenido €]
  diario: [
    ['2026-09-04', 1180, 31, 5, 142, 3100], ['2026-09-05', 1260, 34, 6, 151, 2860], ['2026-09-06', 610, 15, 2, 73, 950], ['2026-09-07', 540, 13, 1, 65, 610],
    ['2026-09-08', 1390, 38, 7, 167, 3420], ['2026-09-09', 1450, 37, 6, 174, 3050], ['2026-09-10', 1420, 39, 7, 170, 2980], ['2026-09-11', 1510, 42, 8, 181, 4120],
    ['2026-09-12', 1480, 40, 7, 178, 3610], ['2026-09-13', 690, 17, 2, 83, 1180], ['2026-09-14', 720, 19, 3, 86, 1240], ['2026-09-15', 1610, 44, 9, 193, 4380],
    ['2026-09-16', 1720, 48, 11, 206, 4910], ['2026-09-17', 1140, 29, 6, 168, 2080],
  ],
  // Equidad por canal (14 días): alertas con indicios por cada 100 mensajes y confirmación de la SIU
  canales: [
    { canal: 'email', alertas: 2.4, confirmadas: 0.31 }, { canal: 'web', alertas: 2.6, confirmadas: 0.34 }, { canal: 'chat', alertas: 2.2, confirmadas: 0.3 },
    { canal: 'telefono', alertas: 2.0, confirmadas: 0.33 }, { canal: 'whatsapp', alertas: 4.1, confirmadas: 0.16, nota: 'IF-09 (urgencia) dispara 2,1 veces más por el tono del canal; la confirmación es la mitad (M-18)' },
  ],
};
if (typeof GOBIERNO_DEMO !== 'undefined') GOBIERNO_DEMO.fraude = FRAUDE_DEMO;
