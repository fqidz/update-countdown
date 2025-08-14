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
            CREATE TABLE IF NOT EXISTS time_series_page_data (
              time           TIMESTAMP WITH TIME ZONE    NOT NULL,
              page_name      TEXT                        NOT NULL,
              user_count     INTEGER                     NOT NULL,
              click_count    BIGINT                      NOT NULL
            )
            WITH (
              tsdb.hypertable,
              tsdb.partition_column = 'time',
              tsdb.segmentby = 'page_name',
              tsdb.chunk_interval = '1d',
              tsdb.orderby = 'time DESC'
            );
        ",
    )
    .execute(&mut *tx)
    .await?;

    query("CALL add_columnstore_policy('stats', after => INTERVAL '1d', if_not_exists => TRUE);")
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(pool)
}

pub async fn insert_time_series_page_data(
    pool: &PgPool,
    data: Vec<TimeSeriesDataEntry>,
) -> Result<(), sqlx::Error> {
    todo!()
}
