"""
Credit engine — pure deterministic functions.
No ML dependency. Called from upload pipeline and manual update.
Returns plain dicts for easy JSON serialization.
"""


def compute_credits(earned: float, expected: float, required: float) -> dict:
    """
    Compute credit progress.
    - completion_pct = earned / expected * 100  (capped at 100)
    - deficit        = max(expected - earned, 0)
    - status:
        ON_TRACK  if completion >= 90%
        AT_RISK   if completion >= 70%
        DEFICIT   otherwise
    """
    earned   = max(float(earned), 0.0)
    expected = max(float(expected), 1.0)   # avoid divide-by-zero
    required = max(float(required), 0.0)

    completion_pct = min(earned / expected * 100.0, 100.0)
    deficit        = max(expected - earned, 0.0)

    if completion_pct >= 90.0:
        status = 'ON_TRACK'
    elif completion_pct >= 70.0:
        status = 'AT_RISK'
    else:
        status = 'DEFICIT'

    return {
        'earned':         round(earned, 2),
        'expected':       round(expected, 2),
        'required':       round(required, 2),
        'completion_pct': round(completion_pct, 2),
        'deficit':        round(deficit, 2),
        'status':         status,
    }
