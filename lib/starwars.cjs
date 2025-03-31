const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/[map]/topojson/starwars.json');
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  let topojson;
  try {
    topojson = JSON.parse(data);
  } catch (parseErr) {
    console.error('Error parsing JSON:', parseErr);
    return;
  }

  // TERRITORY
  // give type sector and a name
  topojson.objects.territory.geometries.forEach(({ properties }) => {
    properties.type = 'sector';
  });

  topojson.objects.territory.geometries.forEach(({ properties }) => {
    if (properties.sector) {
      properties.name = properties.sector;
    }
  })

  // GUIDES
  // give type hyperspace and a name
  topojson.objects.guide.geometries.forEach(({ properties }) => {
    properties.type = 'hyperspace'
  })
  topojson.objects.guide.geometries.forEach(({ properties }) => {
    if (properties.hyperspace) {
      properties.name = properties.hyperspace
    } else {
      properties.name = `lane ${properties.hid ? properties.hid : '0'} ${properties.cartodb_id ? properties.cartodb_id : '0'}`

    }
  })

  // LOCATION
  // give type hyperspace and a name
  topojson.objects.location.geometries.forEach(({ properties }) => {
    if (!properties.type) {
      properties.type = 'terrestrial'
    }
  })
  // bro, if it doesn't even have a name why bother, just delete it
  topojson.objects.location.geometries = topojson.objects.location.geometries.filter(({ properties }) => properties.name);
  // topojson.objects.location.geometries.forEach(({ properties }) => {
  //   if (!properties.name) {
  //     // TODO: should delete
  //   }
  // });



  // write
  fs.writeFile(filePath, JSON.stringify(topojson, null, 2), 'utf8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing the file:', writeErr);
    } else {
      console.log('File successfully updated.');
    }
  });
});
