import { readFileSync, existsSync, mkdirSync } from 'fs';
import { parse, resolve } from 'path';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';

try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = parse(__filename).dir;

  const { base } = parse(__dirname);
  const { version } = JSON.parse(
    readFileSync(resolve(__dirname, 'build', 'manifest.json'), 'utf8')
  );

  const outdir = 'release';
  const filename = `${base}-v${version}.zip`;
  const zip = new AdmZip();
  zip.addLocalFolder('build');
  if (!existsSync(outdir)) {
    mkdirSync(outdir);
  }
  zip.writeZip(`${outdir}/${filename}`);

  console.log(
    `Success! Created a ${filename} file under ${outdir} directory. You can upload this file to web store.`
  );
} catch (e) {
  console.error('Error! Failed to generate a zip file.');
  console.error(e);
}