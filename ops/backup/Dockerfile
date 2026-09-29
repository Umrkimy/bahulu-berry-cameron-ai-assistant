# Backup tools matched to the database: pg_dump/pg_restore from the same
# PostgreSQL 16 image, plus age for encryption.
FROM pgvector/pgvector:pg16

RUN apt-get update \
    && apt-get install --yes --no-install-recommends age \
    && rm -rf /var/lib/apt/lists/*

COPY backup.sh restore-test.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/backup.sh /usr/local/bin/restore-test.sh \
    && chmod 0755 /usr/local/bin/backup.sh /usr/local/bin/restore-test.sh

# Runs as the image's unprivileged postgres user, not root.
USER postgres
ENV TZ=Asia/Kuala_Lumpur
ENTRYPOINT ["/usr/local/bin/backup.sh"]
