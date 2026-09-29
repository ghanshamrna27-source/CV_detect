FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
COPY pyproject.toml README.md ./
COPY trustlens ./trustlens
RUN pip install --no-cache-dir -e .
COPY configs ./configs
COPY scripts ./scripts
ENV TRUSTLENS_HOME=/app
EXPOSE 8000 8501
