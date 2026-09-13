# CloudDocs — Deployment Guide

CloudDocs is deployable in multiple configurations depending on your environment.

---

## Option 1: Local Docker Compose (Recommended for Local Testing)

Start the full application stack with one command:
```bash
docker compose up -d
```
This launches:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Nginx Entrypoint**: http://localhost:80
- **PostgreSQL 16**: localhost:5432
- **Redis**: localhost:6379

To run the monitoring stack alongside:
```bash
docker compose -f docker-compose.monitoring.yml up -d
```
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (Credentials: `admin` / `admin`)
- **Loki**: http://localhost:3100

---

## Option 2: Kubernetes (Minikube / k3d / Production Cluster)

Deploy to Kubernetes:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/postgres-local.yaml   # For local k8s clusters
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## Option 3: Free-Tier Production Cloud Deployment

- **Frontend**: Vercel or Cloudflare Pages (connects to your Next.js repo).
- **Backend**: Container platform (Fly.io, Railway, or VPS).
- **Database**: Free-tier PostgreSQL (Neon, Supabase, or Railway).
- **Storage**: Cloudflare R2 (Free tier includes 10 GB storage, 1M write operations/month, zero egress fees).
- **Cache**: Upstash Redis (serverless free tier).
