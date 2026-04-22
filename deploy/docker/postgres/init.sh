# PostgreSQL Init Scripts
# These scripts run when the container starts for the first time

# Create databases for Ory services
CREATE DATABASE kratos;
CREATE DATABASE keto;
CREATE DATABASE hydra_oauth2;