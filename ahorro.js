// Escenario de negocio de FinOps: coste operativo evitado por los mensajes que el sistema resuelve solo.
// Parte de dos datos medidos (mensajes procesados y autonomía efectiva) y del coste de la IA, y de unas
// hipótesis editables sobre lo que cuesta tramitar un mensaje FNOL a mano (salario, horas, minutos por mensaje).
// Lógica pura (sin DOM), compartida por gobierno.html (KPI «Ahorro estimado» de FinOps) y Node (tests/ahorro.test.js).
(function (root) {
  'use strict';

  // Valores por defecto si el dataset no trae `kpis.negocio`
  const DEFECTO = {
    salario_bruto: 28000, // € brutos al año de un tramitador de siniestros (convenio de seguros)
    factor_ss: 1.32, // coste empresa = bruto × (1 + Seguridad Social a cargo de la empresa)
    estructura: 0.15, // puesto, licencias y supervisión sobre el coste empresa
    horas_convenio: 1700, // horas anuales de jornada
    productividad: 0.8, // parte de la jornada dedicada a tramitar
    minutos_mensaje: 8, // leer, clasificar, extraer datos, comprobar cobertura, abrir expediente y derivar
    ahorro_escalados: 0.4, // parte del tiempo que se ahorra en un escalado: el tramitador recibe los datos ya extraídos
  };

  const ESCENARIOS = [
    { id: 'conservador', nombre: I18N.t('ahorro.conservador'), minutos_mensaje: 6 },
    { id: 'base', nombre: I18N.t('ahorro.base'), minutos_mensaje: 8 },
    { id: 'optimista', nombre: I18N.t('ahorro.optimista'), minutos_mensaje: 12 },
  ];

  // Coste de tramitar un mensaje a mano a partir de las hipótesis
  function costeManual(p) {
    const q = { ...DEFECTO, ...p };
    const costeEmpresa = q.salario_bruto * q.factor_ss;
    const costeTotal = costeEmpresa * (1 + q.estructura);
    const horas = q.horas_convenio * q.productividad;
    const hora = horas ? costeTotal / horas : 0;
    return { costeEmpresa, costeTotal, horas, hora, mensaje: (hora / 60) * q.minutos_mensaje };
  }

  // datos: { mensajes, autonomia (0–100), costeIA, dias }
  function calcular(datos, p) {
    const q = { ...DEFECTO, ...p };
    const c = costeManual(q);
    const mensajes = datos.mensajes || 0, costeIA = datos.costeIA || 0, dias = datos.dias || 1;
    const automatizados = Math.round(mensajes * (datos.autonomia || 0) / 100);
    const escalados = mensajes - automatizados;
    const evitadoAut = automatizados * c.mensaje;
    const evitadoEsc = escalados * c.mensaje * q.ahorro_escalados;
    const bruto = evitadoAut + evitadoEsc;
    const neto = bruto - costeIA;
    return {
      ...c, mensajes, automatizados, escalados, evitadoAut, evitadoEsc, bruto, costeIA, neto,
      anual: (neto / dias) * 365,
      retorno: costeIA ? bruto / costeIA : 0,
      costeIAMensaje: mensajes ? costeIA / mensajes : 0,
    };
  }

  const API = { calcular, costeManual, DEFECTO, ESCENARIOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Ahorro = API;
})(typeof window !== 'undefined' ? window : globalThis);
