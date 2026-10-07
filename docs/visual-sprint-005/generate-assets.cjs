// QA/build helper only. sharp is supplied by the external development runtime.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const dir = path.join(__dirname, "assets");
const source = fs.readFileSync(path.join(dir, "symbol.svg"), "utf8");
const inverse = source.replaceAll("#0B3D2E", "__PRIMARY__")
  .replaceAll("#FFFFFF", "#0B3D2E").replaceAll("__PRIMARY__", "#FFFFFF");

function nested(svg, x, y, size) {
  return svg.replace('<svg xmlns=', `<svg x="${x}" y="${y}" width="${size}" height="${size}" xmlns=`);
}

function wordmark(dark) {
  const text = dark ? "#FFFFFF" : "#1F2937";
  const accent = dark ? "#22C55E" : "#166534";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 200" role="img" aria-labelledby="logo-title">
  <title id="logo-title">Plataforma da Pecuária — dados que impulsionam o agro</title>
  ${nested(dark ? inverse : source, 4, 10, 180)}
  <g font-family="Montserrat, system-ui, -apple-system, 'Segoe UI', sans-serif" fill="${text}" font-weight="700">
    <text x="204" y="87" font-size="54">Plataforma</text>
    <text x="204" y="145" font-size="54"><tspan fill="${accent}">da</tspan> Pecuária</text>
    <text x="207" y="179" font-size="14" font-weight="400">DADOS QUE IMPULSIONAM O AGRO</text>
  </g>
</svg>`;
}

async function main() {
  fs.writeFileSync(path.join(dir, "symbol-inverse.svg"), inverse);
  fs.writeFileSync(path.join(dir, "logo-horizontal.svg"), wordmark(false));
  fs.writeFileSync(path.join(dir, "logo-horizontal-inverse.svg"), wordmark(true));
  for (const size of [180, 192, 512]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#0B3D2E" d="M0 0H512V512H0Z"/>${nested(inverse, 56, 56, 400)}</svg>`;
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(dir, `icon-${size}.png`));
  }
  const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#0B3D2E" d="M0 0H512V512H0Z"/>${nested(inverse, 112, 112, 288)}</svg>`;
  await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile(path.join(dir, "icon-maskable-512.png"));
  await sharp(Buffer.from(source)).resize(32, 32).png().toFile(path.join(dir, "favicon-32.png"));
  console.log("Generated 3 SVG variants and 5 PNG files in checkpoint assets only.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
