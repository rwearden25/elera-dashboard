variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "elera-dashboard-rg"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "prefix" {
  description = "Prefix for resource names"
  type        = string
  default     = "eleradash"
}

variable "storage_account_name" {
  description = "Storage account name (must be globally unique)"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Project   = "ELERA Dashboard"
    ManagedBy = "Terraform"
  }
}
