"""`trustlens` command line.

    trustlens run-all                 one command: data -> models -> scan -> audit -> risk -> trace -> eval
    trustlens verify receipt.json --input img.png --model artifacts/models/reference --quote quote.json
    trustlens serve / trustlens dashboard

Set TRUSTLENS_PROFILE=quick (or pass --profile quick) for the small end-to-end run.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

import typer

app = typer.Typer(add_completion=False, no_args_is_help=True, help=__doc__)
tee_app = typer.Typer(help="Mock TEE: measurement and allowlist.")
app.add_typer(tee_app, name="tee")


@app.callback()
def main(profile: Optional[str] = typer.Option(None, help="config profile: default | quick")):
    if profile:
        os.environ["TRUSTLENS_PROFILE"] = profile


def _cfg():
    from trustlens.common.config import load_config

    return load_config()


def _paths():
    from trustlens.common.config import Paths

    return Paths.from_config(_cfg()).ensure()


# ------------------------------------------------------------------ setup

@app.command("keys-init")
def keys_init(force: bool = typer.Option(False, help="overwrite existing dev keys")):
    """Generate dev keys: vendor EC P-256 (model signing) and the mock platform root (Ed25519)."""
    from trustlens.model_auditor.signature import generate_vendor_key
    from trustlens.tee.attestation_mock import generate_platform_key

    keys = _paths().keys
    if force or not (keys / "vendor.priv").exists():
        generate_vendor_key(keys)
        typer.echo(f"vendor key -> {keys / 'vendor.priv'}")
    if force or not (keys / "platform.priv").exists():
        generate_platform_key(keys)
        typer.echo(f"platform key -> {keys / 'platform.priv'}")


@tee_app.command("measure")
def tee_measure():
    """Print the current service measurement (mock MRENCLAVE)."""
    from trustlens.tee.measurement import measure

    typer.echo(measure(_cfg()))


@tee_app.command("allowlist")
def tee_allowlist(description: str = typer.Option("current build", help="note stored with the entry")):
    """Add the current service measurement to the allowlist."""
    from trustlens.common.config import resolve
    from trustlens.tee.attestation_mock import add_to_allowlist
    from trustlens.tee.measurement import measure

    cfg = _cfg()
    m = measure(cfg)
    add_to_allowlist(resolve(cfg["tee"]["allowlist"]), m, description)
    typer.echo(f"allowlisted {m}")


# ------------------------------------------------------------------ pipeline steps

@app.command()
def prepare():
    """Split CIFAR-10 across C1..C5, apply the attacks, seal each batch (plan 5.1)."""
    from trustlens.attacks.make_contributors import build

    m = build(_cfg())
    typer.echo(m.groupby(["contributor", "gt_attack"]).size().to_string())


@app.command()
def train(which: str = typer.Option("both", help="reference | pool | both")):
    """Train the reference and/or pool models (plan 5.2)."""
    from trustlens.training.train import train as _train

    _train(which, _cfg())


@app.command()
def sign():
    """Sign the reference model with model-signing and record its probe fingerprint."""
    from trustlens.common.adapters import TorchModelAdapter
    from trustlens.common.config import get_device
    from trustlens.model_auditor import fingerprint
    from trustlens.model_auditor.signature import sign_model, verify_model

    cfg, paths = _cfg(), _paths()
    ref = paths.models / "reference"
    sign_model(ref, paths.keys / "vendor.priv", paths.models / "reference.sig")
    ok, detail = verify_model(ref, paths.models / "reference.sig", paths.keys / "vendor.pub")
    typer.echo(f"signed {ref} -> reference.sig ({detail})")
    info = fingerprint.record_reference(paths, TorchModelAdapter.from_dir(ref, get_device()),
                                        cfg["auditor"]["probe_size"])
    typer.echo(f"reference fingerprint recorded on {info['probe_size']} probe images")


@app.command()
def scan(plaintext: bool = typer.Option(False, help="skip attested key release and read pool.npz")):
    """Run the data scanner (plan 5.3)."""
    from trustlens.data_scanner.scan import scan as _scan

    typer.echo(_scan(_cfg(), plaintext=plaintext).to_string(index=False))


@app.command()
def audit(model: Optional[Path] = typer.Option(None, help="model dir (default: auditor.model_dir)"),
          access: str = typer.Option("white-box", help="white-box | black-box")):
    """Audit a supplied model: signature, fingerprint, Neural Cleanse (plan 5.4)."""
    from trustlens.model_auditor.audit import audit as _audit

    _audit(model, access, _cfg())


@app.command()
def risk():
    """Fuse contributor metrics into trust scores with evidence packs (plan 5.5)."""
    from trustlens.risk.fusion import run

    run(_cfg())


@app.command()
def trace():
    """Trace the recovered backdoor trigger back to its contributor (plan 5.5)."""
    from trustlens.risk.trace import run

    run(_cfg())


@app.command("demo-tamper")
def demo_tamper():
    """Issue genuine / swapped / forged / tampered receipts and verify each."""
    from trustlens.provenance.tamper_demo import run

    run(_cfg())


@app.command("eval")
def eval_():
    """Score detectors against ground truth and print the metrics table (plan 8)."""
    from trustlens.evaluation import evaluate, to_markdown

    typer.echo(to_markdown(evaluate(_cfg())))


@app.command()
def verify(receipt: Path, input: Optional[Path] = typer.Option(None, "--input", help="the input image"),
           model: Optional[Path] = typer.Option(None, help="approved model dir"),
           quote: Optional[Path] = typer.Option(None, help="attestation quote JSON"),
           root: Optional[str] = typer.Option(None, help="published Merkle root (hex)"),
           as_json: bool = typer.Option(False, "--json", help="machine-readable output")):
    """Verify a receipt; exits non-zero and names the failing check if any fails."""
    from trustlens.provenance.verify_cli import all_ok, as_dicts, verify_receipt

    rec = json.loads(receipt.read_text(encoding="utf-8"))
    checks = verify_receipt(rec, input_bytes=input.read_bytes() if input else None, model_dir=model,
                            quote=json.loads(quote.read_text(encoding="utf-8")) if quote else None,
                            root=root, cfg=_cfg())
    if as_json:
        typer.echo(json.dumps(as_dicts(checks), indent=2))
    else:
        for c in checks:
            mark = {True: "PASS", False: "FAIL", None: "SKIP"}[c.ok]
            typer.echo(f"  [{mark}] {c.n}. {c.name:<18} {c.detail}")
        typer.echo("VERIFIED" if all_ok(checks) else "REJECTED")
    raise typer.Exit(0 if all_ok(checks) else 1)


# ------------------------------------------------------------------ apps

@app.command()
def serve(host: Optional[str] = None, port: Optional[int] = None):
    """Start the FastAPI inference service + key broker."""
    import uvicorn

    cfg = _cfg()
    uvicorn.run("trustlens.api.service:app", host=host or cfg["api"]["host"], port=port or cfg["api"]["port"])


@app.command()
def dashboard(port: int = 8501):
    """Start the Streamlit dashboard."""
    from trustlens.common.config import ROOT

    raise typer.Exit(subprocess.call([sys.executable, "-m", "streamlit", "run",
                                      str(ROOT / "trustlens" / "app" / "dashboard.py"),
                                      "--server.port", str(port), "--server.headless", "true"]))


@app.command("run-all")
def run_all(skip_train: bool = typer.Option(False, help="reuse existing checkpoints"),
            skip_prepare: bool = typer.Option(False, help="reuse existing contributor data"),
            fresh_ledger: bool = typer.Option(True, help="start a new Merkle log")):
    """The whole pipeline, one command (plan 13: definition of done)."""
    paths = _paths()
    timings: dict[str, float] = {}

    def step(name, fn):
        typer.secho(f"\n== {name}", bold=True)
        t0 = time.time()
        fn()
        timings[name] = round(time.time() - t0, 1)

    if fresh_ledger and paths.ledger.exists():
        paths.ledger.unlink()
    step("keys", lambda: keys_init(False))
    step("allowlist", lambda: tee_allowlist("run-all build"))
    if not skip_prepare:
        step("prepare", prepare)
    if not skip_train:
        step("train", lambda: train("both"))
    step("sign", sign)
    step("scan", lambda: scan(False))
    step("audit", lambda: audit(None, "white-box"))
    step("risk", risk)
    step("trace", trace)
    step("demo-tamper", demo_tamper)
    from trustlens.common.io import write_json

    write_json(paths.evidence / "timings.json", timings)
    step("eval", eval_)
    typer.secho("\nDone. Dashboard: trustlens dashboard   API: trustlens serve", fg="green")


if __name__ == "__main__":
    app()
