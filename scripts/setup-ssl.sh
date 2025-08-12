#!/bin/bash

# SSL Certificate Setup Script for VR Translation Service

set -e

# Configuration
SSL_DIR="nginx/ssl"
DOMAIN="localhost"
COUNTRY="US"
STATE="State"
CITY="City"
ORGANIZATION="VR Translation Service"
EMAIL="admin@localhost"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

create_ssl_directory() {
    log_info "Creating SSL directory..."
    mkdir -p "$SSL_DIR"
}

generate_self_signed_certificate() {
    log_info "Generating self-signed SSL certificate..."
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/server.key" \
        -out "$SSL_DIR/server.crt" \
        -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORGANIZATION/CN=$DOMAIN/emailAddress=$EMAIL"
    
    # Set proper permissions
    chmod 600 "$SSL_DIR/server.key"
    chmod 644 "$SSL_DIR/server.crt"
    
    log_info "Self-signed certificate generated successfully"
}

generate_dhparam() {
    log_info "Generating Diffie-Hellman parameters (this may take a while)..."
    openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048
    chmod 644 "$SSL_DIR/dhparam.pem"
    log_info "Diffie-Hellman parameters generated"
}

setup_letsencrypt() {
    local domain=$1
    local email=$2
    
    if [ -z "$domain" ] || [ -z "$email" ]; then
        log_warn "Domain and email are required for Let's Encrypt"
        log_warn "Usage: $0 letsencrypt <domain> <email>"
        exit 1
    fi
    
    log_info "Setting up Let's Encrypt certificate for $domain..."
    
    # Install certbot if not available
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y certbot
        elif command -v yum &> /dev/null; then
            sudo yum install -y certbot
        else
            log_warn "Please install certbot manually"
            exit 1
        fi
    fi
    
    # Generate certificate
    sudo certbot certonly --standalone \
        --email "$email" \
        --agree-tos \
        --no-eff-email \
        -d "$domain"
    
    # Copy certificates to nginx directory
    sudo cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$SSL_DIR/server.crt"
    sudo cp "/etc/letsencrypt/live/$domain/privkey.pem" "$SSL_DIR/server.key"
    
    # Set proper permissions
    sudo chown $(whoami):$(whoami) "$SSL_DIR/server.crt" "$SSL_DIR/server.key"
    chmod 644 "$SSL_DIR/server.crt"
    chmod 600 "$SSL_DIR/server.key"
    
    log_info "Let's Encrypt certificate installed successfully"
}

setup_cert_renewal() {
    log_info "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > "$SSL_DIR/renew-cert.sh" << 'EOF'
#!/bin/bash
certbot renew --quiet
if [ $? -eq 0 ]; then
    # Copy renewed certificates
    cp /etc/letsencrypt/live/*/fullchain.pem /path/to/nginx/ssl/server.crt
    cp /etc/letsencrypt/live/*/privkey.pem /path/to/nginx/ssl/server.key
    
    # Reload nginx
    docker-compose exec nginx nginx -s reload
fi
EOF
    
    chmod +x "$SSL_DIR/renew-cert.sh"
    
    # Add to crontab (runs twice daily)
    (crontab -l 2>/dev/null; echo "0 12,0 * * * $PWD/$SSL_DIR/renew-cert.sh") | crontab -
    
    log_info "Automatic renewal setup completed"
}

show_certificate_info() {
    if [ -f "$SSL_DIR/server.crt" ]; then
        log_info "Certificate information:"
        openssl x509 -in "$SSL_DIR/server.crt" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After :)"
    else
        log_warn "No certificate found at $SSL_DIR/server.crt"
    fi
}

show_help() {
    echo "SSL Certificate Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  self-signed         Generate self-signed certificate"
    echo "  letsencrypt <domain> <email>  Setup Let's Encrypt certificate"
    echo "  dhparam            Generate Diffie-Hellman parameters"
    echo "  renew              Setup automatic certificate renewal"
    echo "  info               Show certificate information"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 self-signed"
    echo "  $0 letsencrypt example.com admin@example.com"
    echo "  $0 dhparam"
}

main() {
    create_ssl_directory
    
    case "$1" in
        "self-signed")
            generate_self_signed_certificate
            show_certificate_info
            ;;
        "letsencrypt")
            setup_letsencrypt "$2" "$3"
            setup_cert_renewal
            show_certificate_info
            ;;
        "dhparam")
            generate_dhparam
            ;;
        "renew")
            setup_cert_renewal
            ;;
        "info")
            show_certificate_info
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            log_info "No command specified, generating self-signed certificate..."
            generate_self_signed_certificate
            show_certificate_info
            ;;
        *)
            log_warn "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"