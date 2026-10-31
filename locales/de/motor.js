// Ausdrücke, die den Text der Meldungen auf Deutsch lesen. Gleiche Schlüssel wie locales/es/motor.js; die Logik
// ändert sich nicht. tests/motores-idioma.test.js prüft, dass jede Meldung dasselbe Ergebnis wie auf Spanisch liefert.
const TAGE_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONATE_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MON = MONATE_DE.join('|');

I18N.registrarMotor('de', {
  // «Samstag, 12. September», «Donnerstag, dem 10.», «am 8.», «Juli 2026»
  fechas: {
    dias: TAGE_DE,
    meses: MONATE_DE,
    diaMes: (SEM, MES) => `(?:(${SEM}),?\\s+)?(\\d{1,2})\\.\\s+(${MES})(?:\\s+(\\d{4}))?`,
    semanaDia: (SEM) => `(${SEM}),?\\s+(?:dem\\s+)?(\\d{1,2})\\.(?![\\d/]|\\s+(?:${MON})\\b)`,
    diaSuelto: () => /\b(am) (\d{1,2})\.(?![\d/]|\s+(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b)/.source,
    mesAnio: (SEM, MES) => `\\b(${MES}) (20\\d\\d)`,
    fmtDiaMes: (f, conSemana, conAnio) => `${conSemana ? `${TAGE_DE[f.s]}, ` : ''}${f.d}. ${MONATE_DE[f.m - 1]}${conAnio ? ` ${f.a}` : ''}`,
    // behält die Schreibweise bei: «Donnerstag, dem 10.» oder «Donnerstag, 10.»
    fmtSemanaDia: (f, original) => `${TAGE_DE[f.s]}, ${/\sdem\s/.test(original) ? 'dem ' : ''}${f.d}.`,
    fmtDiaSuelto: (f, palabra) => `${palabra} ${f.d}.`,
    fmtMesAnio: (f) => `${MONATE_DE[f.m - 1]} ${f.a}`,
  },
  local: {
    ramo: {
      Auto: /\b(Autos?|Fahrzeug\w*|Motorrad|Windschutzscheibe|Werkstatt|Parkplatz|Parkhaus|Tiefgarage|geparkt|Außenspiegel|Karosserie|Stoßstange|Fahrer\w*|Kreisverkehr|Ampel|Hagel\w*|\d{4} [A-Z]{3}|AU-\d{6})\b/gi,
      Hogar: /\b(Wohnung|Hauses?|Küche\w*|Bad\w*|Wohnzimmer|Schlafzimmer|Rohr|Schlauch|Installateur|Fenster\w*|Duschwand|Ceranfeld\w*|Heizkessel\w*|Schloss|Feuchtigkeit|Einfamilienhaus|Garagentür|Parkett|Boden|Nachbar\w*|Elektrogeräte|Kühlschrank|Fernseher|HO-\d{6})\b/gi,
      Salud: /\b(Notaufnahme|Kindernotaufnahme|Krankenhaus\w*|Hospital|Hausarzt|Arzt|Unfallarzt|Kinderarzt|Klinik|Vertragsnetzwerk|Röntgen\w*|geröntgt|Blutuntersuchung|Ultraschall|Physiotherapie\w*|Reha|Operation|operiert|Erstattung\w*|erstatten|Familienpolice|Gynäkolog\w+|Schiene|Stichen|Antibiotika|SA-\d{6})\b/gi,
    },
    // «12. September»: Tag und Monatsnummer
    fechaDiaMes: new RegExp(`\\b(\\d{1,2})\\.\\s+(${MON})\\b`, 'i'),
    dia: (m) => m[1],
    mes: (m) => MONATE_DE.findIndex((x) => x.toLowerCase() === m[2].toLowerCase()) + 1,
    haceN: /(?<!erst )\bvor\s+(\d+|einem|einer|zwei|drei|vier|fünf|sechs)\s+(Tag(?:en)?|Wochen?)\b/i,
    numeros: { einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6 },
    semana: /Woche/i,
    ayer: /\b(gestern)\b/i,
    hoy: /\b(heute|gerade|soeben)\b/i,
    importe: /(\d{1,3}(?:\.\d{3})+|\d+)\s?€/g,
    importeNumero: (x) => Number(x[1].replace(/\./g, '')),
    negacionLesion: /\b(niemand|keine)\s+(\w+\s+)?(verletzt\w*|Verletzte\w*)\b/gi,
    docs: /\b(Fotos?|Unfallbericht|Störungsbericht|(?<!keinen )Bericht|Anzeige|Polizeiprotokoll|Protokoll|Rechnung\w*|Kostenvoranschlag|Verordnung)\b|Überweisung/gi,
    terceros: /\b(andere[nr]? Fahrer|andere Fahrerin|anderes Fahrzeug|anderes Auto|ein Auto|Nachbar oben)\b/i,
    lesionados: /\b(Verletzte\w*|Krankenwagen|liegt im|gebrochen\w*|Handgelenkbruch|Rippen|Schlüsselbein|Nacken)\b/i,
    reglas: {
      A3: /\bmein(?:e)? (Sohn|Tochter|Neffe|Nichte|Freund|Freundin|Schwager|Schwägerin)\b[^.]*\b(genommen|gefahren|fuhr|nahm)\b/i,
      A4: /\b(Bier\w*|Alkohol\w*|getrunken|betrunken|Drogen|ohne Führerschein)\b/i,
      A5documento: /Unfallbericht|Polizeiprotokoll|Protokoll|Anzeige/i,
      H2: /\b(seit (ein paar|einigen|mehreren) (Monaten|Wochen)|vor (ein paar|einigen|mehreren) (Monaten|Wochen))\b/i,
      H3filtracion: /\b(Feuchtigkeit|feucht\w*|Durchfeuchtung|Kondens\w*|Silikon|Fuge)\b/i,
      H3agua: /\b(Wasser|Rohr|Schlauch|tropft|undicht)\b/i,
      H4robo: /\b(gestohlen|Diebstahl|Einbruch\w*|eingebrochen|mitgenommen|fehlte|fehlen)\b/i,
      H4sinFuerza: /\b(keine Spuren|keine Einbruchspuren|nicht aufgebrochen|wissen nicht, wie|weiß nicht, wie|angelehnt|offen gelassen)\b/i,
      H4joyas: /\b(Schmuck|Ringe?|Kette|Uhr)\b/i,
      H4denuncia: /Anzeige/i,
      H5: /\b(Glas\w*|Scheibe|Duschwand|Ceranfeld\w*)\b|Überspannung/i,
      S2contratacion: new RegExp(`\\b(${MON}) 20\\d\\d abgeschlossen\\b`, 'i'),
      S2cirugia: /\b(operier\w*|Operation|Krankenhausaufenthalt|stationär)\b/i,
      S3: /\b(mit mir herumgeschleppt|hatte schon|seit ein paar Jahren)\b/i,
      S4sesiones: /(\d+)\s+(?:Physiotherapie-)?Sitzungen/i,
      S4realizada: /\b(wurde ich [^.]*operiert|bin schon operiert|hänge die Rechnung)\b/i,
      S4cirugia: /\b(operier\w*|Operation|lasern)\b/i,
      S5fuera: /\b(nicht in Ihrem Netzwerk|Privatklinik)\b|außerhalb des Netzwerks/i,
      S5cuadro: /Netzwerk/i,
      S7: /erstatt/i,
      S8: /\b(Arbeitsunfall|bei der Arbeit|Lager meiner Firma|Berufsgenossenschaft|Verkehrsunfall)\b/i,
    },
  },
});
