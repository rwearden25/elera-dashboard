# ELERA Platform Dashboard
## Deployment Guide

A real-time dashboard showing all ELERA deployments across AKS clusters with clickable Admin UI links.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Timer Trigger  │────▶│  Azure Function  │────▶│  Blob Storage   │
│  (every 15 min) │     │  (PowerShell)    │     │  (JSON data)    │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌──────────────────┐              │
                        │  Static Web App  │◀─────────────┘
                        │  (React)         │
                        └──────────────────┘
                                 │
                    https://eleradash-web.azurestaticapps.net
```

---

## Prerequisites

- Azure CLI installed and logged in
- Terraform installed
- Node.js 18+ (for frontend build)
- Access to target Azure subscription

---

## Deployment Steps

### 1. Deploy Infrastructure (Terraform)

```powershell
cd terraform

# Initialize
terraform init

# Review plan
terraform plan

# Deploy
terraform apply
```

**Outputs to note:**
- `storage_account_name` - Update in frontend App.jsx
- `storage_blob_url` - Data endpoint
- `function_app_name` - For function deployment
- `static_web_app_api_key` - For frontend deployment

### 2. Deploy Azure Function

```powershell
cd function

# Install Azure Functions Core Tools if needed
# npm install -g azure-functions-core-tools@4

# Deploy function
func azure functionapp publish eleradash-func --powershell
```

Or deploy via Azure Portal:
1. Go to Function App → Deployment Center
2. Connect to GitHub/Azure DevOps
3. Deploy the `function/` folder

### 3. Update Frontend Configuration

Edit `frontend/src/App.jsx` line 4:

```javascript
const DATA_URL = 'https://YOUR_STORAGE_ACCOUNT.blob.core.windows.net/dashboard-data/elera-clusters.json';
```

Replace `YOUR_STORAGE_ACCOUNT` with the actual storage account name from Terraform output.

### 4. Build Frontend

```powershell
cd frontend

# Install dependencies
npm install

# Build
npm run build
```

### 5. Deploy Static Web App

**Option A: Azure CLI**
```powershell
# Get API key from Terraform output
$apiKey = terraform output -raw static_web_app_api_key

# Deploy
cd frontend
npx @azure/static-web-apps-cli deploy ./dist --api-key $apiKey
```

**Option B: GitHub Actions**

Create `.github/workflows/azure-static-web-apps.yml`:

```yaml
name: Deploy Dashboard

on:
  push:
    branches: [main]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install and Build
        run: |
          cd frontend
          npm install
          npm run build
      
      - name: Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "upload"
          app_location: "frontend"
          output_location: "dist"
```

### 6. Configure Custom Domain (Optional)

```powershell
# Add custom domain
az staticwebapp hostname set \
    --name eleradash-web \
    --hostname elera-dashboard.toshibaelerademo.com

# Add CNAME record in DNS:
# elera-dashboard.toshibaelerademo.com -> eleradash-web.azurestaticapps.net
```

---

## Manual Data Refresh

To trigger the function manually:

```powershell
# Via Azure CLI
az functionapp function invoke \
    --name eleradash-func \
    --function-name Get-EleraData \
    --resource-group elera-dashboard-rg
```

Or use the Azure Portal:
1. Go to Function App → Functions → Get-EleraData
2. Click "Test/Run"

---

## Troubleshooting

### Function App Issues

**Error: Cannot get AKS credentials**
- Verify the Function App's Managed Identity has:
  - `Azure Kubernetes Service Cluster User Role`
  - `Azure Kubernetes Service Cluster Admin Role`

**Error: Cannot write to storage**
- Verify the Function App's Managed Identity has:
  - `Storage Blob Data Contributor` on the storage account

### Frontend Issues

**CORS errors**
- Verify storage account has CORS configured for `*` or your domain
- Check the blob container access level is "Blob" (public read)

**Data not loading**
- Check browser console for errors
- Verify the DATA_URL in App.jsx is correct
- Manually access the JSON URL in browser to verify

---

## Costs

| Resource | Estimated Cost |
|----------|----------------|
| Storage Account (LRS) | ~$1/month |
| Function App (Consumption) | ~$0-5/month |
| Static Web App (Free tier) | $0 |
| **Total** | **~$1-6/month** |

---

## File Structure

```
elera-dashboard/
├── function/
│   ├── Get-EleraData/
│   │   ├── function.json      # Timer trigger config
│   │   └── run.ps1            # Data collection script
│   ├── host.json              # Function app config
│   └── requirements.psd1      # PowerShell modules
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React component
│   │   ├── main.jsx           # Entry point
│   │   └── index.css          # Tailwind CSS
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
└── terraform/
    ├── main.tf                # Infrastructure
    ├── variables.tf           # Variable definitions
    └── terraform.tfvars       # Variable values
```

---

## Features

- ✅ **Quick Access URLs** - Clickable Admin UI links at top
- ✅ **Version Color Coding** - Green (2504), Yellow (2503), Blue (2502)
- ✅ **Cluster Status** - Running/Stopped indicators
- ✅ **Pod Health** - Running/Pending/Failed counts
- ✅ **Search/Filter** - Filter by cluster, namespace, or version
- ✅ **Auto Refresh** - Updates every 5 minutes
- ✅ **Multiple Links** - Admin UI, WebPOS, Configurations
- ✅ **CSV Export** - Via JSON data

---

## Security Notes

1. **Blob Storage** - Public read access (data is not sensitive)
2. **Function App** - Uses Managed Identity (no stored credentials)
3. **Static Web App** - HTTPS only
4. **No Authentication** - Add Azure AD if needed

To add authentication:
```powershell
# Enable Azure AD auth on Static Web App
az staticwebapp identity assign --name eleradash-web --resource-group elera-dashboard-rg
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-05 | Initial release |
