#!/bin/bash
# Veritabanı yedekleme scripti

# Ortam değişkenleri veya varsayılan değerler
DB_CONTAINER_NAME="biletapp_db"
DB_USER="bilet_user"
DB_NAME="bilet_db"
BACKUP_DIR="/var/backups/biletapp"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/biletapp_db_$DATE.sql.gz"

# Yedekleme dizininin mevcut olduğundan emin ol
mkdir -p "$BACKUP_DIR"

echo "Yedekleme başlatılıyor: $BACKUP_FILE"

# PostgreSQL yedeğini al ve gzip ile sıkıştır (Docker kullanılarak)
docker exec $DB_CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Yedekleme başarılı!"
  
  # 30 günden eski yedekleri temizle
  echo "🧹 Eski yedekler temizleniyor..."
  find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -exec rm {} \;
  echo "✅ Temizlik tamamlandı."
else
  echo "❌ Yedekleme başarısız oldu!"
  # Gerekirse buraya e-posta veya Slack/Telegram bildirim komutu eklenebilir.
  exit 1
fi
