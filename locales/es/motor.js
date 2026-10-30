// Expresiones que leen el texto de los mensajes en español (idioma base). Cada módulo toma las suyas con
// I18N.motor('<módulo>'). Otro idioma define las mismas claves en locales/<idioma>/motor.js; la lógica no cambia.
// tests/motores-idioma.test.js comprueba que, con su idioma, cada mensaje da el mismo resultado que en español.
const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

I18N.registrarMotor('es', {
  // Fechas escritas con nombres de días y meses (fechas.js). Cada forma recibe las alternativas de días y meses
  // y devuelve la expresión con sus grupos: diaMes (día de la semana, día, mes, año), semanaDia (día de la
  // semana, día), diaSuelto (palabra, día) y mesAnio (mes, año). Los fmt* escriben la fecha ya desplazada `f`
  // ({ a, m, d, s }: año, mes 1-12, día y día de la semana 0-6).
  fechas: {
    dias: DIAS_ES,
    meses: MESES_ES,
    diaMes: (SEM, MES) => `(?:(${SEM})\\s+)?(\\d{1,2}) de (${MES})(?: de (\\d{4}))?`,
    semanaDia: (SEM) => `(${SEM})\\s+(\\d{1,2})(?![\\d/]| de )`,
    diaSuelto: () => /\b(día) (\d{1,2})(?!\d| de | o \d)/.source,
    mesAnio: (SEM, MES) => `\\b(${MES}) de (20\\d\\d)`,
    fmtDiaMes: (f, conSemana, conAnio) => `${conSemana ? `${DIAS_ES[f.s]} ` : ''}${f.d} de ${MESES_ES[f.m - 1]}${conAnio ? ` de ${f.a}` : ''}`,
    fmtSemanaDia: (f) => `${DIAS_ES[f.s]} ${f.d}`,
    fmtDiaSuelto: (f, palabra) => `${palabra} ${f.d}`,
    fmtMesAnio: (f) => `${MESES_ES[f.m - 1]} de ${f.a}`,
  },
  // Datos personales (cumplimiento.js): lo que depende del idioma. direccion y salud son listas de expresiones /g;
  // nombreTercero recibe el patrón de un nombre propio y devuelve la expresión con el nombre en el grupo 1; menor son
  // pares [expresión /g, filtro opcional del resultado]. indicios: palabras que apuntan a cada ramo (/gi).
  cumplimiento: {
    direccion: [
      /\b(?:C\/|[Cc]alle|[Aa]venida|[Pp]laza)\s[A-ZÁÉÍÓÚ][\wÁÉÍÓÚáéíóúñ ]{1,30}?\s\d{1,3}(?:,\s*\d{1,2}\.º\s?[A-Z])?(?:,?\s*\d{5})?(?:,?\s+Madrid)?/g,
      /\bn\.º\s\d{1,3}\sde\sla\scalle\s[A-ZÁÉÍÓÚ][\wáéíóúñ]+(?:\s[A-ZÁÉÍÓÚ][\wáéíóúñ]+)*/g,
    ],
    nombreTercero: (NOMBRE) => new RegExp(`\\b(?:mi (?:hijo|hija|marido|mujer|esposa?|padre|madre)|[Ee]l vecino|el otro conductor es|\\bDra?\\.)(?:,)?\\s(${NOMBRE})`, 'g'),
    menor: [
      [/\b[Ll]os niños del vecino\b/g],
      [/\((\d{1,2}) años\)/g, (m) => Number(m[1]) < 18],
    ],
    salud: [
      /\bfractura de [a-záéíóúñ]+(?: y (?:dos |tres )?[a-záéíóúñ]+)?/gi,
      /\besguince(?: de grado [IV]+)?/gi,
      /\bcrisis de asma\b/gi, /\basmátic[oa] desde [a-záéíóúñ]+\b/gi, /\bes diabétic[oa]\b/gi,
      /\bdolor lumbar\b/gi, /\blumbalgia(?: con ciática)?/gi, /\bdolor de oído\b/gi, /\botitis\b/gi,
      /\bradiografía(?: de (?:columna )?[a-záéíóúñ]+(?: lumbar)?| del [a-záéíóúñ]+)?/gi,
      /\b(?:analítica completa|gasometría|nebulizaciones|corticoides(?: orales)?|ibuprofeno|antiinflamatorio|inhalador|férula)\b/gi,
      /\ble tienen que operar(?: la [a-záéíóúñ]+)?/gi,
      /\bingresad[oa]\b/gi,
      /\burgencias(?: pediátricas)?\b/gi,
      /\bme he torcido el tobillo(?: derecho| izquierdo)?/gi,
      /\bse ha hecho daño en el brazo(?: izquierdo| derecho)?/gi,
    ],
    indicios: {
      Auto: /\b(?:coche|moto|veh[ií]culo|matr[ií]cula|parking|taller|parte amistoso|parabrisas|conductor|rotonda|autov[ií]a|AU-\d{6})\b/gi,
      Hogar: /\b(?:casa|vivienda|cocina|sal[oó]n|ventana|cristal|tarima|fregadero|televisor|urbanizaci[oó]n|cajones|HO-\d{6})\b/gi,
      Salud: /\b(?:urgencias|hospital|m[eé]dico|radiograf[ií]a|traumat[oó]log[oa]|cuadro m[eé]dico|pediatra|fractura|asma|SA-\d{6})\b/gi,
    },
  },
  // Antifraude (fraude.js). relato: frases que activan cada indicador (/g); conductorJoven: parentesco, nombre y edad
  // en los grupos 1-3; noDeclarado: el tomador no sabe si lo declaró; acusatorio: términos que nunca llegan al cliente.
  fraude: {
    relato: {
      'IF-01': /\b(?:lo |la )?contrat(?:amos|é|e|ó)[^.]{0,30}?hace (?:solo |sólo |apenas )?(?:\d+|un[ao]?|dos|tres|cuatro) (?:d[ií]as|semanas?)\b/gi,
      'IF-06': /\b(?:ya me pas[óo]|otra vez|de nuevo|igual que la [úu]ltima vez)[^.!?\p{Extended_Pictographic}]{0,70}/giu,
      'IF-07': /\b(?:todav[ií]a no s[ée] cu[áa]nto|no estoy segur[oa]|no s[ée] por d[óo]nde)\b/gi,
      'IF-08': /\b(?:todav[ií]a no hemos ido a la polic[ií]a|no hemos (?:puesto|presentado) denuncia|no est[áa] forzada|la puerta parece bien|las c[áa]maras no enfocan[^.]{0,20}|sin testigos)/gi,
      'IF-09': /\b(?:necesito que venga alguien hoy|que venga alguien hoy|puedo ir al m[íi]o|mi taller de confianza|el taller de al lado de casa)/gi,
      'IF-10': /\b(?:(?:las )?joyas valdr[áa]n unos [\d.]+ ?€|no tenemos facturas|sin facturas?|eran heredadas)/gi,
    },
    conductorJoven: /\bmi (hij[oa]|sobrin[oa]|nieto|nieta) (\p{Lu}\p{Ll}+)[^.]{0,12}\((?:tiene )?(\d{2}) a[ñn]os\)/u,
    noDeclarado: /no s[ée] si lo (?:incluimos|declaramos|pusimos)|no est[áa] declarad[oa]/i,
    acusatorio: /\b(fraude|fraudulent\w*|sospech\w*|SIU|indicio\w*|investigaci[óo]n)\b/i,
  },
  // Evidencias de respaldo (evidencias.js): fragmentos del mensaje que se resaltan cuando el modelo cita poco o no
  // hay modelo. fecha se prueba en orden; importe y docs llevan /g.
  evidencias: {
    fecha: [
      /\b(?:(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+)?\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+\d{4})?\b/i,
      /\b(?:el\s+)?(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+\d{1,2}\b/i,
      /\b(?:ayer|anoche|hoy)\s+\d{1,2}\/\d{1,2}\b/i,
      /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/,
      /\b(?:ayer|anoche|hoy|este\s+finde|el\s+pasado\s+d[ií]a\s+\d{1,2}|esta\s+(?:ma[ñn]ana|tarde|noche)|ahora\s+mismo|hace\s+\w+\s+(?:d[ií]as?|semanas?))\b/i,
    ],
    importe: /(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)\s?(?:€|euros?)/gi,
    hora: /\b(?:sobre|hacia|a)\s+las\s+\d{1,2}(?::\d{2})?\s*(?:h\b)?/i,
    // «Calle Mayor de Alcalá» → «Alcalá»: lo que va antes del nombre propio del lugar
    antesDelLugar: /^.*?\b(?:de|del|en)\s+(?=[A-ZÁÉÍÓÚ])/,
    lesion: /\b(?:fractura de [a-záéíóúñ]+(?: y [^,.;]{1,20})?|esguince(?: de grado [IV]+)?|herid[oa]s? (?:leve|grave)s?|ingresad[oa]\b|contusi[oó]n[^,.;]{0,20}|\d+ puntos)/i,
    sinLesion: /\b(?:no hubo heridos|nadie (?:se ha hecho|ha resultado) (?:da[ñn]o|herido)|sin heridos|nadie herido)\b/i,
    docs: /\b(parte amistoso|atestado|denuncia|facturas?|presupuesto|informe(?: de [a-záéíóúñ]+)?|fotos?|tarjeta(?: sanitaria)?(?: [\d ]{9,})?|prescripci[oó]n|volante)\b/gi,
    // Solo para el motor local, que no cita: el fragmento que justifica cada regla incumplida
    reglas: {
      A3: /mi\s+(?:hijo|hija|sobrin\w+|amig\w+|novi\w+|cu[ñn]ad\w+)[^.]{0,60}?\b(?:cogi[oó]|conduc\w+|llevaba)(?!\w)/i,
      A4: /\b(?:cervez\w+|alcohol|copas|drog\w+|sin carn[eé]|sin permiso)\b/i,
      A5: /\b(?:herid\w+|lesion\w+|fractura[^,.;]*|ingresad\w+|ambulancia)\b/i,
      A6: /(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)\s?(?:€|euros?)/i,
      H2: /\b(?:desde hace [^.,]*|hace (?:unos|varios|un par de) (?:meses|semanas))\b/i,
      H3: /\b(?:humedad\w*|filtraci\w+|condensaci\w+|silicona|junta)\b/i,
      H4: /\b(?:se han llevado[^.,;]*|rob(?!les)\w+|sustra\w+|han entrado en casa)\b/i,
      H5: /\b(?:cristal\w*|mampara|vitrocer[aá]mica|sobretensi[oó]n|subida de tensi[oó]n)\b/i,
      H9: /(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)\s?(?:€|euros?)/i,
      S2: /\b(?:oper\w+|cirug[ií]a|hospitaliz\w+|ingres\w+)\b/i,
      S3: /\b(?:arrastraba|ya ten[ií]a|desde hace (?:a[ñn]os|un par de a[ñn]os))\b/i,
      S4: /\b(?:me operaron|ya me han operado|adjunto la factura|\d+\s+sesiones)\b/i,
      S5: /\b(?:fuera del cuadro|no est[aá] en (?:vuestro|el) cuadro|cl[ií]nica privada|cuadro m[eé]dico)\b/i,
      S7: /\breembols(?:\w|[áéíóú])+/i,
      S8: /\b(?:laboral|en el trabajo|mutua|accidente de tr[aá]fico)\b/i,
    },
  },
  // Motor local de reglas (motor-local.js)
  local: {
    ramo: {
      Auto: /\b(coche|veh[ií]culo|moto|parabrisas|luna|taller|parking|aparc\w*|retrovisor|chapa|paragolpes|conductor\w*|carretera|rotonda|sem[aá]foro|granizo.*(cap[oó]|techo)|\d{4} [A-Z]{3}|AU-\d{6})\b/gi,
      Hogar: /\b(vivienda|casa|cocina|ba[ñn]o|sal[oó]n|dormitorio|tuber[ií]a|latiguillo|fontanero|ventana|mampara|vitrocer[aá]mica|caldera|cerradura|humedad\w*|chalet|garaje|tarima|suelo|vecino|electrodom[eé]stico\w*|frigor[ií]fico|televisor|HO-\d{6})\b/gi,
      Salud: /\b(urgencias|hospital|m[eé]dic\w+|cl[ií]nica|cuadro m[eé]dico|radiograf[ií]a|anal[ií]tica|ecograf[ií]a|fisioterapia|rehabilitaci[oó]n|cirug[ií]a|oper\w+|reembols\w+|p[oó]liza familiar|traumat[oó]logo|ginec[oó]log\w+|f[ée]rula|puntos|antibi[oó]tico|SA-\d{6})\b/gi,
    },
    // «12 de septiembre»: día y número de mes
    fechaDiaMes: /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i,
    dia: (m) => m[1],
    mes: (m) => MESES_ES.indexOf(m[2].toLowerCase()) + 1,
    haceN: /\bhace\s+(\d+|un|una|dos|tres|cuatro|cinco|seis)\s+(d[ií]as?|semanas?)\b/i,
    numeros: { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 },
    semana: /semana/i,
    ayer: /\b(ayer|anoche)\b/i,
    hoy: /\b(hoy|esta (ma[ñn]ana|tarde|noche)|acabo de|ahora mismo)\b/i,
    importe: /(\d{1,3}(?:\.\d{3})+|\d+)\s?€/g,
    importeNumero: (x) => Number(x[1].replace(/\./g, '')),
    negacionLesion: /\b(no hubo|no hay|sin|nadie|ning[uú]n[ao]?)\s+(\w+\s+)?(herid\w+|lesion\w+)\b/gi,
    docs: /\b(fotos?|parte amistoso|denuncia|facturas?|presupuesto|informe|atestado|volante|prescripci[oó]n)\b/gi,
    terceros: /\b(otro (coche|conductor|veh[ií]culo)|otra conductora|un coche (me|se)|vecino de arriba)\b/i,
    lesionados: /\b(herid\w+|lesion\w+|ambulancia|ingresad\w+|fractura|costillas|clav[ií]cula|da[ñn]o en el cuello)\b/i,
    reglas: {
      A3: /\b(mi (hijo|hija|sobrin\w|amig\w|novi\w|cu[ñn]ad\w))\b[^.]*\b(cogi[oó]|conduc\w+|llevaba|sali[oó])(?!\w)/i,
      A4: /\b(cervez\w+|alcohol|copas|bebid\w+|drog\w+|sin carn[eé]|sin permiso)\b/i,
      A5documento: /parte amistoso|atestado|denuncia/i,
      H2: /\b(desde hace|hace (unos|varios|un par de) (meses|semanas))\b/i,
      H3filtracion: /\b(humedad\w*|filtraci\w+|condensaci\w+|silicona|junta)\b/i,
      H3agua: /\b(agua|tuber[ií]a|fuga|latiguillo|gotera)\b/i,
      H4robo: /\b(rob(?!les)\w+|sustra\w+|se han llevado|faltaban)\b/i,
      H4sinFuerza: /\b(sin marcas|sin (signos|se[ñn]ales)|no sab\w+ c[oó]mo|entornad\w|abierta)\b/i,
      H4joyas: /\b(joya\w*|anillo\w*|collar|reloj)\b/i,
      H4denuncia: /denuncia/i,
      H5: /\b(cristal\w*|mampara|vitrocer[aá]mica|sobretensi[oó]n|subida de tensi[oó]n)\b/i,
      S2contratacion: /\bcontrat[ée][^.]*\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de 20\d\d\b/i,
      S2cirugia: /\b(oper\w+|cirug[ií]a|hospitaliz\w+|ingres\w+)\b/i,
      S3: /\b(arrastraba|desde hace (a[ñn]os|un par de a[ñn]os)|ya ten[ií]a)\b/i,
      S4sesiones: /(\d+)\s+sesiones/i,
      S4realizada: /\b(me operaron|ya me han operado|adjunto la factura)\b/i,
      S4cirugia: /\b(oper\w+|cirug[ií]a)\b/i,
      S5fuera: /\b(fuera del cuadro|no est[aá] en (vuestro|el) cuadro|cl[ií]nica privada)\b/i,
      S5cuadro: /\bcuadro\b/i,
      S7: /reembols/i,
      S8: /\b(laboral|en el trabajo|almac[eé]n de mi empresa|mutua|accidente de tr[aá]fico)\b/i,
    },
  },
});
