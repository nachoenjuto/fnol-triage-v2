// Idiomas en Node (pruebas y scripts): deja `I18N` global con los textos del idioma pedido y los del idioma base
// para lo que falte, igual que locales/cargar.js en el navegador.
//   require('../locales/node.js')();       // idioma base
//   require('../locales/node.js')('en');
const fs = require('fs');
const path = require('path');
const I18N = require('./i18n.js');

module.exports = function cargarIdioma(idioma = I18N.BASE) {
  const idiomas = idioma === I18N.BASE ? [I18N.BASE] : [I18N.BASE, idioma];
  for (const i of idiomas) {
    for (const f of I18N.FICHEROS) {
      const ruta = path.join(__dirname, i, f);
      if (fs.existsSync(ruta)) new Function('I18N', fs.readFileSync(ruta, 'utf8'))(I18N);
    }
  }
  I18N.usar(idioma);
  return I18N;
};
