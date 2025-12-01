FROM node:20-bookworm

# Install sudo and PostgreSQL
RUN apt-get update && apt-get install -y \
    sudo \
    postgresql \
    postgresql-contrib \
    postgresql-client \
    libpq-dev \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Give node user sudo privileges
RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Configure PostgreSQL
RUN service postgresql start && \
    su - postgres -c "psql -c \"CREATE USER node WITH SUPERUSER PASSWORD 'postgres';\"" && \
    su - postgres -c "psql -c \"CREATE DATABASE crm_db OWNER node;\"" || true

# Ensure PostgreSQL starts automatically
RUN echo '#!/bin/bash\nservice postgresql start\nexec "$@"' > /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/entrypoint.sh

USER node
WORKDIR /workspace

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["sleep", "infinity"]
