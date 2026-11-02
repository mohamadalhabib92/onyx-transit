/**
 * Reprend app.json. Le baseUrl « /onyx-transit » reste pour le web.
 * Un build EAS (EAS_BUILD défini) ne l’embarque pas : il est réservé au site.
 */
const appJson = require('./app.json');

module.exports = () => {
  const expo = JSON.parse(JSON.stringify(appJson.expo));
  if (process.env.EAS_BUILD !== undefined) {
    if (expo.experiments) delete expo.experiments.baseUrl;
  }
  return { expo };
};
