FROM ghcr.io/snoups/remnashop:latest

# Overlay admin API files on top of the base image
COPY admin_src/src/ /opt/remnashop/src/
