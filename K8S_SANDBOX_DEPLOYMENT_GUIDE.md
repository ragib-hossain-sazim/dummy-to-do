# Kubernetes Sandbox Deployment Guide
## Migrating Dummy-Todo App from Minikube to DigitalOcean Cluster

**Date:** August 28, 2025  
**Team:** Development Team  
**App:** dummy-todo (Frontend + Backend + PostgreSQL)

---

## 📋 Overview

This document outlines the complete process of deploying our dummy-todo application from a local minikube environment to our DigitalOcean Kubernetes sandbox cluster, including all issues encountered and their solutions.

### Application Architecture
- **Frontend**: React app served by Nginx (DigitalOcean Container Registry)
- **Backend**: Node.js API server (DigitalOcean Container Registry)  
- **Database**: PostgreSQL 15 (Docker Hub)

---

## 🎯 Pre-Deployment Setup

### 1. Initial State Assessment
- **Source**: Application running on minikube
- **Target**: DigitalOcean Kubernetes sandbox cluster
- **Container Registry**: `registry.digitalocean.com/sandbox-app-test-registry`

### 2. Prerequisites Verified
- [x] DigitalOcean Kubernetes cluster running
- [x] Frontend and backend images pushed to DO Container Registry
- [x] `kubectl` configured for sandbox cluster
- [x] `doctl` CLI available (for registry authentication)

---

## 🔧 Step-by-Step Deployment Process

### Step 1: YAML Configuration Updates

#### 1.1 Backend Configuration (`k8s/backend.yaml`)
**Changes Made:**
```yaml
# BEFORE (Minikube):
image: dummy-todo-backend:latest
imagePullPolicy: Never # Use local image built by minikube

# AFTER (Sandbox):
image: registry.digitalocean.com/sandbox-app-test-registry/k8s:backend-latest
imagePullPolicy: Always

# ADDED (for registry authentication):
spec:
  imagePullSecrets:
  - name: sandbox-app-test-registry
```

#### 1.2 Frontend Configuration (`k8s/frontend.yaml`)
**Changes Made:**
```yaml
# BEFORE:
image: registry.digitalocean.com/sandbox-app-test-registry/k8s:frontend-latest
imagePullPolicy: [empty]

# AFTER:
image: registry.digitalocean.com/sandbox-app-test-registry/k8s:frontend-latest
imagePullPolicy: Always

# ADDED:
spec:
  imagePullSecrets:
  - name: sandbox-app-test-registry
```

#### 1.3 PostgreSQL Configuration (`k8s/postgres.yaml`)
**Changes Made:**
```yaml
# ADDED:
image: postgres:15
imagePullPolicy: IfNotPresent
```

### Step 2: Registry Authentication Setup

**Command:**
```bash
kubectl create secret docker-registry sandbox-app-test-registry \
  --docker-server=registry.digitalocean.com \
  --docker-username=<DO_TOKEN> \
  --docker-password=<DO_TOKEN> \
  --docker-email=<EMAIL>
```

### Step 3: Initial Deployment Attempt

**Commands:**
```bash
kubectl apply -f postgres.yaml
kubectl apply -f backend.yaml  
kubectl apply -f frontend.yaml
```

**Initial Status:**
```bash
kubectl get pods
# NAME                        READY   STATUS    RESTARTS      AGE
# backend-6489b8786f-4g8g8    0/1     Running   1 (13s ago)   38s
# backend-6489b8786f-hrfr2    0/1     Running   1 (13s ago)   38s
# frontend-7776996df6-sxwll   1/1     Running   0             42s  ✅
# frontend-7776996df6-z6spj   1/1     Running   0             42s  ✅
# postgres-7d95f9bd6d-xmxmd   0/1     Error     2 (15s ago)   45s  ❌
```

---

## 🚨 Issues Encountered & Solutions

### Issue #1: PostgreSQL Pod CrashLoopBackOff

#### Problem Analysis:
```bash
kubectl describe pod postgres-7d95f9bd6d-xmxmd
kubectl logs postgres-7d95f9bd6d-xmxmd
```

**Error Output:**
```
initdb: error: directory "/var/lib/postgresql/data" exists but is not empty
initdb: detail: It contains a lost+found directory, perhaps due to it being a mount point.
initdb: hint: Using a mount point directly as the data directory is not recommended.
Create a subdirectory under the mount point.
```

#### Root Cause:
- DigitalOcean Block Storage volumes automatically create a `lost+found` directory
- PostgreSQL cannot initialize when the data directory is not empty
- Direct mount point usage is not recommended

#### Solution Applied:
**Modified `k8s/postgres.yaml`:**
```yaml
# BEFORE:
volumeMounts:
- name: postgres-storage
  mountPath: /var/lib/postgresql/data

# AFTER:
volumeMounts:
- name: postgres-storage
  mountPath: /var/lib/postgresql/data
  subPath: pgdata  # ← This creates a subdirectory
```

