FROM node:18-bullseye

# Install Python 3.12 and dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    curl \
    wget \
    unzip \
    libssl-dev \
    libffi-dev \
    zlib1g-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Download and install Python 3.12
RUN wget https://www.python.org/ftp/python/3.12.0/Python-3.12.0.tgz && \
    tar -xf Python-3.12.0.tgz && \
    cd Python-3.12.0 && \
    ./configure --enable-optimizations && \
    make -j $(nproc) && \
    make altinstall && \
    cd .. && \
    rm -rf Python-3.12.0 Python-3.12.0.tgz

# Create symbolic links for Python
RUN ln -sf /usr/local/bin/python3.12 /usr/bin/python3 && \
    ln -sf /usr/local/bin/python3.12 /usr/bin/python && \
    ln -sf /usr/local/bin/pip3.12 /usr/bin/pip3

# Configure pip with retry settings for more reliable downloads
RUN mkdir -p ~/.config/pip && \
    echo "[global]" > ~/.config/pip/pip.conf && \
    echo "timeout = 120" >> ~/.config/pip/pip.conf && \
    echo "retries = 5" >> ~/.config/pip/pip.conf && \
    echo "default-timeout = 120" >> ~/.config/pip/pip.conf && \
    pip3 install --upgrade pip setuptools wheel

# Install AWS CLI with retry
RUN for i in $(seq 1 3); do \
    curl --max-time 120 --retry 5 --retry-delay 5 "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf aws awscliv2.zip && \
    break; \
    done

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm install -g aws-cdk typescript && \
    npm install

# Copy Lambda requirements first for caching
COPY lib/crypto-ai-agent-supervisor-stack/lambda/requirements.txt /tmp/supervisor-requirements.txt

# Create dir for blockchain data requirements (which may not exist yet)
RUN mkdir -p /tmp/blockchain-data/

# Install Python dependencies for supervisor with retry logic
RUN for i in $(seq 1 3); do \
    pip3 install --no-cache-dir -r /tmp/supervisor-requirements.txt && \
    break || { echo "Retrying pip install..."; sleep 10; }; \
    done

# Copy the rest of the application
COPY . .

# Install blockchain data requirements if they exist (with retry)
RUN if [ -f lib/knowledge-base-blockchain-data-stack/lambda/requirements.txt ]; then \
    for i in $(seq 1 3); do \
    pip3 install --no-cache-dir -r lib/knowledge-base-blockchain-data-stack/lambda/requirements.txt && \
    break || { echo "Retrying pip install..."; sleep 10; }; \
    done; \
    fi

# Configure environment defaults if not provided
ENV AWS_REGION=us-east-1
ENV CDK_DEPLOY_REGION=us-east-1

# Install Docker for Lambda function builds (with retry)
RUN for i in $(seq 1 3); do \
    curl --max-time 120 --retry 5 --retry-delay 5 -fsSL https://get.docker.com -o get-docker.sh && \
    sh get-docker.sh && \
    rm get-docker.sh && \
    break || { echo "Retrying Docker install..."; sleep 10; }; \
    done

# Create a .env file if it doesn't exist
RUN if [ ! -f .env ]; then cp .env.sample .env || echo "No .env.sample found"; fi

# Create an entrypoint script
RUN echo '#!/bin/bash\n\
if [ -f .env ]; then\n\
  export $(cat .env | grep -v "#" | xargs)\n\
fi\n\
exec "$@"\n' > /entrypoint.sh && \
chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "build"] 