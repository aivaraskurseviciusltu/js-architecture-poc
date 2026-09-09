# Security Architecture & Threat Model

## Overview

This document describes the security controls implemented in the js-architecture-poc platform,
covering secrets management, network security, container hardening, application security,
and CI/CD pipeline security. It also includes a threat model for the most significant risks.

---

## 1. Secrets Management

### Local / Kubernetes (SealedSecrets)
- All Kubernetes `Secret` objects are encrypted with **Bitnami Sealed Secrets** before being committed.
- The `mongodb/secret.yaml` plaintext manifest has been removed from the repository.
- The sealed-secrets controller holds the private key inside the cluster; the encrypted ciphertext in Git is useless without it.
- Workflow: `kubectl create secret --dry-run -o yaml | kubeseal > sealed.yaml && git add sealed.yaml`

### Production (External Secrets Operator + AWS Secrets Manager)
- The **External Secrets Operator** (ESO) is configured via `k8s/base/sealed-secrets/external-secret-prod.yaml`.
- Secrets are stored in **AWS Secrets Manager** and synced into Kubernetes Secrets at runtime.
- IAM roles (IRSA) grant each service the minimum permissions needed to read only its own secrets.

### Rules
- No plaintext credentials in source code, environment files, or Docker images.
- `gitleaks` runs in CI to detect accidental secret commits.
- The `.gitignore` excludes `.env`, `*.tfvars` (except `*.example`), and Terraform state files.

---

## 2. Network Security

### Kubernetes Network Policies
- **Default-deny** ingress and egress for the `poc` namespace.
- Explicit allow rules for each service-to-service communication path.
- No service can reach another service that it does not explicitly need.

### TLS Everywhere
- **Ingress**: TLS terminates at the NGINX ingress controller.
  - Local: self-signed certificate issued by cert-manager using a local CA (`poc-ca-issuer`).
  - Prod: Let's Encrypt via cert-manager ACME, or AWS ACM at the ALB.
- **HTTP → HTTPS redirect** enforced via `nginx.ingress.kubernetes.io/force-ssl-redirect: "true"`.
- **MongoDB (Atlas/DocumentDB)**: connection strings use `tls=true` (Atlas enforces TLS by default;
  DocumentDB requires the AWS CA bundle mounted as a volume at `/etc/ssl/certs/`).

---

## 3. Container Hardening

### Dockerfile Best Practices
| Control | Implementation |
|---------|---------------|
| Multi-stage build | Build tools absent from runtime image |
| Base image | `node:24-alpine` (minimal attack surface) |
| Non-root user | `adduser -S appuser` + `USER appuser` in all NestJS images |
| Non-root nginx | `nginxinc/nginx-unprivileged:1.27-alpine` (listens on 8080) |
| Owned files | `--chown=appuser:appgroup` on all `COPY` instructions |

### Kubernetes Pod Security
All Deployments enforce:

```yaml
securityContext:           # pod-level
  runAsNonRoot: true
  runAsUser: 1000
  seccompProfile:
    type: RuntimeDefault

securityContext:           # container-level
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true   # writable /tmp via emptyDir volume
  capabilities:
    drop: [ALL]
```

The `poc` namespace has **Pod Security Standards** labels set to `restricted` (enforce + warn).

---

## 4. RBAC

- Each service runs under its own `ServiceAccount`.
- `automountServiceAccountToken: false` on all ServiceAccounts (none call the Kubernetes API).
- Namespaced `Role` grants each service `get` on only its own `ConfigMap` and `Secret`.
- No service uses the `default` ServiceAccount.

---

## 5. Application Security

### BFF (API Gateway)
| Control | Implementation |
|---------|---------------|
| Security headers | `helmet` middleware (CSP, HSTS, X-Frame-Options, etc.) |
| Rate limiting | `@nestjs/throttler` — 100 req/min per IP, applied globally |
| Authentication | `passport-jwt` — requires valid Bearer JWT on `/api/*` routes |
| Input validation | `class-validator` + `ValidationPipe(whitelist, forbidNonWhitelisted)` |
| Error handling | `AllExceptionsFilter` — stack traces suppressed in responses |
| CORS | Origin restricted via `CORS_ORIGIN` env var (default `*` — override in prod) |

### Order Service
| Control | Implementation |
|---------|---------------|
| NoSQL sanitize | `MongoSanitizeMiddleware` — rejects `$`-prefixed and dot-notation keys |
| Input validation | `ValidationPipe(whitelist, forbidNonWhitelisted)` |
| Error handling | `AllExceptionsFilter` |
| Mongoose strict mode | Schema `strict: true` (Mongoose default) |

---

## 6. Threat Model

### T1 — NoSQL Operator Injection

