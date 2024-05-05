import fs from 'node:fs';
import tmp from 'tmp';
import zlib from 'node:zlib';


export function gunzipToFile( inputFilePath ) {
  return new Promise((resolve, reject) => {
    tmp.file((err, tempFilePath, fd, cleanupCallback) => {
      if (err) {
        log( err );
        reject(err);
        return;
      }

      const readStream = fs.createReadStream( inputFilePath );
      const writeStream = fs.createWriteStream( tempFilePath );
      const gunzip = zlib.createGunzip();

      readStream.pipe( gunzip ).pipe( writeStream ).on('finish', () => {
        resolve(tempFilePath);
      }).on('error', reject);
    });
  });
}