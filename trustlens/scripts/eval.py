"""Score every detector against gt_attack and print the section-8 metrics table."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from trustlens.evaluation import evaluate, to_markdown  # noqa: E402

if __name__ == "__main__":
    print(to_markdown(evaluate()))
