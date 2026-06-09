FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# System deps (none heavy needed; pypdf & reportlab are pure-python wheels)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

# Use multiple workers in production behind the platform's load balancer.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
