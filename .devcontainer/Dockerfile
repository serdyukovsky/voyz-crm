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

# Entrypoint handles PostgreSQL init/start with persistent data dir
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /workspace

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["sleep", "infinity"]
