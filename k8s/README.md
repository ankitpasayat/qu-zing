# Kubernetes Deployment (Optional)

Deploy to any K8s cluster. Uses Kustomize for environment management.

## Quick Deploy

```bash
# 1. Build & push images
docker build -t your-registry/qu-zing-server:v1.0.0 ./server
docker push your-registry/qu-zing-server:v1.0.0
# Same for client

# 2. Update k8s/overlays/production/kustomization.yaml with your registry

# 3. Create secrets (from your .env.local values)
kubectl create namespace qu-zing
kubectl create secret generic qu-zing-secrets \
  --namespace=qu-zing \
  --from-literal=DISCORD_CLIENT_ID="..." \
  --from-literal=DISCORD_CLIENT_SECRET="..." \
  --from-literal=GOOGLE_API_KEY="..."

# 4. Deploy
kubectl apply -k k8s/overlays/production

# 5. Get external IP
kubectl get ingress -n qu-zing
```

## Structure

```
k8s/
├── base/              # Shared config
└── overlays/
    ├── local/         # Minikube (for testing)
    └── production/    # Production + HPA
```

## Useful Commands

```bash
kubectl get all -n qu-zing                     # Status
kubectl logs -n qu-zing -l component=server -f # Logs
kubectl scale deployment server --replicas=5 -n ...     # Scale
kubectl delete namespace qu-zing               # Remove
```

## Production

- HPA scales 2-10 pods based on CPU (70%)
- Configure ingress with your domain
- Set up TLS with cert-manager
- Resource limits: 1 CPU, 512MB RAM per pod
