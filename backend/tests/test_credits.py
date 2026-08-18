"""
Tests for credit engine — pure-function unit tests.
SDK §15: Completion/deficit calculations must be correct.
"""
import pytest
from app.credits.engine import compute_credits


def test_on_track():
    result = compute_credits(earned=28, expected=30, required=30)
    assert result['status'] == 'ON_TRACK'
    assert result['deficit'] == 2
    assert abs(result['completion_pct'] - 93.3) < 0.5


def test_at_risk():
    result = compute_credits(earned=22, expected=30, required=30)
    assert result['status'] == 'AT_RISK'
    assert result['deficit'] == 8


def test_deficit():
    result = compute_credits(earned=12, expected=30, required=30)
    assert result['status'] == 'DEFICIT'
    assert result['deficit'] == 18
    assert result['completion_pct'] == 40.0


def test_perfect():
    result = compute_credits(earned=30, expected=30, required=30)
    assert result['status'] == 'ON_TRACK'
    assert result['deficit'] == 0
    assert result['completion_pct'] == 100.0


def test_zero_expected_does_not_divide_by_zero():
    """Engine clamps expected to 1.0 — must not raise ZeroDivisionError."""
    result = compute_credits(earned=0, expected=0, required=30)
    assert isinstance(result['completion_pct'], float)
    assert isinstance(result['deficit'], float)


def test_surplus_credits_clamped():
    # Earned more than expected — deficit must not go negative
    result = compute_credits(earned=35, expected=30, required=30)
    assert result['deficit'] == 0
    assert result['completion_pct'] >= 100.0
