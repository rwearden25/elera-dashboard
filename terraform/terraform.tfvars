# ============================================
# ELERA Dashboard - Terraform Variables
# ============================================

subscription_id      = "10f29cdd-ad67-473b-99c3-fd959e2d462b"
resource_group_name  = "elera-dashboard-rg"
location             = "eastus"
prefix               = "eleradash"
storage_account_name = "eleradashboardstorage"  # Must be globally unique, lowercase, no hyphens

tags = {
  Project     = "ELERA Dashboard"
  Environment = "Production"
  ManagedBy   = "Terraform"
}
