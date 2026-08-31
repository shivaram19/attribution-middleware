"""Seed search: find the seed whose demo run lands closest to the doc 04/05
targets (42 enrollments, ~423 lost / ~35 open, ~$672K revenue, ~$22.8K spend)."""
import io
import contextlib
from mock_data_generator import MockDataGenerator

TARGETS = {"won": 42, "lost": 423, "open": 35, "revenue": 672000, "spend": 22848}

results = []
for seed in range(1, 51):
    gen = MockDataGenerator(location_id="demo_loc_001", days=30, total_leads=500, seed=seed)
    with contextlib.redirect_stdout(io.StringIO()):
        gen.generate_all()
    won = sum(1 for o in gen.opportunities if o["status"] == "won")
    lost = sum(1 for o in gen.opportunities if o["status"] == "lost")
    open_ = sum(1 for o in gen.opportunities if o["status"] == "open")
    revenue = sum(o["monetary_value"] for o in gen.opportunities if o["status"] == "won")
    spend = sum(m["spend"] for m in gen.meta_insights) + sum(g["cost_usd"] for g in gen.google_insights)
    score = (
        abs(won - TARGETS["won"]) * 1000
        + abs(lost - TARGETS["lost"]) * 10
        + abs(open_ - TARGETS["open"]) * 10
        + abs(revenue - TARGETS["revenue"]) / TARGETS["revenue"] * 100
        + abs(spend - TARGETS["spend"]) / TARGETS["spend"] * 100
    )
    results.append((score, seed, won, lost, open_, revenue, round(spend, 2)))
    print(f"seed={seed:3d} won={won:3d} lost={lost:3d} open={open_:3d} revenue=${revenue:>9,} spend=${spend:>10,.2f} score={score:.2f}")

results.sort()
print("\nTOP 5:")
for r in results[:5]:
    print(f"  seed={r[1]} won={r[2]} lost={r[3]} open={r[4]} revenue=${r[5]:,} spend=${r[6]:,} score={r[0]:.2f}")
