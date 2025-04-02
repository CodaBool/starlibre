import spritezero from '@elastic/spritezero';
import fs from 'fs';
import glob from 'glob';
import path from 'path';


[1].forEach(function (pxRatio) {

  var svgs = glob.sync(path.resolve(path.join(process.cwd(), '../public/svg/default/*.svg')))
    .map(function (f) {
      return {
        svg: fs.readFileSync(f),
        id: path.basename(f).replace('.svg', '')
      };
    })

  console.log("svgs", svgs)
  var pngPath = path.resolve(path.join(process.cwd(), 'output/sprite@' + pxRatio + '.png'));
  console.log("pngPath", pngPath)

  // Pass `true` in the layout parameter to generate a data layout
  // suitable for exporting to a JSON sprite manifest file.
  spritezero.generateLayout({ imgs: svgs, pixelRatio: pxRatio, sdf: true, format: true }, function (err, dataLayout) {
    if (err) return;
    fs.writeFileSync(jsonPath, JSON.stringify(dataLayout));
  })


  // Pass `false` in the layout parameter to generate an image layout
  // suitable for exporting to a PNG sprite image file.
  spritezero.generateLayout({ imgs: svgs, pixelRatio: pxRatio, sdf: true, format: false }, function (err, imageLayout) {
    spritezero.generateImage(imageLayout, function (err, image) {
      if (err) return;
      fs.writeFileSync(pngPath, image);
    });
  });

});
