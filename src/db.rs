use sqlx::{PgPool, postgres::PgPoolOptions, query};

use crate::TimeSeriesDataEntry;

pub async fn init_db() -> Result<PgPool, sqlx::Error> {
    // https://docs.rs/sqlx/latest/sqlx/postgres/struct.PgConnectOptions.html
    // Get params from environment variables
    let db_url = "postgres://";
    let pool = PgPoolOptions::new().connect(db_url).await?;

    let mut tx = pool.begin().await?;

    query(
        "
            CREATE TABLE IF NOT EXISTS time_series_data (
              timestamp      TIMESTAMP WITHOUT TIME ZONE    NOT NULL,
              page_name      TEXT                           NOT NULL,
              datetime       TIMESTAMP WITHOUT TIME ZONE    NOT NULL,
              click_count    BIGINT                         NOT NULL,
              user_count     INTEGER                        NOT NULL
            )
            WITH (
              tsdb.hypertable,
              tsdb.partition_column = 'timestamp',
              tsdb.segmentby = 'page_name',
              tsdb.chunk_interval = '1d',
              tsdb.orderby = 'timestamp DESC'
            );
        ",
    )
    .execute(&mut *tx)
    .await?;

    query("CALL add_columnstore_policy('time_series_data', after => INTERVAL '1d', if_not_exists => TRUE);")
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(pool)
}

pub async fn insert_time_series_page_data(
    pool: &PgPool,
    data: Vec<TimeSeriesDataEntry>,
) -> Result<(), sqlx::Error> {
    // https://github.com/launchbadge/sqlx/blob/main/FAQ.md#how-can-i-bind-an-array-to-a-values-clause-how-can-i-do-bulk-inserts
    let timestamps = data
        .iter()
        .map(|e| e.timestamp.naive_utc())
        .collect::<Vec<_>>();
    let datetime = data
        .iter()
        .map(|e| e.datetime.naive_utc())
        .collect::<Vec<_>>();
    let click_count = data
        .iter()
        .map(|e| e.click_count as i64)
        .collect::<Vec<_>>();
    let user_count = data.iter().map(|e| e.user_count as i32).collect::<Vec<_>>();
    let page_name = data.into_iter().map(|e| e.page_name).collect::<Vec<_>>();

    query(
        "
            INSERT INTO time_series_data(timestamp, page_name, datetime, click_count, user_count)
            SELECT * FROM UNNEST($1::timestamp[], $2::text[], $3::timestamp[], $4::bigint[], $5::integer[])
        ",
    )
        .bind(timestamps)
        .bind(page_name)
        .bind(datetime)
        .bind(click_count)
        .bind(user_count)
        .execute(pool)
        .await?;

    Ok(())
}
