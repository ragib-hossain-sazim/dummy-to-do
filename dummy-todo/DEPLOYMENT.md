# Kubernetes Deployment Summary

Your dummy-todo application has been successfully deployed to minikube!

## Architecture

The application consists of three components:

1. **PostgreSQL Database** (`postgres`)
   - Persistent storage for todos
   - Uses persistent volume claims for data persistence
   - Credentials stored in ConfigMap and Secret

2. **Backend API** (`backend`)
   - Node.js/Express application
   - Connects to PostgreSQL database
   - Exposes REST API on port 5000
   - 2 replicas for high availability

3. **Frontend** (`frontend`)
   - React application served by nginx
   - Proxies API requests to backend service
   - 2 replicas for high availability
   - Exposed via NodePort service

## Kubernetes Resources Created

### ConfigMaps & Secrets
- `postgres-config` - PostgreSQL environment variables
- `postgres-secret` - PostgreSQL password (base64 encoded)
- `backend-config` - Backend environment variables
- `nginx-config` - Nginx configuration for frontend

### Deployments
- `postgres` - PostgreSQL database (1 replica)
- `backend` - Node.js API server (2 replicas)
- `frontend` - React frontend with nginx (2 replicas)

### Services
- `postgres-service` - ClusterIP service for database
- `backend-service` - ClusterIP service for API
- `frontend-service` - NodePort service for web access

### Storage
- `postgres-pvc` - Persistent Volume Claim for PostgreSQL data

## Access Your Application

### Option 1: Using minikube service (Recommended)
```bash
minikube service frontend-service
```

### Option 2: Direct URL access
The application is accessible at: `http://192.168.49.2:30689`

### Option 3: Port forwarding
```bash
kubectl port-forward service/frontend-service 3000:80
# Then visit: http://localhost:3000
```

## Useful Commands

### Check deployment status
```bash
kubectl get pods
kubectl get services
kubectl get deployments
```

### View logs
```bash
kubectl logs deployment/backend
kubectl logs deployment/frontend
kubectl logs deployment/postgres
```

### Scale deployments
```bash
kubectl scale deployment backend --replicas=3
kubectl scale deployment frontend --replicas=3
```

### Delete deployment
```bash
kubectl delete -f k8s/
```