**Why this works:**
- `subPath: pgdata` creates a clean subdirectory within the volume
- Avoids the `lost+found` directory conflict
- Follows PostgreSQL best practices for mounted volumes

### Issue #2: Backend Pods Connection Refused

#### Problem Analysis:
```bash
kubectl logs backend-6489b8786f-4g8g8
```

**Error Output:**
```
❌ Database connection failed, 10 retries left...
Error: connect ECONNREFUSED 10.108.62.49:5432
```

#### Root Cause:
- Backend pods were trying to connect to PostgreSQL
- PostgreSQL was in CrashLoopBackOff state (Issue #1)
- Connection refused because database wasn't running

#### Solution:
- **Automatic resolution** after fixing PostgreSQL issue
- Backend pods automatically recovered once database became available
- Kubernetes restart policy handled the recovery

---

## 🎉 Deployment Success

### Final Deployment Steps:

1. **Apply PostgreSQL Fix:**
   ```bash
   kubectl apply -f postgres.yaml
   ```

2. **Monitor Recovery:**
   ```bash
   kubectl get pods
   # Wait for postgres pod to become Ready (1/1)
   ```

3. **Verify Backend Recovery:**
   ```bash
   kubectl logs backend-6489b8786f-4g8g8 --tail=10
   # Expected: ✅ Database connected and initialized
   ```

### Final Status Verification:

```bash
kubectl get all
```

**Result:**
```
NAME                            READY   STATUS    RESTARTS      AGE
pod/backend-6489b8786f-4g8g8    1/1     Running   4 (66s ago)   3m11s
pod/backend-6489b8786f-hrfr2    1/1     Running   4 (69s ago)   3m11s
pod/frontend-7776996df6-sxwll   1/1     Running   0             3m15s
pod/frontend-7776996df6-z6spj   1/1     Running   0             3m15s
pod/postgres-677948b7cf-g8fjb   1/1     Running   0             58s

NAME                       TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
service/backend-service    ClusterIP   10.108.33.205   <none>        5000/TCP       3m11s
service/frontend-service   NodePort    10.108.57.211   <none>        80:32683/TCP   3m15s
service/postgres-service   ClusterIP   10.108.62.49    <none>        5432/TCP       3m18s
```

---

## 🌐 Application Access

### Frontend Access:
```bash
kubectl get nodes -o wide
kubectl get svc frontend-service
```

**Access URL:** `http://139.59.14.146:32683`

### Service Endpoints:
- **Frontend**: NodePort 32683 (External access)
- **Backend**: ClusterIP 5000 (Internal only, proxied through frontend)
- **PostgreSQL**: ClusterIP 5432 (Internal only)

---

## 📚 Key Learnings & Best Practices

### 1. **Container Registry Configuration**
- **Private registries** (DigitalOcean): Require `imagePullSecrets` + `imagePullPolicy: Always`
- **Public registries** (Docker Hub): Use `imagePullPolicy: IfNotPresent` for efficiency

### 2. **Volume Mount Best Practices**
- **Never mount directly to root data directory** on cloud block storage
- **Always use `subPath`** to create clean subdirectories
- **Common pattern**: `subPath: <service-name>data` (e.g., `pgdata`, `mongodata`)

### 3. **Troubleshooting Workflow**
1. Check pod status: `kubectl get pods`
2. Describe problematic pods: `kubectl describe pod <pod-name>`
3. Check logs: `kubectl logs <pod-name>`
4. Verify services and networking: `kubectl get svc`
5. Check persistent volumes: `kubectl get pvc`

### 4. **Deployment Order**
- Deploy **stateful services first** (database, message queues)
- Deploy **application services second** (backend APIs)
- Deploy **frontend services last** (web servers, load balancers)

---

## 🔄 Future Deployment Checklist

### Before Deployment:
- [ ] Images pushed to container registry
- [ ] Registry authentication configured (`imagePullSecrets`)
- [ ] YAML files updated with correct image tags and policies
- [ ] Volume mount paths use `subPath` for data directories

### During Deployment:
- [ ] Deploy in dependency order (DB → Backend → Frontend)
- [ ] Monitor pod status after each component
- [ ] Check logs for any connection or initialization issues

### After Deployment:
- [ ] Verify all pods are Running and Ready
- [ ] Test application endpoints
- [ ] Document any environment-specific configurations

---

## 📞 Support & Contact

For questions about this deployment:
- **Team Lead**: [Your Name]
- **DevOps**: [DevOps Contact]
- **Documentation**: This file is maintained in the repository

---

*Last Updated: August 28, 2025*
*Next Review Date: September 28, 2025*
