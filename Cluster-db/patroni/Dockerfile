
FROM postgres:16-bookworm

ENV PATRONI_VERSION=4.1.5

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-venv \
        gettext-base \
        curl \
    && python3 -m venv /opt/patroni \
    && /opt/patroni/bin/pip install --no-cache-dir \
        "patroni[etcd3,psycopg3]==${PATRONI_VERSION}" \
    && ln -s /opt/patroni/bin/patroni /usr/local/bin/patroni \
    && ln -s /opt/patroni/bin/patronictl /usr/local/bin/patronictl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY patroni.yml.template /etc/patroni/patroni.yml.template
COPY entrypoint.sh /usr/local/bin/patroni-entrypoint.sh
COPY post-init.sh /usr/local/bin/patroni-post-init.sh

RUN chmod 755 \
    /usr/local/bin/patroni-entrypoint.sh \
    /usr/local/bin/patroni-post-init.sh

USER postgres

ENTRYPOINT ["/usr/local/bin/patroni-entrypoint.sh"]
