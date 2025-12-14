# Troubleshooting Guide

## 403 Forbidden Errors for License and Security Endpoints

### Issue
When accessing the VBR dashboard, you may see 403 Forbidden errors in the console for these endpoints:
- `GET /api/veeam/security/best-practices 403`
- `GET /api/veeam/license 403`

### Root Cause
These endpoints require specific permissions that the authenticated user may not have:

#### License Endpoint (`/api/v1/license`)
- **Required Claim**: `GetInstalledLicense`
- **Required Role**: Veeam Backup Administrator
- **Swagger Documentation**: Available to Veeam Backup Administrator role

#### Security Best Practices Endpoint (`/api/v1/securityAnalyzer/bestPractices`)
- **Required Claim**: `GetBestPracticesComplianceResult`
- **Required Roles**: Veeam Backup Administrator OR Veeam Security Administrator
- **Swagger Documentation**: Available to Veeam Backup Administrator or Veeam Security Administrator roles

### Solution

The application has been updated to gracefully handle these permission errors:

1. **Enhanced Error Logging**: API routes now log detailed permission error messages
2. **User-Friendly Warnings**: Client-side code displays warning messages instead of errors
3. **Graceful Degradation**: Dashboard continues to function with other available data

### How to Resolve

To access these features, you need to grant the appropriate permissions to the user:

#### Option 1: Grant Veeam Backup Administrator Role
This provides full access to both endpoints:
1. Open Veeam Backup & Replication Console
2. Navigate to **Main Menu** → **Users and Roles**
3. Select the user (`Hackathon` in this case)
4. Assign the **Veeam Backup Administrator** role

#### Option 2: Grant Veeam Security Administrator Role
This provides access to security features only:
1. Open Veeam Backup & Replication Console
2. Navigate to **Main Menu** → **Users and Roles**
3. Select the user
4. Assign the **Veeam Security Administrator** role

#### Option 3: Use a Different User
Configure the application to use credentials with appropriate permissions:
```bash
# Update .env.local
VEEAM_USERNAME=<user-with-admin-role>
VEEAM_PASSWORD=<password>
```

### Verification

After granting permissions, verify access using curl:

```bash
# Get authentication token
TOKEN=$(curl -k -s -X POST "https://hu-vbr-a-20.lab.intern:9419/api/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "x-api-version: 1.3-rev1" \
  -d "grant_type=password&username=<username>&password=<password>" | jq -r '.access_token')

# Test license endpoint
curl -k -X GET "https://hu-vbr-a-20.lab.intern:9419/api/v1/license" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-api-version: 1.3-rev1"

# Test security best practices endpoint
curl -k -X GET "https://hu-vbr-a-20.lab.intern:9419/api/v1/securityAnalyzer/bestPractices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-api-version: 1.3-rev1"
```

Expected response: HTTP 200 with JSON data (not HTTP 403)

### Console Output

The application now shows clear warnings in the console:

```
⚠️ License info unavailable: User lacks GetInstalledLicense permission (Veeam Backup Administrator role required)
⚠️ Security best practices unavailable: User lacks GetBestPracticesComplianceResult permission (Veeam Backup/Security Administrator role required)
```

These warnings are **informational** and do not prevent the dashboard from functioning with other available data (jobs, sessions, repositories, etc.).

## Additional Resources

- [Veeam API Documentation](https://helpcenter.veeam.com/docs/backup/vbr_rest/reference/vbr-rest-v1-rev3.html)
- [Veeam Backup & Replication Roles](https://helpcenter.veeam.com/docs/backup/vsphere/rbac_roles.html)
