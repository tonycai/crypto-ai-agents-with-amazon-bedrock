#!/bin/bash
set -e

# Color variables
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping and removing Docker containers...${NC}"
docker-compose down

echo -e "${GREEN}Cleaning up Docker volumes...${NC}"
echo -e "${YELLOW}NOTE: This will only remove volumes that are not used by any containers.${NC}"
docker volume prune -f

echo -e "${GREEN}Cleanup complete!${NC}" 