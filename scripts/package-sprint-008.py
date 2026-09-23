"""Generate portable audit artifacts using read-only Git operations."""
from pathlib import Path
import hashlib
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
DIFF = "docs/SPRINT_008_ENTREGA.diff"
ZIP = "sprint_008_entrega.zip"
INVENTORY = "docs/SPRINT_008_ARQUIVOS.txt"
QA = ROOT / "docs/qa-sprint-008"


def git(*args, allowed=(0,)):
    result = subprocess.run(["git", *args], cwd=ROOT, capture_output=True)
    if result.returncode not in allowed:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace"))
    return result.stdout


QA.mkdir(parents=True, exist_ok=True)
tests = subprocess.run(["node", "--test", "--test-reporter=tap", *[str(p) for p in sorted((ROOT / "tests").glob("*.test.js"))]], cwd=ROOT, capture_output=True)
(QA / "tests.txt").write_bytes(tests.stdout + tests.stderr)
if tests.returncode:
    raise RuntimeError("Tests failed; artifacts not generated")
sources = [ROOT / "app.js", ROOT / "sw.js", *sorted((ROOT / "src").glob("*.js")), *sorted((ROOT / "scripts").glob("*.cjs"))]
for source in sources:
    subprocess.run(["node", "--check", str(source)], cwd=ROOT, check=True, capture_output=True)
(QA / "syntax.txt").write_text(f"node --check: {len(sources)} files, 0 errors\n", encoding="utf-8")
excluded = {DIFF, ZIP, INVENTORY}
modified = git("diff", "--name-only", "-z", "HEAD").decode().strip("\0").split("\0")
created = git("ls-files", "--others", "--exclude-standard", "-z").decode().strip("\0").split("\0")
modified = sorted(p for p in modified if p and p not in excluded)
created = sorted(p for p in created if p and p not in excluded)
inventory = "SPRINT 008 - Inventario\n\nMODIFICADOS\n" + "\n".join(modified) + "\n\nCRIADOS\n" + "\n".join(created + [INVENTORY]) + "\n\nREMOVIDOS\nNenhum\n\nARTEFATOS DE AUDITORIA (nao incluir em commit)\n" + DIFF + "\n" + ZIP + "\n"
(ROOT / INVENTORY).write_text(inventory, encoding="utf-8")
diff = git("diff", "--binary", "--no-textconv", "--no-ext-diff", "--no-color", "HEAD")
for name in sorted(created + [INVENTORY]):
    diff += git("diff", "--no-index", "--binary", "--no-textconv", "--no-ext-diff", "--no-color", "--", "/dev/null", name, allowed=(0, 1))
(ROOT / DIFF).write_bytes(diff)
git("apply", "--reverse", "--check", DIFF)
files = git("ls-files", "--cached", "--others", "--exclude-standard", "-z").decode().strip("\0").split("\0")
with zipfile.ZipFile(ROOT / ZIP, "w", zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(set(files)):
        if name != ZIP and (ROOT / name).is_file():
            archive.write(ROOT / name, arcname=Path(name).as_posix())
with zipfile.ZipFile(ROOT / ZIP) as archive:
    assert archive.testzip() is None
    assert all("\\" not in name and not name.startswith("/") for name in archive.namelist())
    print(f"ZIP: {len(archive.namelist())} entries; portable paths; CRC OK")
print(f"Modified: {len(modified)}; created: {len(created) + 1}; diff bytes: {len(diff)}")
print(f"ZIP SHA256: {hashlib.sha256((ROOT / ZIP).read_bytes()).hexdigest()}")
