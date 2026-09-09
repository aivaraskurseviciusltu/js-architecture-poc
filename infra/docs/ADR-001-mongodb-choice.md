# ADR-001: MongoDB — DocumentDB vs MongoDB Atlas

## Status
Accepted

## Context
The application uses MongoDB as its primary database across three services
(orders, inventory, notifications). For production on AWS, we need a
managed, HA database that is:
- Accessible from EKS pods without public internet exposure
- Operated without self-managing replication, patching, or backups
- Compatible with the Mongoose ODM used in the NestJS services

Two options were evaluated:

### Option A — MongoDB Atlas
- Fully managed MongoDB, any version
- Requires VPC Peering or PrivateLink between Atlas project and AWS VPC
- Supports all MongoDB features (aggregation pipelines, transactions, etc.)
- Separate billing account and console outside AWS
- Atlas free tier (M0) available for dev; M10+ required for HA

### Option B — Amazon DocumentDB
- AWS-native, MongoDB-compatible service (up to Mongo 5.0 API)
- Runs inside the VPC — no peering required
- IAM-based auth available
- Multi-AZ support with auto-failover
- Known compatibility gaps: no `$where`, limited aggregation operators,
  no native MongoDB change streams (emulated)
- Mongoose 7+ works with DocumentDB with minor config (tls, directConnection)

## Decision
**Option B — Amazon DocumentDB** was chosen for this PoC because:
1. It stays entirely within the AWS VPC — simpler networking, no peering
2. It uses standard AWS IAM/Secrets Manager for credentials
3. The application does not use any MongoDB features incompatible with DocumentDB
4. It reduces the number of external accounts/consoles to manage
5. Straightforward Terraform via the `aws` provider (no third-party provider needed)

## Consequences
- Mongoose connection string must include `tls=true&tlsCAFile=...` (AWS CA bundle)
- `directConnection=true` is NOT supported on DocumentDB cluster endpoints
  (use the cluster endpoint, not replica set discovery)
- `$text` search and `$where` operators are not available
- If full MongoDB 6/7 features are needed in future, migrate to Atlas
