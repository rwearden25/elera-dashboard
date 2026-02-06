# ============================================
# ELERA Dashboard Infrastructure
# ============================================
# Creates:
# - Resource Group
# - Storage Account (for JSON data)
# - Function App (data collector)
# - Static Web App (dashboard UI)
# ============================================

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# ============================================
# Resource Group
# ============================================

resource "azurerm_resource_group" "dashboard" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

# ============================================
# Storage Account (for dashboard data)
# ============================================

resource "azurerm_storage_account" "dashboard" {
  name                            = var.storage_account_name
  resource_group_name             = azurerm_resource_group.dashboard.name
  location                        = azurerm_resource_group.dashboard.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  allow_nested_items_to_be_public = false  # Required by policy
  
  tags = var.tags
}

resource "azurerm_storage_container" "data" {
  name                  = "dashboard-data"
  storage_account_name  = azurerm_storage_account.dashboard.name
  container_access_type = "private"  # Changed from blob to private
}

# ============================================
# Function App (data collector)
# ============================================

resource "azurerm_service_plan" "functions" {
  name                = "${var.prefix}-func-plan"
  resource_group_name = azurerm_resource_group.dashboard.name
  location            = azurerm_resource_group.dashboard.location
  os_type             = "Windows"
  sku_name            = "EP1"  # Premium Elastic
  tags                = var.tags
}

resource "azurerm_windows_function_app" "collector" {
  name                = "${var.prefix}-func"
  resource_group_name = azurerm_resource_group.dashboard.name
  location            = azurerm_resource_group.dashboard.location
  
  storage_account_name       = azurerm_storage_account.dashboard.name
  storage_account_access_key = azurerm_storage_account.dashboard.primary_access_key
  service_plan_id            = azurerm_service_plan.functions.id
  
  site_config {
    application_stack {
      powershell_core_version = "7.2"
    }
  }
  
  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"     = "powershell"
    "AZURE_SUBSCRIPTION_ID"        = var.subscription_id
    "STORAGE_ACCOUNT_NAME"         = azurerm_storage_account.dashboard.name
    "STORAGE_CONTAINER_NAME"       = "dashboard-data"
    "AzureWebJobsDisableHomepage"  = "true"
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  tags = var.tags
}

# ============================================
# RBAC for Function App
# ============================================

# Allow Function App to read AKS clusters
resource "azurerm_role_assignment" "aks_reader" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Azure Kubernetes Service Cluster User Role"
  principal_id         = azurerm_windows_function_app.collector.identity[0].principal_id
}

resource "azurerm_role_assignment" "aks_admin" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Azure Kubernetes Service Cluster Admin Role"
  principal_id         = azurerm_windows_function_app.collector.identity[0].principal_id
}

# Allow Function App to write to storage
resource "azurerm_role_assignment" "storage_contributor" {
  scope                = azurerm_storage_account.dashboard.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_windows_function_app.collector.identity[0].principal_id
}

# ============================================
# Static Web App (dashboard UI)
# ============================================

resource "azurerm_static_web_app" "dashboard" {
  name                = "${var.prefix}-web"
  resource_group_name = azurerm_resource_group.dashboard.name
  location            = "eastus2"  # Static Web Apps limited regions
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = var.tags
}

# ============================================
# Outputs
# ============================================

output "storage_account_name" {
  value = azurerm_storage_account.dashboard.name
}

output "data_api_url" {
  description = "URL for frontend to fetch data (use this in App.jsx)"
  value       = "https://${azurerm_windows_function_app.collector.default_hostname}/api/Get-DashboardData"
}

output "function_app_name" {
  value = azurerm_windows_function_app.collector.name
}

output "function_app_url" {
  value = "https://${azurerm_windows_function_app.collector.default_hostname}"
}

output "static_web_app_url" {
  value = azurerm_static_web_app.dashboard.default_host_name
}

output "static_web_app_api_key" {
  value     = azurerm_static_web_app.dashboard.api_key
  sensitive = true
}