**Description**: An attacker sends a request body like `{ "customerId": { "$gt": "" } }` to bypass
MongoDB query conditions, potentially exfiltrating all orders.

**Attack vector**: HTTP POST to `/orders` before validation.

**Controls**:
1. `MongoSanitizeMiddleware` runs before the controller and throws `400 Bad Request` if any key
   starts with `$` or contains `.`.
2. `ValidationPipe` with `whitelist: true` strips unknown properties; typed DTOs ensure only
   expected shapes reach the service layer.
3. Mongoose strict schema mode ignores fields not defined in the schema.

**Verified by**: Unit tests in `mongo-sanitize.middleware.spec.ts` covering direct injection,
nested objects, arrays, and query-string injection.

**Residual risk**: LOW — multiple layers of defence; no raw query construction from user input.

---

### T2 — Secrets Exfiltration via Git

**Description**: A developer accidentally commits a MongoDB password or AWS key.

**Controls**:
1. `gitleaks` scans every CI run and blocks merge on detected secrets.
2. All Kubernetes secrets are SealedSecrets (ciphertext only in Git).
3. `.gitignore` excludes `.env`, `*.tfvars`, Terraform state, and provider binaries.
4. AWS credentials in CI use OIDC (no long-lived keys stored in GitHub Secrets).

**Residual risk**: LOW.

---

### T3 — Container Escape / Privilege Escalation

**Description**: A compromised container process attempts to escalate privileges or escape to the host.

**Controls**:
1. All containers run as UID 1000 (non-root).
2. `allowPrivilegeEscalation: false` prevents `setuid`/`setgid` binaries from elevating.
3. `capabilities: drop: [ALL]` removes all Linux capabilities.
4. `readOnlyRootFilesystem: true` on Node.js containers (writable `/tmp` via emptyDir).
5. `seccompProfile: RuntimeDefault` filters dangerous syscalls.
6. Pod Security Standards `restricted` enforced on the namespace.

**Residual risk**: LOW.

---

### T4 — Lateral Movement via Pod-to-Pod Traffic

**Description**: A compromised pod attempts to reach other services it should not talk to.

**Controls**:
1. Default-deny `NetworkPolicy` applied to the namespace.
2. Explicit allow rules for each required communication path only.
3. Each service has its own `ServiceAccount`; no pod can impersonate another.

**Residual risk**: LOW.

---

### T5 — JWT Token Forgery / Missing Authentication

**Description**: An attacker forges a JWT or calls the BFF without authentication.

**Controls**:
1. `JwtAuthGuard` on all `/api/orders` routes — rejects requests without a valid signed token.
2. Token secret loaded from `JWT_SECRET` env var (must never be committed).
3. Short-lived tokens (exp enforced by `ignoreExpiration: false`).
4. OIDC/external IdP integration documented in `jwt.strategy.ts` for production.

**Residual risk**: MEDIUM — the JWT secret strength and rotation policy determine residual risk.
  Use a strong random secret (≥32 bytes) and rotate regularly in production.

---

### T6 — Supply Chain Attack (Dependency Confusion / Malicious Package)

**Controls**:
1. `npm audit --audit-level=high` fails CI on high/critical CVEs.
2. Trivy image scan fails CI on HIGH/CRITICAL container vulnerabilities.
3. GitHub Actions use SHA-pinned action references (not mutable tags).
4. SBOM (SPDX-JSON format) generated per image and stored as a CI artifact.
5. `npm ci` (not `npm install`) enforces the lockfile.

**Residual risk**: MEDIUM — no private registry proxy configured yet; recommend Artifactory/Nexus
  or npm audit signatures for additional control.

---

## 7. CI/CD Security

| Control | Implementation |
|---------|---------------|
| Action pinning | All `uses:` references use full commit SHA |
| Secret scanning | gitleaks on every run |
| Dependency audit | `npm audit --audit-level=high` |
| Image scanning | Trivy (fail on HIGH/CRITICAL) |
| SBOM | Trivy SPDX-JSON artifact per image |
| IaC scanning | tfsec + tflint on Terraform |
| Least-privilege | OIDC role assumption in CD (no long-lived AWS keys) |
| Environment gates | `production` environment approval required in GitHub |

---

## 8. Recommended Follow-ups (Post-PoC)

- [ ] Enable Dependabot for automated dependency version bumps.
- [ ] Configure a private npm registry proxy (Artifactory/Nexus) to prevent dependency confusion.
- [ ] Add OPA/Gatekeeper policies to enforce resource quotas and image registry restrictions.
- [ ] Set `CORS_ORIGIN` to the exact frontend domain in production (not `*`).
- [ ] Implement token rotation for the Sealed Secrets controller key.
- [ ] Add runtime security monitoring (Falco) for anomaly detection.
- [ ] Enable AWS GuardDuty and CloudTrail for the production AWS account.
