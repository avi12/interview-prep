import pandas as pd

COHORT_LABEL = "cohort"
PERIOD_LABEL = "months_since_signup"
FIRST_PERIOD = 0


def add_cohort_columns(events):
    event_month = events["event_date"].dt.to_period("M")
    cohort_month = event_month.groupby(events["user_id"]).transform("min")
    return events.assign(
        event_month=event_month,
        cohort_month=cohort_month,
        months_since_signup=(event_month - cohort_month).map(lambda offset: offset.n),
    )


def retention_matrix(events):
    frame = add_cohort_columns(events)
    last_month = frame["event_month"].max()
    active_users = frame.pivot_table(
        index="cohort_month",
        columns=PERIOD_LABEL,
        values="user_id",
        aggfunc="nunique",
        fill_value=0,
    )
    all_periods = range(max(active_users.columns) + 1)
    retention = active_users.reindex(columns=all_periods, fill_value=0).div(active_users[FIRST_PERIOD], axis=0)
    observed_periods = last_month.ordinal - retention.index.asi8
    is_future = retention.columns.to_numpy()[None, :] > observed_periods[:, None]
    retention.index = retention.index.astype(str).rename(COHORT_LABEL)
    retention.columns = retention.columns.rename(PERIOD_LABEL)
    return retention.mask(is_future)
