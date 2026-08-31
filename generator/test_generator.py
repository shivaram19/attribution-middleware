"""In-memory tests for the mock data generator (no DB required)."""
import math

from mock_data_generator import MockDataGenerator, PIPELINE_STAGES, safe_div


def make_generator(leads=50, days=10, seed=42):
    gen = MockDataGenerator(location_id="test_loc", days=days, total_leads=leads, seed=seed)
    data = gen.generate_all()
    return gen, data


def test_contact_count():
    gen, data = make_generator()
    assert len(data["contacts"]) == 50
    assert len(data["opportunities"]) == 50


def test_funnel_stage_validity():
    gen, data = make_generator()
    valid_stages = set(PIPELINE_STAGES)
    valid_statuses = {"open", "won", "lost"}
    for opp in data["opportunities"]:
        assert opp["stage_name"] in valid_stages
        assert opp["status"] in valid_statuses
        # 'won' only at enrollment stage
        if opp["status"] == "won":
            assert opp["stage_name"] == "enrollment"


def test_won_opportunities_have_value_and_attribution():
    gen, data = make_generator()
    won = [o for o in data["opportunities"] if o["status"] == "won"]
    for opp in won:
        assert opp["monetary_value"] > 0
    # attributions exist for every won opp whose source is meta or google
    contacts_by_id = {c["id"]: c for c in data["contacts"]}
    won_paid = [
        o for o in won
        if contacts_by_id[o["contact_id"]]["first_touch_source"] in ("meta", "google")
    ]
    attr_opp_ids = {a["opportunity_id"] for a in data["attributions"]}
    assert len(won_paid) == len(attr_opp_ids)
    for opp in won_paid:
        assert opp["id"] in attr_opp_ids


def test_source_weights_roughly_respected():
    # large sample so the distribution is stable
    gen, data = make_generator(leads=500, days=30)
    n = len(data["contacts"])
    meta_share = sum(1 for c in data["contacts"] if c["first_touch_source"] == "meta") / n
    google_share = sum(1 for c in data["contacts"] if c["first_touch_source"] == "google") / n
    # expected 0.45 / 0.30 -- allow generous tolerance
    assert abs(meta_share - 0.45) < 0.08
    assert abs(google_share - 0.30) < 0.08


def test_no_nan_or_division_errors():
    gen, data = make_generator()

    def is_bad_number(v):
        return isinstance(v, float) and (math.isnan(v) or math.isinf(v))

    for m in data["meta_insights"]:
        for key in ("frequency", "ctr", "spend", "cpm", "cpc", "cost_per_lead"):
            assert not is_bad_number(m[key]), f"meta_insights.{key} = {m[key]}"
    for g in data["google_insights"]:
        for key in ("ctr", "cost_usd", "average_cpc", "cost_per_conversion", "conversion_rate"):
            assert not is_bad_number(g[key]), f"google_insights.{key} = {g[key]}"
    for a in data["attributions"]:
        for key in ("ad_spend", "cac", "roas"):
            assert not is_bad_number(a[key]), f"attributions.{key} = {a[key]}"
    for s in data["daily_sales"]:
        assert not is_bad_number(s["show_up_rate"])


def test_safe_div():
    assert safe_div(10, 2) == 5
    assert safe_div(10, 0) == 0.0
    assert safe_div(10, 0, default=None) is None


def test_reproducible_with_seed():
    _, data1 = make_generator(leads=20, days=5, seed=7)
    _, data2 = make_generator(leads=20, days=5, seed=7)
    emails1 = [c["email"] for c in data1["contacts"]]
    emails2 = [c["email"] for c in data2["contacts"]]
    assert emails1 == emails2
