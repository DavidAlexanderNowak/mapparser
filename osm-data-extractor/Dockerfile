FROM debian:12-slim

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        osmium-tool \
        python3 \
        python3-icu \
 && rm -rf /var/lib/apt/lists/*

COPY scripts/ /opt/osm/
RUN chmod +x /opt/osm/extract.sh /opt/osm/make_dump.py

WORKDIR /data
ENTRYPOINT ["/opt/osm/extract.sh"]
